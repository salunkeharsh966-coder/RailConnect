package com.example.demo.service;

import com.example.demo.entity.Booking;
import com.example.demo.entity.Passenger;
import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.PassengerRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class PassengerService {

    private final PassengerRepository passengerRepository;
    private final BookingRepository bookingRepository;

    public PassengerService(
            PassengerRepository passengerRepository,
            BookingRepository bookingRepository) {

        this.passengerRepository = passengerRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    public Passenger addPassenger(Long bookingId, Passenger passenger) {

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        if (passenger == null) {
            throw new IllegalArgumentException(
                    "Passenger details are required");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Booking not found: " + bookingId));

        if (!"PENDING_PAYMENT".equalsIgnoreCase(
                booking.getBookingStatus())) {
            throw new IllegalStateException(
                    "Passengers can only be added before payment confirmation");
        }

        if (passenger.getName() == null
                || passenger.getName().isBlank()) {
            throw new IllegalArgumentException(
                    "Passenger name is required");
        }

        if (passenger.getAge() == null
                || passenger.getAge() < 0
                || passenger.getAge() > 125) {
            throw new IllegalArgumentException(
                    "Passenger age must be between 0 and 125");
        }

        if (passenger.getGender() == null
                || passenger.getGender().isBlank()) {
            throw new IllegalArgumentException(
                    "Passenger gender is required");
        }

        List<Passenger> existingPassengers =
                passengerRepository.findByBooking_Id(bookingId);

        Integer expectedPassengers = booking.getTotalPassengers();

        if (expectedPassengers == null || expectedPassengers < 1) {
            throw new IllegalStateException(
                    "Booking has an invalid passenger count");
        }

        if (existingPassengers.size() >= expectedPassengers) {
            throw new IllegalStateException(
                    "Maximum passenger count for this booking reached");
        }

        // Passenger seat assignment is stored in JourneySeatReservation.
        // The Passenger entity does not have a Seat field.
        passenger.setId(null);
        passenger.setName(passenger.getName().trim());
        passenger.setGender(
                passenger.getGender().trim().toUpperCase(Locale.ROOT));
        passenger.setBooking(booking);

        return passengerRepository.save(passenger);
    }

    @Transactional(readOnly = true)
    public List<Passenger> getPassengersByBooking(Long bookingId) {

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        if (!bookingRepository.existsById(bookingId)) {
            throw new IllegalArgumentException(
                    "Booking not found: " + bookingId);
        }

        return passengerRepository.findByBooking_Id(bookingId);
    }
}