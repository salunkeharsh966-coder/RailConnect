
package com.example.demo.controller;

import com.example.demo.entity.Passenger;
import com.example.demo.service.PassengerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/passengers")
@CrossOrigin(origins = "*")
public class PassengerController {

    private final PassengerService passengerService;

    public PassengerController(PassengerService passengerService) {
        this.passengerService = passengerService;
    }

    /*
     * Add a passenger to a booking.
     *
     * POST /api/passengers?bookingId=1
     */
    @PostMapping
    public ResponseEntity<?> addPassenger(
            @RequestParam Long bookingId,
            @RequestBody Passenger passenger) {

        try {
            Passenger savedPassenger =
                    passengerService.addPassenger(bookingId, passenger);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(savedPassenger);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());

        } catch (IllegalStateException ex) {
            return errorResponse(HttpStatus.CONFLICT, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to add passenger"
            );
        }
    }

    /*
     * Get all passengers associated with a booking.
     *
     * GET /api/passengers/1
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<?> getPassengersByBooking(
            @PathVariable Long bookingId) {

        try {
            List<Passenger> passengers =
                    passengerService.getPassengersByBooking(bookingId);

            return ResponseEntity.ok(passengers);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.NOT_FOUND, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to retrieve passengers"
            );
        }
    }

    private ResponseEntity<Map<String, String>> errorResponse(
            HttpStatus status,
            String message) {

        Map<String, String> error = new LinkedHashMap<>();
        error.put("message", message);

        return ResponseEntity.status(status).body(error);
    }
}
