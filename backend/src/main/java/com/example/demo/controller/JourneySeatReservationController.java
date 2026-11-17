
package com.example.demo.controller;

import com.example.demo.entity.JourneySeatReservation;
import com.example.demo.service.JourneySeatReservationService;
import com.example.demo.service.BookingEmailService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/journey-seat-reservations")
@CrossOrigin(origins = "*")
public class JourneySeatReservationController {

    private final JourneySeatReservationService reservationService;
    private final BookingEmailService bookingEmailService;

    public JourneySeatReservationController(
            JourneySeatReservationService reservationService,
            BookingEmailService bookingEmailService) {
        this.reservationService = reservationService;
        this.bookingEmailService = bookingEmailService;
    }

    @GetMapping("/availability")
    public String checkAvailability(
            @RequestParam Long trainId,
            @RequestParam Long seatId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate journeyDate,
            @RequestParam Integer fromStopOrder,
            @RequestParam Integer toStopOrder) {

        boolean available = reservationService.isSeatAvailable(
                trainId,
                seatId,
                journeyDate,
                fromStopOrder,
                toStopOrder
        );

        return available
                ? "Seat is AVAILABLE for this journey segment."
                : "Seat is NOT AVAILABLE for this journey segment.";
    }

    @PostMapping
    public ResponseEntity<?> reserveSeat(
            @RequestParam Long bookingId,
            @RequestParam Long seatId,
            @RequestParam Integer fromStopOrder,
            @RequestParam Integer toStopOrder) {

        try {
            JourneySeatReservation reservation =
                    reservationService.reserveSeat(
                            bookingId,
                            seatId,
                            fromStopOrder,
                            toStopOrder
                    );

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(reservation);

        } catch (RuntimeException ex) {

            if ("Seat is already reserved for an overlapping journey"
                    .equals(ex.getMessage())) {

                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body(Map.of(
                                "message",
                                "Seat is already reserved for this journey segment"
                        ));
            }

            throw ex;
        }
    }

    // Automatically allocate seats and attempt confirmation email.
    @PostMapping("/auto-allocate")
    public ResponseEntity<?> autoAllocateSeats(
            @RequestParam Long bookingId,
            @RequestParam Integer fromStopOrder,
            @RequestParam Integer toStopOrder) {

        List<JourneySeatReservation> reservations =
                reservationService.autoAllocateSeats(
                        bookingId,
                        fromStopOrder,
                        toStopOrder
                );

        try {
            bookingEmailService.sendBookingConfirmation(
                    bookingId, reservations);

        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservations);
    }

    // Temporary endpoint to test email using existing seat reservations.
    @PostMapping("/test-email/{bookingId}")
    public ResponseEntity<?> testBookingEmail(
            @PathVariable Long bookingId) {

        try {
            List<JourneySeatReservation> reservations =
                    reservationService.getReservationsByBooking(bookingId);

            if (reservations == null || reservations.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "message",
                                "No seat reservations found for booking "
                                        + bookingId
                        )
                );
            }

            bookingEmailService.sendBookingConfirmation(
                    bookingId, reservations);

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Confirmation email sent successfully"
                    )
            );

        } catch (Exception ex) {
            ex.printStackTrace();

            return ResponseEntity.status(
                    HttpStatus.INTERNAL_SERVER_ERROR
            ).body(
                    Map.of(
                            "message", "Email sending failed",
                            "error", String.valueOf(ex.getMessage())
                    )
            );
        }
    }

    @GetMapping("/booking/{bookingId}")
    public List<JourneySeatReservation> getReservationsByBooking(
            @PathVariable Long bookingId) {

        return reservationService.getReservationsByBooking(bookingId);
    }

    @GetMapping("/train/{trainId}")
    public List<JourneySeatReservation> getReservationsByTrainAndDate(
            @PathVariable Long trainId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate journeyDate) {

        return reservationService.getReservationsByTrainAndDate(
                trainId,
                journeyDate
        );
    }
}