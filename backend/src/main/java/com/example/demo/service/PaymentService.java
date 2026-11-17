
package com.example.demo.service;

import com.example.demo.entity.Booking;
import com.example.demo.entity.JourneySeatReservation;
import com.example.demo.entity.Payment;
import com.example.demo.entity.TrainStop;

import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.PaymentRepository;
import com.example.demo.repository.TrainStopRepository;
import com.example.demo.repository.PassengerRepository;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final PassengerRepository passengerRepository;
    private final JourneySeatReservationService journeySeatReservationService;
    private final TrainStopRepository trainStopRepository;
    private final BookingEmailService bookingEmailService;
    private final TransactionTemplate transactionTemplate;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    private record PaymentSnapshot(
            Long paymentRecordId,
            Long bookingId,
            Double amount,
            String paymentStatus,
            String bookingStatus,
            String recordedPaymentId
    ) {
    }

    public PaymentService(
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            PassengerRepository passengerRepository,
            JourneySeatReservationService journeySeatReservationService,
            TrainStopRepository trainStopRepository,
            BookingEmailService bookingEmailService,
            PlatformTransactionManager transactionManager) {

        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.passengerRepository = passengerRepository;
        this.journeySeatReservationService = journeySeatReservationService;
        this.trainStopRepository = trainStopRepository;
        this.bookingEmailService = bookingEmailService;

        this.transactionTemplate =
                new TransactionTemplate(transactionManager);
    }

    // ==================================================
    // CREATE / RECOVER RAZORPAY ORDER
    // ==================================================

    @Transactional
    public Map<String, Object> createPayment(
            Long bookingId,
            String paymentMethod) {

        validateRazorpayConfiguration();

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        System.out.println("\n========== CREATE PAYMENT REQUEST ==========");
        System.out.println("Booking ID: " + bookingId);
        System.out.println("Payment Method: " + paymentMethod);

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Booking not found"));

        String bookingStatus = booking.getBookingStatus();

        System.out.println("Booking Status: " + bookingStatus);

        if ("CANCELLED".equalsIgnoreCase(bookingStatus)) {
            throw new IllegalStateException(
                    "Cannot pay for a cancelled booking");
        }

        if ("CONFIRMED".equalsIgnoreCase(bookingStatus)) {
            throw new IllegalStateException(
                    "Booking is already confirmed");
        }

        if (!"PENDING_PAYMENT".equalsIgnoreCase(bookingStatus)) {
            throw new IllegalStateException(
                    "Booking is not waiting for payment");
        }

        if (!"RAZORPAY".equalsIgnoreCase(paymentMethod)) {
            throw new IllegalArgumentException(
                    "Only Razorpay payments are supported");
        }
     // ==========================================
     // VERIFY PASSENGERS BEFORE RAZORPAY PAYMENT
     // ==========================================

     Integer expectedPassengers = booking.getTotalPassengers();

     if (expectedPassengers == null || expectedPassengers <= 0) {
         throw new IllegalStateException(
                 "Invalid passenger count for this booking");
     }

     List<com.example.demo.entity.Passenger> savedPassengers =
             passengerRepository.findByBooking_Id(bookingId);

     if (savedPassengers == null
             || savedPassengers.size() != expectedPassengers) {

         throw new IllegalStateException(
                 "Passenger details are incomplete. Expected "
                         + expectedPassengers
                         + " passenger(s), but found "
                         + (savedPassengers == null ? 0 : savedPassengers.size())
                         + ". Please save all passenger details before payment."
         );
     }

     System.out.println("Passenger validation successful.");
     System.out.println("Expected passengers: " + expectedPassengers);
     System.out.println("Saved passengers: " + savedPassengers.size());

        Double amount = booking.getTotalAmount();

        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException(
                    "Invalid booking amount");
        }

        Payment existingPayment = paymentRepository
                .findByBooking(booking)
                .orElse(null);

        if (existingPayment != null) {
            System.out.println(
                    "Existing Payment Record ID: " + existingPayment.getId());
            System.out.println(
                    "Existing Order ID: " + existingPayment.getOrderId());
            System.out.println(
                    "Existing Payment Status: " + existingPayment.getStatus());
        } else {
            System.out.println("No existing payment record found.");
        }

        if (existingPayment != null
                && "SUCCESS".equalsIgnoreCase(existingPayment.getStatus())) {

            throw new IllegalStateException(
                    "Payment has already been completed");
        }

        if (existingPayment != null
                && !"PENDING".equalsIgnoreCase(existingPayment.getStatus())) {

            throw new IllegalStateException(
                    "Payment is not in pending status. "
                            + "Manual reconciliation is required.");
        }

        try {

            RazorpayClient client =
                    new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            String receipt = "booking_" + bookingId;

            Order order = findOrderByReceipt(
                    client,
                    receipt,
                    amount
            );

            if (order == null) {

                System.out.println(
                        "No reusable order found. Creating a new Razorpay order.");

                JSONObject orderRequest = new JSONObject();

                orderRequest.put(
                        "amount",
                        Math.round(amount * 100)
                );

                orderRequest.put("currency", "INR");
                orderRequest.put("receipt", receipt);

                order = client.orders.create(orderRequest);

                System.out.println(
                        "New Razorpay order created: "
                                + safeString(order.get("id")));
            } else {
                System.out.println(
                        "Existing Razorpay order recovered: "
                                + safeString(order.get("id")));
            }

            return savePendingPayment(
                    booking,
                    existingPayment,
                    order,
                    receipt,
                    amount
            );

        } catch (Exception ex) {

            System.err.println(
                    "Payment creation/recovery failed for booking "
                            + bookingId + ": " + ex.getMessage());

            throw new RuntimeException(
                    "Unable to create or recover Razorpay order: "
                            + ex.getMessage(),
                    ex
            );
        }
    }

    // ==================================================
    // FIND AND SAFELY SELECT EXISTING ORDERS
    // ==================================================

    private Order findOrderByReceipt(
            RazorpayClient client,
            String receipt,
            double expectedAmountRupees) throws Exception {

        List<Order> fetchedOrders = new ArrayList<>();

        int skip = 0;
        int pageSize = 100;

        while (true) {

            JSONObject params = new JSONObject();

            params.put("receipt", receipt);
            params.put("count", String.valueOf(pageSize));
            params.put("skip", String.valueOf(skip));

            List<Order> page = client.orders.fetchAll(params);

            if (page == null || page.isEmpty()) {
                break;
            }

            fetchedOrders.addAll(page);

            if (page.size() < pageSize) {
                break;
            }

            skip += page.size();
        }

        List<Order> matchingOrders = new ArrayList<>();

        for (Order order : fetchedOrders) {

            String actualReceipt = safeString(order.get("receipt"));

            if (receipt.equals(actualReceipt)) {
                matchingOrders.add(order);
            }
        }

        if (matchingOrders.isEmpty()) {
            System.out.println(
                    "No existing Razorpay order found for " + receipt);
            return null;
        }

        System.out.println(
                "\n========== RAZORPAY ORDER RECOVERY ==========");
        System.out.println(
                "Receipt: " + receipt);
        System.out.println(
                "Matching orders found: " + matchingOrders.size());

        List<Order> reusableOrders = new ArrayList<>();
        List<String> blockedOrders = new ArrayList<>();

        long expectedAmountPaise =
                Math.round(expectedAmountRupees * 100);

        for (Order order : matchingOrders) {

            String orderId = safeString(order.get("id"));
            String orderStatus = safeString(order.get("status"));
            String currency = safeString(order.get("currency"));

            long orderAmount = safeLong(order.get("amount"), -1);
            long amountPaid = safeLong(order.get("amount_paid"), 0);
            long createdAt = safeLong(order.get("created_at"), 0);

            System.out.println("--------------------------------------------");
            System.out.println("Order ID: " + orderId);
            System.out.println("Status: " + orderStatus);
            System.out.println("Amount (paise): " + orderAmount);
            System.out.println("Amount paid (paise): " + amountPaid);
            System.out.println("Currency: " + currency);
            System.out.println("Created at: " + createdAt);

            if (isBlank(orderId)) {
                blockedOrders.add("An order has no valid order ID");
                continue;
            }

            if (orderAmount != expectedAmountPaise) {
                blockedOrders.add(
                        orderId + " has a different amount");
                continue;
            }

            if (!"INR".equalsIgnoreCase(currency)) {
                blockedOrders.add(
                        orderId + " has a different currency");
                continue;
            }

            List<com.razorpay.Payment> orderPayments =
                    client.orders.fetchPayments(orderId);

            boolean hasNonFailedPayment = false;

            if (orderPayments != null) {

                System.out.println(
                        "Payment records: " + orderPayments.size());

                for (com.razorpay.Payment payment : orderPayments) {

                    String paymentId = safeString(payment.get("id"));
                    String paymentStatus = safeString(payment.get("status"));

                    System.out.println("Payment ID: " + paymentId);
                    System.out.println("Payment status: " + paymentStatus);

                    if (!"failed".equalsIgnoreCase(paymentStatus)) {

                        hasNonFailedPayment = true;

                        blockedOrders.add(
                                orderId + " contains payment "
                                        + paymentId
                                        + " with status "
                                        + paymentStatus
                        );
                    }
                }
            }

            if (amountPaid > 0
                    || "paid".equalsIgnoreCase(orderStatus)) {

                blockedOrders.add(
                        orderId
                                + " is already paid or has an amount paid"
                );

                continue;
            }

            if (hasNonFailedPayment) {
                continue;
            }

            if ("created".equalsIgnoreCase(orderStatus)
                    || "attempted".equalsIgnoreCase(orderStatus)) {

                reusableOrders.add(order);

            } else {

                blockedOrders.add(
                        orderId + " has unsupported order status: "
                                + orderStatus);
            }
        }

        System.out.println("--------------------------------------------");

        if (!blockedOrders.isEmpty()) {

            System.err.println(
                    "MANUAL PAYMENT RECONCILIATION REQUIRED:");

            for (String reason : blockedOrders) {
                System.err.println(reason);
            }

            throw new IllegalStateException(
                    "At least one matching Razorpay order has a "
                            + "payment or status requiring manual "
                            + "reconciliation. Check Eclipse console. "
                            + "No new order was created."
            );
        }

        if (reusableOrders.isEmpty()) {

            throw new IllegalStateException(
                    "No safe unpaid Razorpay order is available. "
                            + "Manual reconciliation is required.");
        }

        Order selectedOrder = reusableOrders.get(0);

        long latestCreatedAt =
                safeLong(selectedOrder.get("created_at"), 0);

        for (Order candidate : reusableOrders) {

            long candidateCreatedAt =
                    safeLong(candidate.get("created_at"), 0);

            if (candidateCreatedAt > latestCreatedAt) {

                selectedOrder = candidate;
                latestCreatedAt = candidateCreatedAt;
            }
        }

        String selectedOrderId =
                safeString(selectedOrder.get("id"));

        System.out.println(
                "Selected reusable order: " + selectedOrderId);

        System.out.println(
                "============================================\n");

        return selectedOrder;
    }

    // ==================================================
    // VALIDATE AND SAVE PAYMENT
    // ==================================================

    private Map<String, Object> savePendingPayment(
            Booking booking,
            Payment existingPayment,
            Order order,
            String expectedReceipt,
            double expectedAmountRupees) {

        String orderId = safeString(order.get("id"));

        if (isBlank(orderId)) {
            throw new IllegalStateException(
                    "Invalid Razorpay order ID");
        }

        String actualReceipt = safeString(order.get("receipt"));

        if (!expectedReceipt.equals(actualReceipt)) {
            throw new IllegalStateException(
                    "Razorpay receipt does not match booking");
        }

        long actualAmountPaise =
                safeLong(order.get("amount"), -1);

        long expectedAmountPaise =
                Math.round(expectedAmountRupees * 100);

        if (actualAmountPaise != expectedAmountPaise) {
            throw new IllegalStateException(
                    "Razorpay order amount does not match booking");
        }

        String currency = safeString(order.get("currency"));

        if (!"INR".equalsIgnoreCase(currency)) {
            throw new IllegalStateException(
                    "Razorpay order currency must be INR");
        }

        String orderStatus = safeString(order.get("status"));

        if (!"created".equalsIgnoreCase(orderStatus)
                && !"attempted".equalsIgnoreCase(orderStatus)) {

            throw new IllegalStateException(
                    "Razorpay order is not reusable. Status: "
                            + orderStatus);
        }

        Payment payment = existingPayment != null
                ? existingPayment
                : new Payment();

        payment.setBooking(booking);
        payment.setOrderId(orderId);

        if (isBlank(payment.getPaymentId())
                || payment.getPaymentId().startsWith("PENDING_")) {

            payment.setPaymentId(
                    "PENDING_" + java.util.UUID.randomUUID());
        }

        payment.setAmount(expectedAmountRupees);
        payment.setPaymentMethod("RAZORPAY");
        payment.setStatus("PENDING");
        payment.setPaymentDate(null);

        paymentRepository.saveAndFlush(payment);

        // DIAGNOSTIC LOGGING
        System.out.println(
                "\n========== PAYMENT ORDER SAVED ==========");
        System.out.println("Booking ID: " + booking.getId());
        System.out.println("Payment Record ID: " + payment.getId());
        System.out.println("Saved Razorpay Order ID: " + payment.getOrderId());
        System.out.println("Payment Status: " + payment.getStatus());
        System.out.println("Amount: " + payment.getAmount());
        System.out.println("==========================================\n");

        return createOrderResponse(
                orderId,
                booking.getId(),
                expectedAmountRupees
        );
    }

    // ==================================================
    // VERIFY RAZORPAY PAYMENT
    // ==================================================

    public Map<String, Object> verifyPayment(
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature) {

        validateRazorpayConfiguration();

        // DIAGNOSTIC LOGGING
        System.out.println(
                "\n========== PAYMENT VERIFICATION RECEIVED ==========");
        System.out.println(
                "Received Razorpay Order ID: " + razorpayOrderId);
        System.out.println(
                "Received Razorpay Payment ID: " + razorpayPaymentId);
        System.out.println(
                "====================================================\n");

        if (isBlank(razorpayOrderId)
                || isBlank(razorpayPaymentId)
                || isBlank(razorpaySignature)) {

            throw new IllegalArgumentException(
                    "Order ID, payment ID and signature are required");
        }

        PaymentSnapshot snapshot =
                transactionTemplate.execute(status -> {

                    Payment payment = paymentRepository
                            .findByOrderId(razorpayOrderId)
                            .orElseThrow(() -> {

                                System.err.println(
                                        "PAYMENT ORDER NOT FOUND IN DATABASE");
                                System.err.println(
                                        "Received Order ID: " + razorpayOrderId);

                                return new IllegalArgumentException(
                                        "Payment order not found");
                            });

                    Booking booking = payment.getBooking();

                    if (booking == null) {
                        throw new IllegalStateException(
                                "Associated booking not found");
                    }

                    if (payment.getAmount() == null
                            || booking.getTotalAmount() == null
                            || Math.abs(
                                    payment.getAmount()
                                            - booking.getTotalAmount()) > 0.01) {

                        throw new IllegalStateException(
                                "Payment amount does not match booking amount");
                    }

                    return new PaymentSnapshot(
                            payment.getId(),
                            booking.getId(),
                            payment.getAmount(),
                            payment.getStatus(),
                            booking.getBookingStatus(),
                            payment.getPaymentId()
                    );
                });

        if (snapshot == null) {
            throw new IllegalStateException(
                    "Unable to retrieve payment information");
        }

        String expectedSignature = generateSignature(
                razorpayOrderId + "|" + razorpayPaymentId,
                razorpayKeySecret
        );

        boolean signatureValid = MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                razorpaySignature.getBytes(StandardCharsets.UTF_8)
        );

        if (!signatureValid) {
            throw new IllegalArgumentException(
                    "Invalid Razorpay payment signature");
        }

        verifyCapturedRazorpayPayment(
                razorpayOrderId,
                razorpayPaymentId,
                snapshot.amount()
        );

        boolean alreadySuccessful =
                "SUCCESS".equalsIgnoreCase(snapshot.paymentStatus());

        if (alreadySuccessful) {

            if (!razorpayPaymentId.equals(snapshot.recordedPaymentId())) {
                throw new IllegalStateException(
                        "Payment was completed with a different payment ID");
            }

        } else if (!"PENDING".equalsIgnoreCase(snapshot.paymentStatus())) {

            throw new IllegalStateException(
                    "Payment is not in pending status");
        }

        if ("CANCELLED".equalsIgnoreCase(snapshot.bookingStatus())) {
            throw new IllegalStateException(
                    "Booking is cancelled. Payment reconciliation is required.");
        }

        transactionTemplate.execute(status -> {

            Payment payment = paymentRepository
                    .findById(snapshot.paymentRecordId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Payment record not found"));

            Booking booking = payment.getBooking();

            if ("CANCELLED".equalsIgnoreCase(
                    booking.getBookingStatus())) {

                throw new IllegalStateException(
                        "Booking was cancelled");
            }

            if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {

                if (!razorpayPaymentId.equals(payment.getPaymentId())) {
                    throw new IllegalStateException(
                            "Payment was completed with another payment ID");
                }

                return null;
            }

            if (!"PENDING".equalsIgnoreCase(payment.getStatus())) {
                throw new IllegalStateException(
                        "Payment is no longer pending");
            }

            payment.setPaymentId(razorpayPaymentId);
            payment.setStatus("SUCCESS");
            payment.setPaymentDate(LocalDateTime.now());

            booking.setBookingStatus("PAYMENT_RECEIVED");

            paymentRepository.save(payment);
            bookingRepository.save(booking);

            return null;
        });

        try {

            List<JourneySeatReservation> allocatedReservations =
                    transactionTemplate.execute(status ->
                            allocateSeatsForPaidBooking(
                                    snapshot.bookingId()
                            )
                    );

            if (allocatedReservations == null
                    || allocatedReservations.isEmpty()) {

                throw new IllegalStateException(
                        "No seats allocated");
            }

        } catch (RuntimeException allocationException) {

            // DIAGNOSTIC LOGGING
            System.err.println("\n========== SEAT ALLOCATION FAILED ==========");
            System.err.println("Booking ID: " + snapshot.bookingId());
            System.err.println("Payment Record ID: " + snapshot.paymentRecordId());
            System.err.println("Razorpay Payment ID: " + razorpayPaymentId);
            System.err.println("Allocation Error: " + allocationException.getMessage());
            System.err.println("Full exception details:");

            allocationException.printStackTrace();

            System.err.println("============================================\n");

            transactionTemplate.execute(status -> {

                Booking booking = bookingRepository
                        .findById(snapshot.bookingId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Booking not found"));

                if (!"CANCELLED".equalsIgnoreCase(
                        booking.getBookingStatus())) {

                    booking.setBookingStatus(
                            "PAYMENT_RECEIVED_ALLOCATION_FAILED"
                    );

                    bookingRepository.save(booking);
                }

                return null;
            });

            return allocationFailureResponse(
                    snapshot.bookingId(),
                    razorpayPaymentId,
                    allocationException.getMessage()
            );
        }

        return transactionTemplate.execute(status -> {

            Payment payment = paymentRepository
                    .findByOrderId(razorpayOrderId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Payment record not found"));

            return verificationResponse(
                    true,
                    "Payment verified and booking confirmed successfully",
                    payment
            );
        });
    }

    // ==================================================
    // VERIFY CAPTURED PAYMENT WITH RAZORPAY
    // ==================================================

    private void verifyCapturedRazorpayPayment(
            String orderId,
            String paymentId,
            double expectedAmountRupees) {

        try {

            RazorpayClient client =
                    new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            List<com.razorpay.Payment> payments =
                    client.orders.fetchPayments(orderId);

            if (payments == null || payments.isEmpty()) {
                throw new IllegalStateException(
                        "No payment found for this Razorpay order");
            }

            com.razorpay.Payment matchedPayment = null;

            for (com.razorpay.Payment payment : payments) {

                String actualPaymentId = safeString(payment.get("id"));

                if (paymentId.equals(actualPaymentId)) {
                    matchedPayment = payment;
                    break;
                }
            }

            if (matchedPayment == null) {
                throw new IllegalStateException(
                        "Payment ID does not belong to this order");
            }

            String status = safeString(matchedPayment.get("status"));

            if (!"captured".equalsIgnoreCase(status)) {
                throw new IllegalStateException(
                        "Razorpay payment is not captured. Status: "
                                + status);
            }

            String actualOrderId =
                    safeString(matchedPayment.get("order_id"));

            if (!orderId.equals(actualOrderId)) {
                throw new IllegalStateException(
                        "Razorpay payment order ID mismatch");
            }

            String currency = safeString(matchedPayment.get("currency"));

            if (!"INR".equalsIgnoreCase(currency)) {
                throw new IllegalStateException(
                        "Payment currency must be INR");
            }

            long capturedAmount =
                    safeLong(matchedPayment.get("amount"), -1);

            long expectedAmountPaise =
                    Math.round(expectedAmountRupees * 100);

            if (capturedAmount != expectedAmountPaise) {
                throw new IllegalStateException(
                        "Captured amount does not match booking amount");
            }

        } catch (IllegalStateException ex) {

            throw ex;

        } catch (Exception ex) {

            throw new IllegalStateException(
                    "Unable to verify captured Razorpay payment: "
                            + ex.getMessage(),
                    ex
            );
        }
    }

    // ==================================================
    // ALLOCATE SEATS AFTER PAYMENT SUCCESS
    // ==================================================

    private List<JourneySeatReservation> allocateSeatsForPaidBooking(
            Long bookingId) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Booking not found"));

        String status = booking.getBookingStatus();

        if ("CONFIRMED".equalsIgnoreCase(status)) {

            List<JourneySeatReservation> existing =
                    journeySeatReservationService
                            .getReservationsByBooking(bookingId);

            List<JourneySeatReservation> confirmed =
                    existing.stream()
                            .filter(reservation ->
                                    "CONFIRMED".equalsIgnoreCase(
                                            reservation.getReservationStatus()))
                            .toList();

            if (confirmed.isEmpty()) {
                throw new IllegalStateException(
                        "Booking is confirmed but no confirmed seats exist");
            }

            sendConfirmationEmailSafely(bookingId, confirmed);

            return confirmed;
        }

        if (!"PAYMENT_RECEIVED".equalsIgnoreCase(status)
                && !"PAYMENT_RECEIVED_ALLOCATION_FAILED"
                        .equalsIgnoreCase(status)) {

            throw new IllegalStateException(
                    "Booking is not ready for allocation. Status: "
                            + status);
        }

        Long trainId = booking.getTrain().getId();

        List<TrainStop> stops = trainStopRepository
                .findByTrain_IdOrderByStopOrderAsc(trainId);

        if (stops == null || stops.size() < 2) {
            throw new IllegalStateException(
                    "Train route must contain at least two stops");
        }

        Integer fromStopOrder = stops.get(0).getStopOrder();

        Integer toStopOrder = stops.get(stops.size() - 1).getStopOrder();

        if (fromStopOrder == null
                || toStopOrder == null
                || fromStopOrder >= toStopOrder) {

            throw new IllegalStateException(
                    "Train route has invalid stop orders");
        }

        booking.setBookingStatus("CONFIRMED");
        bookingRepository.save(booking);

        List<JourneySeatReservation> allocated =
                journeySeatReservationService.autoAllocateSeats(
                        bookingId,
                        fromStopOrder,
                        toStopOrder
                );

        if (allocated == null
                || allocated.size() != booking.getTotalPassengers()) {

            throw new IllegalStateException(
                    "Seat allocation count does not match passenger count");
        }

        sendConfirmationEmailSafely(bookingId, allocated);

        return allocated;
    }

    // ==================================================
    // CONFIRMATION EMAIL
    // ==================================================

    private void sendConfirmationEmailSafely(
            Long bookingId,
            List<JourneySeatReservation> reservations) {

        try {

            bookingEmailService.sendBookingConfirmation(
                    bookingId,
                    reservations
            );

        } catch (Exception ex) {

            System.err.println(
                    "Booking confirmation email failed for booking "
                            + bookingId + ": " + ex.getMessage()
            );
        }
    }

    // ==================================================
    // PAYMENT / ALLOCATION FAILURE RESPONSE
    // ==================================================

    private Map<String, Object> allocationFailureResponse(
            Long bookingId,
            String paymentId,
            String reason) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", true);
        response.put("paymentReceived", true);
        response.put("paymentId", paymentId);
        response.put("bookingId", bookingId);

        response.put(
                "bookingStatus",
                "PAYMENT_RECEIVED_ALLOCATION_FAILED"
        );

        response.put("bookingConfirmed", false);
        response.put("requiresManualResolution", true);

        response.put(
                "message",
                "Payment was verified successfully, but automatic "
                        + "seat allocation failed. Do not pay again. "
                        + "Contact support for seat allocation or refund."
        );

        response.put("allocationError", reason);

        return response;
    }

    // ==================================================
    // ORDER RESPONSE
    // ==================================================

    private Map<String, Object> createOrderResponse(
            String orderId,
            Long bookingId,
            double amountInRupees) {

        Map<String, Object> response = new HashMap<>();

        response.put("keyId", razorpayKeyId);
        response.put("orderId", orderId);

        response.put(
                "amount",
                Math.round(amountInRupees * 100)
        );

        response.put("currency", "INR");
        response.put("bookingId", bookingId);

        response.put(
                "message",
                "Razorpay order created or recovered successfully"
        );

        return response;
    }

    // ==================================================
    // VERIFICATION RESPONSE
    // ==================================================

    private Map<String, Object> verificationResponse(
            boolean success,
            String message,
            Payment payment) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", success);
        response.put("message", message);
        response.put("paymentId", payment.getPaymentId());
        response.put("orderId", payment.getOrderId());
        response.put("status", payment.getStatus());

        if (payment.getBooking() != null) {

            response.put("bookingId", payment.getBooking().getId());
            response.put("pnr", payment.getBooking().getPnr());

            response.put(
                    "bookingStatus",
                    payment.getBooking().getBookingStatus()
            );
        }

        return response;
    }

    // ==================================================
    // GENERATE RAZORPAY SIGNATURE
    // ==================================================

    private String generateSignature(
            String data,
            String secret) {

        try {

            Mac mac = Mac.getInstance("HmacSHA256");

            SecretKeySpec key = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );

            mac.init(key);

            byte[] hash = mac.doFinal(
                    data.getBytes(StandardCharsets.UTF_8)
            );

            StringBuilder result = new StringBuilder();

            for (byte value : hash) {
                result.append(
                        String.format("%02x", value & 0xff)
                );
            }

            return result.toString();

        } catch (Exception ex) {

            throw new RuntimeException(
                    "Unable to verify Razorpay signature",
                    ex
            );
        }
    }

    // ==================================================
    // SAFE SDK VALUE CONVERSION
    // ==================================================

    private String safeString(Object value) {

        return value == null ? null : value.toString();
    }

    private long safeLong(
            Object value,
            long defaultValue) {

        if (value instanceof Number) {
            return ((Number) value).longValue();
        }

        if (value != null) {

            try {
                return Long.parseLong(value.toString());

            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }

        return defaultValue;
    }

    // ==================================================
    // VALIDATE RAZORPAY CONFIGURATION
    // ==================================================

    private void validateRazorpayConfiguration() {

        if (isBlank(razorpayKeyId)
                || isBlank(razorpayKeySecret)) {

            throw new IllegalStateException(
                    "Razorpay keys are not configured correctly");
        }
    }

    // ==================================================
    // STRING VALIDATION
    // ==================================================

    private boolean isBlank(String value) {

        return value == null || value.isBlank();
    }
    // ==================================================
    // RETRY SEAT ALLOCATION FOR ALREADY PAID BOOKING
    // ==================================================

    public Map<String, Object> retrySeatAllocationForPaidBooking(
            Long bookingId) {

        if (bookingId == null) {
            throw new IllegalArgumentException("Booking ID is required");
        }

        // First verify the existing payment record.
        Payment payment = getPaymentByBookingId(bookingId);

        if (!"SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            throw new IllegalStateException(
                    "Payment is not SUCCESS. Seat allocation cannot be retried.");
        }

        if (isBlank(payment.getPaymentId())
                || payment.getPaymentId().startsWith("PENDING_")) {
            throw new IllegalStateException(
                    "Valid successful payment ID not found.");
        }

        Booking booking = payment.getBooking();

        if (booking == null) {
            throw new IllegalStateException(
                    "Booking not found for this payment.");
        }

        String bookingStatus = booking.getBookingStatus();

        if (!"PAYMENT_RECEIVED_ALLOCATION_FAILED"
                    .equalsIgnoreCase(bookingStatus)
                && !"PAYMENT_RECEIVED".equalsIgnoreCase(bookingStatus)
                && !"CONFIRMED".equalsIgnoreCase(bookingStatus)) {

            throw new IllegalStateException(
                    "Booking is not eligible for allocation recovery. Status: "
                            + bookingStatus);
        }

        System.out.println("\n========== PAID BOOKING RECOVERY ==========");
        System.out.println("Booking ID: " + bookingId);
        System.out.println("Payment ID: " + payment.getPaymentId());
        System.out.println("Payment Status: " + payment.getStatus());
        System.out.println("Booking Status: " + bookingStatus);
        System.out.println("============================================\n");

        try {

            List<JourneySeatReservation> reservations =
                    transactionTemplate.execute(status ->
                            allocateSeatsForPaidBooking(bookingId)
                    );

            if (reservations == null || reservations.isEmpty()) {
                throw new IllegalStateException(
                        "No seats were allocated.");
            }

            Payment updatedPayment = getPaymentByBookingId(bookingId);

            return verificationResponse(
                    true,
                    "Existing successful payment recovered and booking confirmed.",
                    updatedPayment
            );

        } catch (RuntimeException ex) {

            System.err.println(
                    "\n========== BOOKING RECOVERY FAILED ==========");
            System.err.println("Booking ID: " + bookingId);
            System.err.println("Error: " + ex.getMessage());
            ex.printStackTrace();
            System.err.println("==============================================\n");

            transactionTemplate.execute(status -> {

                Booking currentBooking = bookingRepository
                        .findById(bookingId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Booking not found"));

                if (!"CANCELLED".equalsIgnoreCase(
                        currentBooking.getBookingStatus())
                        && !"CONFIRMED".equalsIgnoreCase(
                                currentBooking.getBookingStatus())) {

                    currentBooking.setBookingStatus(
                            "PAYMENT_RECEIVED_ALLOCATION_FAILED"
                    );

                    bookingRepository.save(currentBooking);
                }

                return null;
            });

            return allocationFailureResponse(
                    bookingId,
                    payment.getPaymentId(),
                    ex.getMessage()
            );
        }
    }


    // ==================================================
    // GET PAYMENT BY BOOKING ID
    // ==================================================

    @Transactional(readOnly = true)
    public Payment getPaymentByBookingId(Long bookingId) {

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Booking not found"));

        return paymentRepository.findByBooking(booking)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Payment not found for this booking"));
    }

    // ==================================================
    // GET ALL PAYMENTS
    // ==================================================

    @Transactional(readOnly = true)
    public List<Payment> getAllPayments() {

        return paymentRepository.findAll();
    }
}
