
package com.example.demo.service;

import com.example.demo.entity.Booking;
import com.example.demo.entity.Coach;
import com.example.demo.entity.JourneySeatReservation;
import com.example.demo.entity.Train;
import com.example.demo.entity.User;

import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.CoachRepository;
import com.example.demo.repository.JourneySeatReservationRepository;
import com.example.demo.repository.TrainRepository;
import com.example.demo.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final TrainRepository trainRepository;
    private final CoachRepository coachRepository;
    private final JourneySeatReservationRepository reservationRepository;
    private final PaymentRefundService paymentRefundService;

    public BookingService(
            BookingRepository bookingRepository,
            UserRepository userRepository,
            TrainRepository trainRepository,
            CoachRepository coachRepository,
            JourneySeatReservationRepository reservationRepository,
            PaymentRefundService paymentRefundService) {

        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.trainRepository = trainRepository;
        this.coachRepository = coachRepository;
        this.reservationRepository = reservationRepository;
        this.paymentRefundService = paymentRefundService;
    }

    // ==================================================
    // CREATE BOOKING
    // ==================================================

    @Transactional
    public Booking createBooking(
            Long userId,
            Long trainId,
            Booking bookingRequest) {

        if (userId == null || trainId == null) {
            throw new IllegalArgumentException(
                    "User ID and train ID are required");
        }

        if (bookingRequest == null) {
            throw new IllegalArgumentException(
                    "Booking details are required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found"));

        Train train = trainRepository.findById(trainId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Train not found"));

        // JOURNEY DATE VALIDATION

        LocalDate journeyDate = bookingRequest.getJourneyDate();

        if (journeyDate == null) {
            throw new IllegalArgumentException(
                    "Journey date is required");
        }

        if (journeyDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException(
                    "Journey date cannot be in the past");
        }

        // PASSENGER VALIDATION

        Integer totalPassengers =
                bookingRequest.getTotalPassengers();

        if (totalPassengers == null || totalPassengers < 1) {
            throw new IllegalArgumentException(
                    "At least one passenger is required");
        }

        if (totalPassengers > 6) {
            throw new IllegalArgumentException(
                    "A booking can contain a maximum of 6 passengers");
        }

        // CLASS VALIDATION

        String classType = normalizeClass(
                bookingRequest.getClassType());

        validateSupportedClass(classType);

        List<Coach> coaches =
                coachRepository.findByTrain_Id(trainId);

        List<Coach> matchingCoaches = coaches.stream()
                .filter(this::isReservableCoach)
                .filter(coach ->
                        classType.equals(
                                normalizeClass(coach.getCoachType())))
                .toList();

        if (matchingCoaches.isEmpty()) {
            throw new IllegalArgumentException(
                    "Travel class " + classType
                            + " is not available on this train");
        }

        // CONFIGURED CAPACITY VALIDATION

        long totalCapacity = matchingCoaches.stream()
                .map(Coach::getTotalSeats)
                .filter(capacity -> capacity != null)
                .filter(capacity -> capacity > 0)
                .mapToLong(Integer::longValue)
                .sum();

        if (totalCapacity < totalPassengers) {
            throw new IllegalStateException(
                    "Not enough configured seats in class "
                            + classType);
        }

        // FARE CALCULATION

        double fare = getFarePerPassenger(classType);

        double totalAmount = fare * totalPassengers;

        // SAVE BOOKING

        bookingRequest.setUser(user);
        bookingRequest.setTrain(train);
        bookingRequest.setClassType(classType);
        bookingRequest.setTotalAmount(totalAmount);
        bookingRequest.setBookingStatus("PENDING_PAYMENT");
        bookingRequest.setBookingDate(LocalDateTime.now());
        bookingRequest.setPnr(generateUniquePnr());
        bookingRequest.setConfirmationEmailSent(false);

        return bookingRepository.save(bookingRequest);
    }

    // ==================================================
    // CHECK COACH RESERVATION PERMISSION
    // ==================================================

    private boolean isReservableCoach(Coach coach) {

        if (coach == null) {
            return false;
        }

        if (!Boolean.TRUE.equals(
                coach.getReservationAllowed())) {
            return false;
        }

        String category = normalize(
                coach.getCoachCategory());

        if (category != null
                && !"PASSENGER".equals(category)) {
            return false;
        }

        String coachType = normalizeType(
                coach.getCoachType());

        boolean nonReservable = switch (coachType) {

            case "GEN", "GENERAL", "GS", "UR",
                 "EOG", "POWER",
                 "PC", "PANTRY",
                 "SLR", "LUGGAGE",
                 "BRAKE", "SERVICE" -> true;

            default -> false;
        };

        return !nonReservable;
    }

    // ==================================================
    // SUPPORTED CLASS VALIDATION
    // ==================================================

    private void validateSupportedClass(String classType) {

        switch (classType) {

            case "1A":
            case "2A":
            case "3A":
            case "SL":
            case "CC":
            case "EC":
            case "2S":
                return;

            default:
                throw new IllegalArgumentException(
                        "Unsupported or non-reservable travel class: "
                                + classType);
        }
    }

    // ==================================================
    // FARE CALCULATION
    // ==================================================

    private double getFarePerPassenger(String classType) {

        return switch (classType) {

            case "1A" -> 2000.00;
            case "2A" -> 1500.00;
            case "3A" -> 1000.00;
            case "SL" -> 500.00;
            case "CC" -> 400.00;
            case "EC" -> 800.00;
            case "2S" -> 200.00;

            default -> throw new IllegalArgumentException(
                    "Unsupported travel class: " + classType);
        };
    }

    // ==================================================
    // CLASS NORMALIZATION
    // ==================================================

    private String normalizeClass(String value) {

        if (value == null || value.isBlank()) {
            return "";
        }

        String normalized = normalizeType(value);

        return switch (normalized) {

            case "SL", "SLEEPER" -> "SL";

            case "1A", "ACFIRST",
                 "FIRSTAC", "FIRSTCLASSAC" -> "1A";

            case "2A", "AC2TIER",
                 "SECONDAC" -> "2A";

            case "3A", "AC3TIER",
                 "THIRDAC" -> "3A";

            case "CC", "CHAIRCAR" -> "CC";

            case "EC", "EXECUTIVECHAIRCAR" -> "EC";

            case "2S", "SECONDSITTING",
                 "SECONDSEATING" -> "2S";

            default -> normalized;
        };
    }

    // ==================================================
    // GENERATE UNIQUE PNR
    // ==================================================

    private String generateUniquePnr() {

        for (int attempt = 0; attempt < 20; attempt++) {

            long number = ThreadLocalRandom.current()
                    .nextLong(
                            1_000_000_000L,
                            10_000_000_000L
                    );

            String pnr = String.valueOf(number);

            if (bookingRepository.findByPnr(pnr).isEmpty()) {
                return pnr;
            }
        }

        throw new IllegalStateException(
                "Unable to generate a unique PNR. Please try again.");
    }

    // ==================================================
    // GET ALL BOOKINGS
    // ==================================================

    @Transactional(readOnly = true)
    public List<Booking> getAllBookings() {

        return bookingRepository.findAll();
    }

    // ==================================================
    // GET BOOKING BY ID
    // ==================================================

    @Transactional(readOnly = true)
    public Booking getBookingById(Long id) {

        if (id == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        return bookingRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Booking not found with ID: " + id));
    }

    // ==================================================
    // GET BOOKING BY PNR
    // ==================================================

    @Transactional(readOnly = true)
    public Booking getBookingByPnr(String pnr) {

        if (pnr == null || pnr.isBlank()) {
            throw new IllegalArgumentException(
                    "PNR is required");
        }

        return bookingRepository.findByPnr(pnr.trim())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No booking found for this PNR"));
    }

    // ==================================================
    // GET USER BOOKINGS
    // ==================================================

    @Transactional(readOnly = true)
    public List<Booking> getUserBookings(Long userId) {

        if (userId == null) {
            throw new IllegalArgumentException(
                    "User ID is required");
        }

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException(
                    "User not found");
        }

        return bookingRepository
                .findByUser_IdOrderByBookingDateDesc(userId);
    }

    // ==================================================
    // CANCEL BOOKING + INITIATE REFUND
    // ==================================================

    @Transactional
    public Booking cancelBooking(Long bookingId) {

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Booking not found"));

        String currentStatus =
                booking.getBookingStatus();

        if ("CANCELLED".equalsIgnoreCase(currentStatus)) {
            throw new IllegalStateException(
                    "Booking is already cancelled");
        }

        if ("PENDING_PAYMENT".equalsIgnoreCase(currentStatus)) {

            // Do not cancel if a payment attempt may have
            // succeeded without local verification.

            paymentRefundService
                    .ensureNoCapturedPaymentForPendingBooking(bookingId);

        } else if ("CONFIRMED".equalsIgnoreCase(currentStatus)) {

            // A confirmed paid booking must have its
            // full Razorpay refund accepted or processed
            // before cancellation and seat release.

            paymentRefundService
                    .initiateFullRefundForBooking(bookingId);

        } else {

            throw new IllegalStateException(
                    "This booking cannot be cancelled "
                            + "in its current status");
        }

        // Only reach here after refund safety checks succeed.

        booking.setBookingStatus("CANCELLED");

        // Cancel confirmed and pending seat reservations.

        List<JourneySeatReservation> reservations =
                reservationRepository.findByBooking_Id(bookingId);

        for (JourneySeatReservation reservation : reservations) {

            String reservationStatus =
                    reservation.getReservationStatus();

            if ("CONFIRMED".equalsIgnoreCase(reservationStatus)
                    || "PENDING".equalsIgnoreCase(reservationStatus)) {

                reservation.setReservationStatus("CANCELLED");
            }
        }

        reservationRepository.saveAll(reservations);

        return bookingRepository.save(booking);
    }

    // ==================================================
    // NORMALIZATION HELPERS
    // ==================================================

    private String normalize(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeType(String value) {

        if (value == null || value.isBlank()) {
            return "";
        }

        return value.trim()
                .toUpperCase(Locale.ROOT)
                .replace(" ", "")
                .replace("-", "")
                .replace("_", "");
    }
}
