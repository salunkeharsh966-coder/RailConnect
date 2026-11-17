
package com.example.demo.controller;

import com.example.demo.service.PaymentRefundService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class RefundStatusController {

    private final PaymentRefundService paymentRefundService;

    public RefundStatusController(
            PaymentRefundService paymentRefundService) {

        this.paymentRefundService = paymentRefundService;
    }

    @GetMapping("/{bookingId}/refund-status/refresh")
    public ResponseEntity<?> refreshRefundStatus(
            @PathVariable Long bookingId) {

        try {

            Map<String, Object> response =
                    paymentRefundService.refreshRefundStatus(
                            bookingId
                    );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", ex.getMessage()));

        } catch (IllegalStateException ex) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of("message", ex.getMessage()));

        } catch (Exception ex) {

            Map<String, String> error = new LinkedHashMap<>();

            error.put(
                    "message",
                    "Unable to refresh refund status"
            );

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error);
        }
    }
}
