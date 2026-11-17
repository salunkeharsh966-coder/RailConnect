
package com.example.demo.service;

import com.example.demo.entity.Booking;
import com.example.demo.entity.Coach;
import com.example.demo.entity.JourneySeatReservation;
import com.example.demo.entity.Seat;
import com.example.demo.repository.BookingRepository;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BookingEmailService {

    private final JavaMailSender mailSender;
    private final BookingRepository bookingRepository;

    public BookingEmailService(
            JavaMailSender mailSender,
            BookingRepository bookingRepository) {
        this.mailSender = mailSender;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public void sendBookingConfirmation(
            Long bookingId,
            List<JourneySeatReservation> reservations) {

        if (bookingId == null) {
            throw new IllegalArgumentException("Booking ID is required");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Booking not found"));

        if (booking.isConfirmationEmailSent()) {
            return;
        }

        if (reservations == null || reservations.isEmpty()) {
            throw new IllegalArgumentException(
                    "No seat reservations found for this booking");
        }

        if (booking.getUser() == null
                || booking.getUser().getEmail() == null
                || booking.getUser().getEmail().isBlank()) {
            throw new IllegalStateException(
                    "Booking user email is not available");
        }

        StringBuilder seatDetails = new StringBuilder();

        for (JourneySeatReservation reservation : reservations) {
            if (reservation == null) {
                continue;
            }

            seatDetails.append("\nPassenger: ");
            if (reservation.getPassenger() != null
                    && reservation.getPassenger().getName() != null) {
                seatDetails.append(reservation.getPassenger().getName());
            } else {
                seatDetails.append("Passenger");
            }

            Seat seat = reservation.getSeat();
            Coach coach = seat != null ? seat.getCoach() : null;

            seatDetails.append("\nCoach: ");
            if (coach != null && coach.getCoachNumber() != null) {
                seatDetails.append(coach.getCoachNumber());
            } else {
                seatDetails.append("Not available");
            }

            seatDetails.append("\nSeat: ");
            if (seat != null) {
                seatDetails.append(seat.getSeatNumber());

                if (seat.getBerthType() != null) {
                    seatDetails.append(" (")
                            .append(seat.getBerthType())
                            .append(")");
                }
            } else {
                seatDetails.append("Not available");
            }

            seatDetails.append("\n");
        }

        String trainName = booking.getTrain() != null
                ? booking.getTrain().getTrainName()
                : "Train";

        String trainNumber = booking.getTrain() != null
                ? String.valueOf(booking.getTrain().getTrainNumber())
                : "Not available";

        String source = booking.getTrain() != null
                ? booking.getTrain().getSource()
                : "Not available";

        String destination = booking.getTrain() != null
                ? booking.getTrain().getDestination()
                : "Not available";

        String subject = "RailConnect Ticket Confirmed - PNR "
                + booking.getPnr();

        String message =
                "Hello " + booking.getUser().getName() + ",\n\n"
                + "Your RailConnect train booking is confirmed!\n\n"
                + "========== TICKET DETAILS ==========\n"
                + "PNR: " + booking.getPnr() + "\n"
                + "Train Number: " + trainNumber + "\n"
                + "Train Name: " + trainName + "\n"
                + "From: " + source + "\n"
                + "To: " + destination + "\n"
                + "Journey Date: " + booking.getJourneyDate() + "\n"
                + "Class: " + booking.getClassType() + "\n"
                + "Booking Status: " + booking.getBookingStatus() + "\n"
                + "Total Amount: Rs. " + booking.getTotalAmount() + "\n\n"
                + "========== PASSENGER & SEAT DETAILS ==========\n"
                + seatDetails
                + "\nPlease keep your PNR available during your journey.\n"
                + "Thank you for choosing RailConnect!\n\n"
                + "Regards,\n"
                + "RailConnect Team";

        SimpleMailMessage email = new SimpleMailMessage();
        email.setTo(booking.getUser().getEmail());
        email.setSubject(subject);
        email.setText(message);

        // Set the flag only after the mail server accepts the email.
        mailSender.send(email);

        booking.setConfirmationEmailSent(true);
        bookingRepository.save(booking);
    }
}
