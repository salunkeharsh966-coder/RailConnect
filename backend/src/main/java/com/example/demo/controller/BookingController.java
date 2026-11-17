
package com.example.demo.controller;

import com.example.demo.entity.Booking;
import com.example.demo.service.BookingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    /*
     * Create a booking.
     *
     * POST /api/bookings?userId=1&trainId=1
     */
    @PostMapping
    public ResponseEntity<?> createBooking(
            @RequestParam Long userId,
            @RequestParam Long trainId,
            @RequestBody Booking booking) {

        try {
            Booking createdBooking =
                    bookingService.createBooking(userId, trainId, booking);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(createdBooking);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to create booking"
            );
        }
    }

    /*
     * Get all bookings.
     *
     * GET /api/bookings
     *
     * Restrict this endpoint to administrators before production.
     */
    @GetMapping
    public ResponseEntity<?> getAllBookings() {
        try {
            List<Booking> bookings = bookingService.getAllBookings();
            return ResponseEntity.ok(bookings);

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to retrieve bookings"
            );
        }
    }

    /*
     * Get booking by booking ID.
     *
     * GET /api/bookings/1
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        try {
            Booking booking = bookingService.getBookingById(id);

            if (booking == null) {
                return errorResponse(
                        HttpStatus.NOT_FOUND,
                        "Booking not found"
                );
            }

            return ResponseEntity.ok(booking);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.NOT_FOUND, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to retrieve booking"
            );
        }
    }

    /*
     * Find a booking using its PNR.
     *
     * GET /api/bookings/pnr/1234567890
     *
     * Keep this route above other potentially conflicting routes.
     */
    @GetMapping("/pnr/{pnr}")
    public ResponseEntity<?> getBookingByPnr(@PathVariable String pnr) {
        try {
            Booking booking = bookingService.getBookingByPnr(pnr);

            if (booking == null) {
                return errorResponse(
                        HttpStatus.NOT_FOUND,
                        "No booking found for this PNR"
                );
            }

            return ResponseEntity.ok(booking);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.NOT_FOUND, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to search booking by PNR"
            );
        }
    }

    /*
     * Get bookings for a user.
     *
     * GET /api/bookings/my?userId=1
     */
    @GetMapping("/my")
    public ResponseEntity<?> getUserBookings(
            @RequestParam Long userId) {

        try {
            List<Booking> bookings =
                    bookingService.getUserBookings(userId);

            return ResponseEntity.ok(bookings);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.NOT_FOUND, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to retrieve your bookings"
            );
        }
    }

    /*
     * Cancel a booking.
     *
     * PUT /api/bookings/1/cancel
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        try {
            Booking cancelledBooking =
                    bookingService.cancelBooking(id);

            return ResponseEntity.ok(cancelledBooking);

        } catch (IllegalArgumentException ex) {
            return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());

        } catch (IllegalStateException ex) {
            return errorResponse(HttpStatus.CONFLICT, ex.getMessage());

        } catch (Exception ex) {
            return errorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to cancel booking"
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
