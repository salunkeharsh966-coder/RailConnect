
package com.example.demo.service;

import com.example.demo.entity.Payment;
import com.example.demo.repository.PaymentRepository;

import com.razorpay.Refund;
import com.razorpay.RazorpayClient;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PaymentRefundService {

    private final PaymentRepository paymentRepository;
    private final TransactionTemplate transactionTemplate;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    // ==================================================
    // REFUND SNAPSHOT
    // ==================================================

    private record RefundSnapshot(
            Long paymentRecordId,
            Long bookingId,
            String paymentId,
            String orderId,
            long amountPaise,
            String refundReceipt,
            String refundId,
            String previousRefundStatus
    ) {
    }

    private record PendingPaymentSnapshot(
            String orderId,
            String paymentStatus
    ) {
    }

    // ==================================================
    // CONSTRUCTOR
    // ==================================================

    public PaymentRefundService(
            PaymentRepository paymentRepository,
            PlatformTransactionManager transactionManager) {

        this.paymentRepository = paymentRepository;

        this.transactionTemplate =
                new TransactionTemplate(transactionManager);

        // Keep refund database operations independent
        // from the outer booking cancellation transaction.

        this.transactionTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW
        );
    }

    // ==================================================
    // INITIATE FULL REFUND
    // ==================================================

    public void initiateFullRefundForBooking(Long bookingId) {

        validateConfiguration();

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required for refund");
        }

        // STEP 1: PREPARE REFUND IN DATABASE

        RefundSnapshot snapshot =
                transactionTemplate.execute(status -> {

                    Payment payment = paymentRepository
                            .findByBookingIdForUpdate(bookingId)
                            .orElseThrow(() ->
                                    new IllegalStateException(
                                            "Payment record not found for booking "
                                                    + bookingId));

                    if (!"SUCCESS".equalsIgnoreCase(
                            payment.getStatus())) {

                        throw new IllegalStateException(
                                "Only successfully paid bookings can be refunded");
                    }

                    if (payment.getAmount() == null
                            || payment.getAmount() <= 0) {

                        throw new IllegalStateException(
                                "Invalid payment amount");
                    }

                    String paymentId = payment.getPaymentId();

                    String orderId = payment.getOrderId();

                    if (isBlank(paymentId)
                            || paymentId.startsWith("PENDING_")
                            || isBlank(orderId)) {

                        throw new IllegalStateException(
                                "Valid Razorpay payment and order IDs are required");
                    }

                    String previousStatus =
                            normalize(payment.getRefundStatus());

                    // Already processed: never refund again.

                    if ("PROCESSED".equals(previousStatus)) {
                        return createSnapshot(payment, previousStatus);
                    }

                    // Failed/manual/unknown states need reconciliation.

                    if ("FAILED".equals(previousStatus)
                            || "MANUAL_REVIEW".equals(previousStatus)
                            || "UNKNOWN".equals(previousStatus)) {

                        throw new IllegalStateException(
                                "Existing refund requires manual reconciliation. "
                                        + "Do not create another refund.");
                    }

                    long amountPaise =
                            Math.round(payment.getAmount() * 100);

                    if (amountPaise <= 0) {
                        throw new IllegalStateException(
                                "Invalid refund amount");
                    }

                    String receipt = payment.getRefundReceipt();

                    if (isBlank(receipt)) {

                        receipt = "booking_"
                                + bookingId
                                + "_full_refund";

                        payment.setRefundReceipt(receipt);
                    }

                    payment.setRefundAmountPaise(amountPaise);

                    if (payment.getRefundRequestedAt() == null) {

                        payment.setRefundRequestedAt(
                                LocalDateTime.now()
                        );
                    }

                    if (isBlank(payment.getRefundStatus())) {

                        payment.setRefundStatus("REQUESTED");
                    }

                    payment.setRefundError(null);

                    paymentRepository.saveAndFlush(payment);

                    // Preserve the status before this request
                    // so that a retry can be treated safely.

                    return createSnapshot(payment, previousStatus);
                });

        if (snapshot == null) {
            throw new IllegalStateException(
                    "Unable to prepare refund request");
        }

        if ("PROCESSED".equals(
                normalize(snapshot.previousRefundStatus()))) {
            return;
        }

        // STEP 2: VERIFY ORIGINAL PAYMENT WITH RAZORPAY

        try {

            RazorpayClient client =
                    new RazorpayClient(
                            razorpayKeyId,
                            razorpayKeySecret
                    );

            com.razorpay.Payment gatewayPayment =
                    client.payments.fetch(snapshot.paymentId());

            validateGatewayPayment(
                    gatewayPayment,
                    snapshot
            );

            // STEP 3: LOOK FOR EXISTING REFUND

            Refund refund = findExistingRefund(
                    client,
                    snapshot.paymentId(),
                    snapshot.refundReceipt()
            );

            if (refund == null) {

                String previousStatus =
                        normalize(snapshot.previousRefundStatus());

                // If a refund was already requested earlier,
                // never create another just because the list API
                // failed to show it.

                if ("REQUESTED".equals(previousStatus)
                        || "PENDING".equals(previousStatus)) {

                    markRefundState(
                            snapshot,
                            null,
                            "MANUAL_REVIEW",
                            "Previous refund request exists, but its "
                                    + "Razorpay refund record was not found. "
                                    + "Manual reconciliation is required."
                    );

                    throw new IllegalStateException(
                            "Existing refund could not be located. "
                                    + "No second refund was created.");
                }

                long amountAlreadyRefunded =
                        safeLong(
                                gatewayPayment.get("amount_refunded"),
                                0
                        );

                if (amountAlreadyRefunded > 0) {

                    markRefundState(
                            snapshot,
                            null,
                            "MANUAL_REVIEW",
                            "A previous refund exists but could not "
                                    + "be matched to the saved refund receipt."
                    );

                    throw new IllegalStateException(
                            "Previous refund detected. Manual reconciliation required.");
                }

                String gatewayPaymentStatus =
                        safeString(gatewayPayment.get("status"));

                if (!"captured".equalsIgnoreCase(
                        gatewayPaymentStatus)) {

                    markRefundState(
                            snapshot,
                            null,
                            "MANUAL_REVIEW",
                            "Original Razorpay payment is not captured. Status: "
                                    + gatewayPaymentStatus
                    );

                    throw new IllegalStateException(
                            "Only captured payments can be refunded.");
                }

                // STEP 4: CREATE FULL REFUND

                JSONObject refundRequest = new JSONObject();

                refundRequest.put(
                        "amount",
                        snapshot.amountPaise()
                );

                refundRequest.put(
                        "receipt",
                        snapshot.refundReceipt()
                );

                JSONObject notes = new JSONObject();

                notes.put(
                        "booking_id",
                        String.valueOf(snapshot.bookingId())
                );

                notes.put(
                        "refund_type",
                        "FULL_BOOKING_CANCELLATION"
                );

                refundRequest.put("notes", notes);

                try {

                    refund = client.payments.refund(
                            snapshot.paymentId(),
                            refundRequest
                    );

                } catch (Exception requestException) {

                    // A network error may occur after Razorpay
                    // has accepted the request.
                    // Search using the SAME receipt before retrying.

                    Refund recoveredRefund = findExistingRefund(
                            client,
                            snapshot.paymentId(),
                            snapshot.refundReceipt()
                    );

                    if (recoveredRefund != null) {

                        refund = recoveredRefund;

                    } else {

                        markRefundState(
                                snapshot,
                                null,
                                "UNKNOWN",
                                "Refund request outcome could not be confirmed: "
                                        + requestException.getMessage()
                        );

                        throw new IllegalStateException(
                                "Refund outcome is unknown. "
                                        + "Check Razorpay Dashboard before retrying.",
                                requestException
                        );
                    }
                }
            }

            // STEP 5: VALIDATE REFUND RESPONSE

            validateRefundResponse(refund, snapshot);

            String refundId =
                    safeString(refund.get("id"));

            String gatewayRefundStatus =
                    safeString(refund.get("status"));

            String localRefundStatus =
                    mapRefundStatus(gatewayRefundStatus);

            if ("UNKNOWN".equals(localRefundStatus)) {

                markRefundState(
                        snapshot,
                        refundId,
                        "UNKNOWN",
                        "Razorpay returned an unsupported refund status: "
                                + gatewayRefundStatus
                );

                throw new IllegalStateException(
                        "Refund status requires manual reconciliation");
            }

            // STEP 6: SAVE REFUND DETAILS

            saveRefundOutcome(
                    snapshot,
                    refundId,
                    localRefundStatus,
                    snapshot.amountPaise(),
                    null
            );

            if ("PENDING".equals(localRefundStatus)
                    || "PROCESSED".equals(localRefundStatus)) {

                return;
            }

            if ("FAILED".equals(localRefundStatus)) {

                throw new IllegalStateException(
                        "Razorpay reports that the refund failed. "
                                + "Check the Razorpay Dashboard.");
            }

        } catch (IllegalStateException ex) {

            throw ex;

        } catch (Exception ex) {

            markRefundState(
                    snapshot,
                    null,
                    "UNKNOWN",
                    ex.getMessage()
            );

            throw new IllegalStateException(
                    "Refund could not be confirmed. "
                            + "The booking must not be cancelled until "
                            + "the refund is reconciled. Details: "
                            + ex.getMessage(),
                    ex
            );
        }
    }

    // ==================================================
    // REFRESH REFUND STATUS FROM RAZORPAY
    // ==================================================

    public Map<String, Object> refreshRefundStatus(
            Long bookingId) {

        validateConfiguration();

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        // STEP 1: GET STORED REFUND DETAILS

        RefundSnapshot snapshot =
                transactionTemplate.execute(status -> {

                    Payment payment = paymentRepository
                            .findByBookingIdForUpdate(bookingId)
                            .orElseThrow(() ->
                                    new IllegalArgumentException(
                                            "Payment not found for booking "
                                                    + bookingId));

                    if (isBlank(payment.getRefundId())
                            || isBlank(payment.getPaymentId())
                            || isBlank(payment.getRefundReceipt())) {

                        throw new IllegalStateException(
                                "No complete refund information exists for this booking");
                    }

                    return createSnapshot(
                            payment,
                            normalize(payment.getRefundStatus())
                    );
                });

        if (snapshot == null) {
            throw new IllegalStateException(
                    "Unable to retrieve refund information");
        }

        // STEP 2: FETCH THE EXACT REFUND FROM RAZORPAY

        try {

            RazorpayClient client =
                    new RazorpayClient(
                            razorpayKeyId,
                            razorpayKeySecret
                    );

            Refund gatewayRefund =
                    client.payments.fetchRefund(
                            snapshot.paymentId(),
                            snapshot.refundId()
                    );

            // STEP 3: VALIDATE GATEWAY RESPONSE

            validateRefundResponse(
                    gatewayRefund,
                    snapshot
            );

            String gatewayStatus =
                    safeString(gatewayRefund.get("status"));

            String localStatus =
                    mapRefundStatus(gatewayStatus);

            // STEP 4: UPDATE DATABASE

            Map<String, Object> response =
                    transactionTemplate.execute(status -> {

                        Payment payment = paymentRepository
                                .findByBookingIdForUpdate(bookingId)
                                .orElseThrow(() ->
                                        new IllegalArgumentException(
                                                "Payment record not found"));

                        if (!snapshot.refundId().equals(
                                payment.getRefundId())) {

                            throw new IllegalStateException(
                                    "Refund ID changed during status refresh");
                        }

                        if ("PROCESSED".equals(
                                normalize(payment.getRefundStatus()))
                                && !"PROCESSED".equals(localStatus)) {

                            throw new IllegalStateException(
                                    "Razorpay returned an unexpected status "
                                            + "for an already processed refund");
                        }

                        if ("FAILED".equals(localStatus)
                                && !"FAILED".equals(
                                        normalize(payment.getRefundStatus()))) {

                            payment.setRefundError(
                                    "Razorpay reports that the refund failed"
                            );

                        } else {

                            payment.setRefundError(null);
                        }

                        payment.setRefundStatus(localStatus);

                        payment.setRefundAmountPaise(
                                safeLong(
                                        gatewayRefund.get("amount"),
                                        payment.getRefundAmountPaise() == null
                                                ? 0
                                                : payment.getRefundAmountPaise()
                                )
                        );

                        if ("PROCESSED".equals(localStatus)
                                && payment.getRefundProcessedAt() == null) {

                            payment.setRefundProcessedAt(
                                    LocalDateTime.now()
                            );
                        }

                        paymentRepository.saveAndFlush(payment);

                        Map<String, Object> result =
                                new LinkedHashMap<>();

                        result.put("bookingId", bookingId);
                        result.put("paymentStatus", payment.getStatus());
                        result.put("refundId", payment.getRefundId());
                        result.put("refundStatus", payment.getRefundStatus());

                        result.put(
                                "refundAmountPaise",
                                payment.getRefundAmountPaise()
                        );

                        result.put(
                                "refundReceipt",
                                payment.getRefundReceipt()
                        );

                        result.put(
                                "refundRequestedAt",
                                payment.getRefundRequestedAt()
                        );

                        result.put(
                                "refundProcessedAt",
                                payment.getRefundProcessedAt()
                        );

                        result.put(
                                "refundError",
                                payment.getRefundError()
                        );

                        result.put(
                                "message",
                                "Refund status synchronized with Razorpay"
                        );

                        return result;
                    });

            if (response == null) {
                throw new IllegalStateException(
                        "Unable to update refund status");
            }

            return response;

        } catch (IllegalStateException ex) {

            throw ex;

        } catch (Exception ex) {

            throw new IllegalStateException(
                    "Unable to refresh Razorpay refund status: "
                            + ex.getMessage(),
                    ex
            );
        }
    }

    // ==================================================
    // CHECK PENDING BOOKING PAYMENT ATTEMPTS
    // ==================================================

    public void ensureNoCapturedPaymentForPendingBooking(
            Long bookingId) {

        PendingPaymentSnapshot snapshot =
                transactionTemplate.execute(status -> {

                    Payment payment = paymentRepository
                            .findByBookingIdForUpdate(bookingId)
                            .orElse(null);

                    if (payment == null) {
                        return null;
                    }

                    return new PendingPaymentSnapshot(
                            payment.getOrderId(),
                            payment.getStatus()
                    );
                });

        if (snapshot == null || isBlank(snapshot.orderId())) {
            return;
        }

        if ("SUCCESS".equalsIgnoreCase(
                snapshot.paymentStatus())) {

            throw new IllegalStateException(
                    "Payment is already successful. "
                            + "Resolve the refund before cancellation.");
        }

        if (!"PENDING".equalsIgnoreCase(
                snapshot.paymentStatus())) {

            throw new IllegalStateException(
                    "Payment state needs reconciliation before cancellation.");
        }

        try {

            RazorpayClient client =
                    new RazorpayClient(
                            razorpayKeyId,
                            razorpayKeySecret
                    );

            List<com.razorpay.Payment> attempts =
                    client.orders.fetchPayments(snapshot.orderId());

            if (attempts != null) {

                for (com.razorpay.Payment attempt : attempts) {

                    String attemptStatus =
                            safeString(attempt.get("status"));

                    if (!"failed".equalsIgnoreCase(attemptStatus)) {

                        throw new IllegalStateException(
                                "A payment attempt has status "
                                        + attemptStatus
                                        + ". Reconciliation is required.");
                    }
                }
            }

        } catch (IllegalStateException ex) {

            throw ex;

        } catch (Exception ex) {

            throw new IllegalStateException(
                    "Unable to verify payment attempts. "
                            + "Booking cancellation has been stopped.",
                    ex
            );
        }
    }

    // ==================================================
    // FETCH EXISTING REFUND BY RECEIPT
    // ==================================================

    private Refund findExistingRefund(
            RazorpayClient client,
            String paymentId,
            String receipt) throws Exception {

        List<Refund> refunds =
                client.payments.fetchAllRefunds(paymentId);

        if (refunds == null || refunds.isEmpty()) {
            return null;
        }

        Refund matchedRefund = null;

        for (Refund candidate : refunds) {

            String actualReceipt =
                    safeString(candidate.get("receipt"));

            if (receipt.equals(actualReceipt)) {

                if (matchedRefund != null) {

                    throw new IllegalStateException(
                            "Multiple refunds found for the same receipt. "
                                    + "Manual reconciliation is required.");
                }

                matchedRefund = candidate;
            }
        }

        return matchedRefund;
    }

    // ==================================================
    // VALIDATE ORIGINAL RAZORPAY PAYMENT
    // ==================================================

    private void validateGatewayPayment(
            com.razorpay.Payment gatewayPayment,
            RefundSnapshot snapshot) {

        String actualPaymentId =
                safeString(gatewayPayment.get("id"));

        String actualOrderId =
                safeString(gatewayPayment.get("order_id"));

        String currency =
                safeString(gatewayPayment.get("currency"));

        long amount =
                safeLong(gatewayPayment.get("amount"), -1);

        if (!snapshot.paymentId().equals(actualPaymentId)) {

            throw new IllegalStateException(
                    "Razorpay payment ID mismatch");
        }

        if (!snapshot.orderId().equals(actualOrderId)) {

            throw new IllegalStateException(
                    "Razorpay order ID mismatch");
        }

        if (!"INR".equalsIgnoreCase(currency)) {

            throw new IllegalStateException(
                    "Payment currency is not INR");
        }

        if (amount != snapshot.amountPaise()) {

            throw new IllegalStateException(
                    "Razorpay payment amount does not match booking");
        }
    }

    // ==================================================
    // VALIDATE REFUND RESPONSE
    // ==================================================

    private void validateRefundResponse(
            Refund refund,
            RefundSnapshot snapshot) {

        if (refund == null) {

            throw new IllegalStateException(
                    "Razorpay returned an empty refund response");
        }

        String actualRefundId =
                safeString(refund.get("id"));

        String actualPaymentId =
                safeString(refund.get("payment_id"));

        String currency =
                safeString(refund.get("currency"));

        String actualReceipt =
                safeString(refund.get("receipt"));

        long amount =
                safeLong(refund.get("amount"), -1);

        if (isBlank(actualRefundId)) {

            throw new IllegalStateException(
                    "Razorpay refund ID is missing");
        }

        if (!snapshot.refundId().equals(actualRefundId)) {

            throw new IllegalStateException(
                    "Razorpay refund ID mismatch");
        }

        if (!snapshot.paymentId().equals(actualPaymentId)) {

            throw new IllegalStateException(
                    "Refund belongs to a different payment");
        }

        if (!"INR".equalsIgnoreCase(currency)) {

            throw new IllegalStateException(
                    "Refund currency must be INR");
        }

        if (amount != snapshot.amountPaise()) {

            throw new IllegalStateException(
                    "Refund amount does not match full booking amount");
        }

        if (!isBlank(actualReceipt)
                && !snapshot.refundReceipt().equals(actualReceipt)) {

            throw new IllegalStateException(
                    "Refund receipt does not match booking");
        }
    }

    // ==================================================
    // SAVE REFUND OUTCOME
    // ==================================================

    private void saveRefundOutcome(
            RefundSnapshot snapshot,
            String refundId,
            String refundStatus,
            long amountPaise,
            String error) {

        transactionTemplate.execute(status -> {

            Payment payment = paymentRepository
                    .findByBookingIdForUpdate(snapshot.bookingId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Payment record not found"));

            if (payment.getRefundId() != null
                    && !payment.getRefundId().equals(refundId)) {

                throw new IllegalStateException(
                        "A different refund ID is already stored");
            }

            payment.setRefundId(refundId);
            payment.setRefundStatus(refundStatus);
            payment.setRefundAmountPaise(amountPaise);
            payment.setRefundError(error);

            if (payment.getRefundRequestedAt() == null) {

                payment.setRefundRequestedAt(
                        LocalDateTime.now()
                );
            }

            if ("PROCESSED".equals(refundStatus)) {

                if (payment.getRefundProcessedAt() == null) {

                    payment.setRefundProcessedAt(
                            LocalDateTime.now()
                    );
                }
            }

            paymentRepository.saveAndFlush(payment);

            return null;
        });
    }

    // ==================================================
    // SAVE REFUND ERROR / MANUAL REVIEW STATE
    // ==================================================

    private void markRefundState(
            RefundSnapshot snapshot,
            String refundId,
            String refundStatus,
            String error) {

        transactionTemplate.execute(status -> {

            Payment payment = paymentRepository
                    .findByBookingIdForUpdate(snapshot.bookingId())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Payment record not found"));

            if (!isBlank(refundId)) {

                if (payment.getRefundId() != null
                        && !payment.getRefundId().equals(refundId)) {

                    throw new IllegalStateException(
                            "A different refund ID is already stored");
                }

                payment.setRefundId(refundId);
            }

            payment.setRefundStatus(refundStatus);

            payment.setRefundError(
                    error == null
                            ? null
                            : error.substring(
                                    0,
                                    Math.min(error.length(), 1000)
                            )
            );

            paymentRepository.saveAndFlush(payment);

            return null;
        });
    }

    // ==================================================
    // CREATE REFUND SNAPSHOT
    // ==================================================

    private RefundSnapshot createSnapshot(
            Payment payment,
            String previousRefundStatus) {

        return new RefundSnapshot(
                payment.getId(),
                payment.getBooking().getId(),
                payment.getPaymentId(),
                payment.getOrderId(),
                Math.round(payment.getAmount() * 100),
                payment.getRefundReceipt(),
                payment.getRefundId(),
                previousRefundStatus
        );
    }

    // ==================================================
    // MAP RAZORPAY REFUND STATUS
    // ==================================================

    private String mapRefundStatus(String gatewayStatus) {

        if ("processed".equalsIgnoreCase(gatewayStatus)) {
            return "PROCESSED";
        }

        if ("pending".equalsIgnoreCase(gatewayStatus)
                || "created".equalsIgnoreCase(gatewayStatus)) {

            return "PENDING";
        }

        if ("failed".equalsIgnoreCase(gatewayStatus)) {
            return "FAILED";
        }

        return "UNKNOWN";
    }

    // ==================================================
    // NORMALIZE STATUS
    // ==================================================

    private String normalize(String value) {

        return value == null
                ? ""
                : value.trim().toUpperCase(Locale.ROOT);
    }

    // ==================================================
    // SAFE STRING CONVERSION
    // ==================================================

    private String safeString(Object value) {

        return value == null
                ? null
                : value.toString();
    }

    // ==================================================
    // SAFE NUMBER CONVERSION
    // ==================================================

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
    // CONFIGURATION VALIDATION
    // ==================================================

    private void validateConfiguration() {

        if (isBlank(razorpayKeyId)
                || isBlank(razorpayKeySecret)) {

            throw new IllegalStateException(
                    "Razorpay configuration is missing");
        }
    }

    // ==================================================
    // STRING VALIDATION
    // ==================================================

    private boolean isBlank(String value) {

        return value == null || value.isBlank();
    }
}
