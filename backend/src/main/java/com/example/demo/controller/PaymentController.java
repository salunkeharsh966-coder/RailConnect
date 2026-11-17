
package com.example.demo.controller;

import com.example.demo.entity.Payment;
import com.example.demo.service.PaymentService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private static final Logger log =
            LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // ==================================================
    // CREATE RAZORPAY PAYMENT ORDER
    // ==================================================

    /*
     * POST /api/payments?bookingId=1&paymentMethod=RAZORPAY
     */

    @PostMapping
    public ResponseEntity<?> createPayment(
            @RequestParam Long bookingId,
            @RequestParam(defaultValue = "RAZORPAY")
            String paymentMethod) {

        try {

            Map<String, Object> response =
                    paymentService.createPayment(
                            bookingId,
                            paymentMethod
                    );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {

            log.warn(
                    "Invalid payment order request for booking {}: {}",
                    bookingId,
                    ex.getMessage()
            );

            return errorResponse(
                    HttpStatus.BAD_REQUEST,
                    ex.getMessage()
            );

        } catch (IllegalStateException ex) {

            log.warn(
                    "Payment order cannot be created for booking {}: {}",
                    bookingId,
                    ex.getMessage()
            );

            return errorResponse(
                    HttpStatus.CONFLICT,
                    ex.getMessage()
            );

        } catch (Exception ex) {

            // Log the complete exception and stack trace
            // in the backend terminal.
            log.error(
                    "Razorpay order creation failed for booking ID: {}",
                    bookingId,
                    ex
            );

            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to create payment. Please check backend logs."
            );
        }
    }

    // ==================================================
    // VERIFY RAZORPAY PAYMENT
    // ==================================================

    /*
     * POST /api/payments/verify
     *
     * Expected JSON:
     * {
     *   "razorpay_order_id": "...",
     *   "razorpay_payment_id": "...",
     *   "razorpay_signature": "..."
     * }
     */

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestBody(required = false)
            Map<String, String> request) {

        if (request == null || request.isEmpty()) {

            return errorResponse(
                    HttpStatus.BAD_REQUEST,
                    "Payment verification details are required"
            );
        }

        String orderId =
                request.get("razorpay_order_id");

        String paymentId =
                request.get("razorpay_payment_id");

        String signature =
                request.get("razorpay_signature");

        if (isBlank(orderId)
                || isBlank(paymentId)
                || isBlank(signature)) {

            return errorResponse(
                    HttpStatus.BAD_REQUEST,
                    "Order ID, payment ID and signature are required"
            );
        }

        try {

            Map<String, Object> response =
                    paymentService.verifyPayment(
                            orderId,
                            paymentId,
                            signature
                    );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {

            log.warn(
                    "Invalid Razorpay verification request for order {}: {}",
                    orderId,
                    ex.getMessage()
            );

            return errorResponse(
                    HttpStatus.BAD_REQUEST,
                    ex.getMessage()
            );

        } catch (IllegalStateException ex) {

            log.warn(
                    "Razorpay verification could not complete for order {}: {}",
                    orderId,
                    ex.getMessage()
            );

            return errorResponse(
                    HttpStatus.CONFLICT,
                    ex.getMessage()
            );

        } catch (Exception ex) {

            log.error(
                    "Razorpay payment verification failed for order: {}",
                    orderId,
                    ex
            );

            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Payment verification failed. "
                            + "Check backend logs and payment status before retrying."
            );
        }
    }
    // ==================================================
    // RETRY SEAT ALLOCATION FOR EXISTING SUCCESSFUL PAYMENT
    // ==================================================

    /*
     * POST /api/payments/20/retry-allocation
     *
     * Uses the existing successful payment.
     * Does NOT create a new Razorpay order.
     */

    @PostMapping("/{bookingId}/retry-allocation")
    public ResponseEntity<?> retrySeatAllocation(
            @PathVariable Long bookingId) {

        try {

            Map<String, Object> response =
                    paymentService.retrySeatAllocationForPaidBooking(
                            bookingId
                    );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {

            return errorResponse(
                    HttpStatus.BAD_REQUEST,
                    ex.getMessage()
            );

        } catch (IllegalStateException ex) {

            return errorResponse(
                    HttpStatus.CONFLICT,
                    ex.getMessage()
            );

        } catch (Exception ex) {

            log.error(
                    "Seat allocation recovery failed for booking {}",
                    bookingId,
                    ex
            );

            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to recover booking. Check backend logs."
            );
        }
    }


    // ==================================================
    // GET PAYMENT BY BOOKING ID
    // ==================================================

    /*
     * GET /api/payments/1
     */

    @GetMapping("/{bookingId}")
    public ResponseEntity<?> getPaymentByBookingId(
            @PathVariable Long bookingId) {

        try {

            Payment payment =
                    paymentService.getPaymentByBookingId(bookingId);

            return ResponseEntity.ok(payment);

        } catch (IllegalArgumentException ex) {

            return errorResponse(
                    HttpStatus.NOT_FOUND,
                    ex.getMessage()
            );

        } catch (Exception ex) {

            log.error(
                    "Unable to retrieve payment for booking: {}",
                    bookingId,
                    ex
            );

            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to retrieve payment details"
            );
        }
    }

    // ==================================================
    // GET ALL PAYMENTS
    // ==================================================

    /*
     * GET /api/payments
     *
     * Restrict this endpoint to administrators
     * before production.
     */

    @GetMapping
    public ResponseEntity<?> getAllPayments() {

        try {

            List<Payment> payments =
                    paymentService.getAllPayments();

            return ResponseEntity.ok(payments);

        } catch (Exception ex) {

            log.error(
                    "Unable to retrieve all payment records",
                    ex
            );

            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to retrieve payments"
            );
        }
    }

    // ==================================================
    // ERROR RESPONSE
    // ==================================================

    private ResponseEntity<Map<String, String>> errorResponse(
            HttpStatus status,
            String message) {

        Map<String, String> error = new LinkedHashMap<>();

        error.put("message", message);

        return ResponseEntity
                .status(status)
                .body(error);
    }

    // ==================================================
    // VALIDATION HELPER
    // ==================================================

    private boolean isBlank(String value) {

        return value == null || value.isBlank();
    }
}
