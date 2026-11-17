
package com.example.demo.service;

import com.example.demo.entity.Booking;
import com.example.demo.entity.Coach;
import com.example.demo.entity.JourneySeatReservation;
import com.example.demo.entity.Passenger;
import com.example.demo.entity.Seat;
import com.example.demo.entity.TrainStop;

import com.example.demo.repository.BookingRepository;
import com.example.demo.repository.CoachRepository;
import com.example.demo.repository.JourneySeatReservationRepository;
import com.example.demo.repository.PassengerRepository;
import com.example.demo.repository.SeatRepository;
import com.example.demo.repository.TrainRepository;
import com.example.demo.repository.TrainStopRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
public class JourneySeatReservationService {

    private final JourneySeatReservationRepository reservationRepository;
    private final BookingRepository bookingRepository;
    private final PassengerRepository passengerRepository;
    private final SeatRepository seatRepository;
    private final CoachRepository coachRepository;
    private final TrainRepository trainRepository;
    private final TrainStopRepository trainStopRepository;

    public JourneySeatReservationService(
            JourneySeatReservationRepository reservationRepository,
            BookingRepository bookingRepository,
            PassengerRepository passengerRepository,
            SeatRepository seatRepository,
            CoachRepository coachRepository,
            TrainRepository trainRepository,
            TrainStopRepository trainStopRepository) {

        this.reservationRepository = reservationRepository;
        this.bookingRepository = bookingRepository;
        this.passengerRepository = passengerRepository;
        this.seatRepository = seatRepository;
        this.coachRepository = coachRepository;
        this.trainRepository = trainRepository;
        this.trainStopRepository = trainStopRepository;
    }

    // ==================================================
    // CHECK SEAT AVAILABILITY
    // ==================================================

    @Transactional(readOnly = true)
    public boolean isSeatAvailable(
            Long trainId,
            Long seatId,
            LocalDate journeyDate,
            Integer fromStopOrder,
            Integer toStopOrder) {

        if (trainId == null || seatId == null) {
            throw new IllegalArgumentException(
                    "Train ID and seat ID are required");
        }

        validateJourney(
                journeyDate,
                fromStopOrder,
                toStopOrder
        );

        if (!trainRepository.existsById(trainId)) {
            throw new IllegalArgumentException(
                    "Train not found: " + trainId);
        }

        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Seat not found: " + seatId));

        validateSeatBelongsToTrain(seat, trainId);
        validateReservableCoach(seat.getCoach());
        validateSeatStatus(seat);

        validateRouteStops(
                trainId,
                fromStopOrder,
                toStopOrder
        );

        return reservationRepository.findOverlappingReservations(
                trainId,
                seatId,
                journeyDate,
                fromStopOrder,
                toStopOrder
        ).isEmpty();
    }

    // ==================================================
    // MANUAL SEAT RESERVATION
    // ==================================================

    @Transactional
    public JourneySeatReservation reserveSeat(
            Long bookingId,
            Long seatId,
            Integer fromStopOrder,
            Integer toStopOrder) {

        Booking booking = getConfirmedBooking(bookingId);

        validateJourney(
                booking.getJourneyDate(),
                fromStopOrder,
                toStopOrder
        );

        Long trainId = booking.getTrain().getId();

        validateRouteStops(
                trainId,
                fromStopOrder,
                toStopOrder
        );

        List<Passenger> passengers =
                passengerRepository.findByBooking_Id(bookingId);

        if (passengers.isEmpty()) {
            throw new IllegalStateException(
                    "No passengers found for this booking");
        }

        List<JourneySeatReservation> existingReservations =
                reservationRepository.findByBooking_Id(bookingId);

        Set<Long> assignedPassengerIds =
                getAssignedPassengerIds(existingReservations);

        Passenger passenger = passengers.stream()
                .filter(p ->
                        !assignedPassengerIds.contains(p.getId()))
                .findFirst()
                .orElseThrow(() ->
                        new IllegalStateException(
                                "All passengers already have active reservations"));

        // Lock selected seat before checking availability.
        Seat seat = lockSeat(seatId);

        validateSeatForBooking(booking, seat);

        return createReservation(
                booking,
                passenger,
                seat,
                fromStopOrder,
                toStopOrder
        );
    }

    // ==================================================
    // AUTOMATIC SEAT ALLOCATION
    // ==================================================

    @Transactional
    public List<JourneySeatReservation> autoAllocateSeats(
            Long bookingId,
            Integer fromStopOrder,
            Integer toStopOrder) {

        Booking booking = getConfirmedBooking(bookingId);

        Long trainId = booking.getTrain().getId();
        LocalDate journeyDate = booking.getJourneyDate();

        validateJourney(
                journeyDate,
                fromStopOrder,
                toStopOrder
        );

        validateRouteStops(
                trainId,
                fromStopOrder,
                toStopOrder
        );

        List<Passenger> passengers =
                passengerRepository.findByBooking_Id(bookingId);

        if (passengers.isEmpty()) {
            throw new IllegalStateException(
                    "No passengers found for this booking");
        }

        List<JourneySeatReservation> existingReservations =
                reservationRepository.findByBooking_Id(bookingId);

        Set<Long> assignedPassengerIds =
                getAssignedPassengerIds(existingReservations);

        List<Passenger> unassignedPassengers =
                passengers.stream()
                        .filter(p ->
                                !assignedPassengerIds.contains(p.getId()))
                        .toList();

        // Handle repeated allocation requests safely.
        if (unassignedPassengers.isEmpty()) {

            List<JourneySeatReservation> activeReservations =
                    existingReservations.stream()
                            .filter(this::isActiveReservation)
                            .toList();

            if (!activeReservations.isEmpty()) {
                return activeReservations;
            }

            throw new IllegalStateException(
                    "No unassigned passengers found");
        }

        String requestedClass =
                normalizeClass(booking.getClassType());

        // Fetch coaches in physical formation order.
        List<Coach> coaches =
                coachRepository
                        .findByTrain_IdOrderByCoachPositionAsc(trainId);

        List<Coach> matchingCoaches = coaches.stream()
                .filter(this::isCoachReservable)
                .filter(coach ->
                        sameClass(
                                requestedClass,
                                coach.getCoachType()))
                .toList();

        if (matchingCoaches.isEmpty()) {
            throw new IllegalStateException(
                    "No reservable coaches found for class: "
                            + requestedClass);
        }

        // Collect possible seats.
        List<Seat> candidates = new ArrayList<>();

        for (Coach coach : matchingCoaches) {

            List<Seat> coachSeats =
                    seatRepository
                            .findByCoach_IdOrderBySeatNumberAsc(
                                    coach.getId());

            for (Seat seat : coachSeats) {

                if (seat.getSeatStatus() == null
                        || !"AVAILABLE".equalsIgnoreCase(
                                seat.getSeatStatus().trim())) {
                    continue;
                }

                boolean available = isSeatAvailable(
                        trainId,
                        seat.getId(),
                        journeyDate,
                        fromStopOrder,
                        toStopOrder
                );

                if (available) {
                    candidates.add(seat);
                }
            }
        }

        // First use earlier coaches, then lower seat numbers.
        candidates.sort(
                Comparator
                        .comparing(
                                (Seat seat) ->
                                        seat.getCoach().getCoachPosition(),
                                Comparator.nullsLast(
                                        Integer::compareTo))
                        .thenComparing(
                                Seat::getSeatNumber,
                                Comparator.nullsLast(
                                        Integer::compareTo))
        );

        if (candidates.size() < unassignedPassengers.size()) {
            throw new IllegalStateException(
                    "Not enough seats available for all passengers");
        }

        List<JourneySeatReservation> createdReservations =
                new ArrayList<>();

        Set<Long> lockedSeatIds = new HashSet<>();

        int candidateIndex = 0;

        // Lock and recheck every selected seat before saving.
        for (Passenger passenger : unassignedPassengers) {

            boolean allocated = false;

            while (candidateIndex < candidates.size()) {

                Seat candidate = candidates.get(candidateIndex++);

                // Never try the same seat twice in one allocation.
                if (!lockedSeatIds.add(candidate.getId())) {
                    continue;
                }

                Seat lockedSeat = lockSeat(candidate.getId());

                try {

                    validateSeatForBooking(booking, lockedSeat);

                } catch (IllegalArgumentException
                         | IllegalStateException ex) {

                    // This candidate is no longer suitable.
                    continue;
                }

                // Recheck overlapping reservations while holding
                // the seat row lock.
                boolean stillAvailable =
                        reservationRepository
                                .findOverlappingReservations(
                                        trainId,
                                        lockedSeat.getId(),
                                        journeyDate,
                                        fromStopOrder,
                                        toStopOrder
                                ).isEmpty();

                if (!stillAvailable) {
                    continue;
                }

                JourneySeatReservation reservation =
                        buildReservation(
                                booking,
                                passenger,
                                lockedSeat,
                                fromStopOrder,
                                toStopOrder
                        );

                createdReservations.add(
                        reservationRepository.save(reservation)
                );

                allocated = true;
                break;
            }

            if (!allocated) {
                throw new IllegalStateException(
                        "Unable to allocate seats for all passengers. "
                                + "The reservation transaction was cancelled.");
            }
        }

        return createdReservations;
    }

    // ==================================================
    // GET CONFIRMED BOOKING
    // ==================================================

    private Booking getConfirmedBooking(Long bookingId) {

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Booking not found: " + bookingId));

        if (!"CONFIRMED".equalsIgnoreCase(
                booking.getBookingStatus())) {

            throw new IllegalStateException(
                    "Only CONFIRMED bookings can reserve seats");
        }

        if (booking.getTrain() == null
                || booking.getJourneyDate() == null) {

            throw new IllegalStateException(
                    "Booking must have a train and journey date");
        }

        return booking;
    }

    // ==================================================
    // LOCK SEAT
    // ==================================================

    private Seat lockSeat(Long seatId) {

        if (seatId == null) {
            throw new IllegalArgumentException(
                    "Seat ID is required");
        }

        return seatRepository.findByIdForUpdate(seatId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Seat not found: " + seatId));
    }

    // ==================================================
    // VALIDATE SEAT FOR BOOKING
    // ==================================================

    private void validateSeatForBooking(
            Booking booking,
            Seat seat) {

        Long trainId = booking.getTrain().getId();

        validateSeatBelongsToTrain(seat, trainId);
        validateReservableCoach(seat.getCoach());
        validateSeatStatus(seat);

        String requestedClass =
                normalizeClass(booking.getClassType());

        String actualClass =
                normalizeClass(seat.getCoach().getCoachType());

        if (!requestedClass.equals(actualClass)) {

            throw new IllegalArgumentException(
                    "Selected seat belongs to class "
                            + actualClass
                            + ", but booking class is "
                            + requestedClass);
        }
    }

    // ==================================================
    // COACH RESERVATION PERMISSION
    // ==================================================

    private void validateReservableCoach(Coach coach) {

        if (coach == null) {
            throw new IllegalArgumentException(
                    "Seat does not belong to a valid coach");
        }

        if (!isCoachReservable(coach)) {
            throw new IllegalStateException(
                    "Reservations are not allowed in coach "
                            + coach.getCoachNumber()
                            + " (" + coach.getCoachType() + ")");
        }
    }

    private boolean isCoachReservable(Coach coach) {

        if (coach == null) {
            return false;
        }

        if (!Boolean.TRUE.equals(
                coach.getReservationAllowed())) {
            return false;
        }

        String category = normalize(coach.getCoachCategory());

        // A known category other than PASSENGER is not reservable.
        if (category != null && !"PASSENGER".equals(category)) {
            return false;
        }

        // Protect legacy coaches whose category is still null.
        String type = normalizeType(coach.getCoachType());

        return !switch (type) {

            case "GEN", "GENERAL", "GS", "UR",
                    "EOG", "POWER",
                    "PC", "PANTRY",
                    "SLR", "LUGGAGE",
                    "BRAKE", "SERVICE" -> true;

            default -> false;
        };
    }

    // ==================================================
    // SEAT STATUS VALIDATION
    // ==================================================

    private void validateSeatStatus(Seat seat) {

        if (seat.getSeatStatus() == null
                || !"AVAILABLE".equalsIgnoreCase(
                        seat.getSeatStatus().trim())) {

            throw new IllegalStateException(
                    "Seat " + seat.getSeatNumber()
                            + " is not available for reservation");
        }
    }

    // ==================================================
    // CHECK SEAT BELONGS TO TRAIN
    // ==================================================

    private void validateSeatBelongsToTrain(
            Seat seat,
            Long trainId) {

        if (seat == null
                || seat.getCoach() == null
                || seat.getCoach().getTrain() == null
                || !Objects.equals(
                        seat.getCoach().getTrain().getId(),
                        trainId)) {

            throw new IllegalArgumentException(
                    "Selected seat does not belong to this train");
        }
    }

    // ==================================================
    // ACTIVE RESERVATION HELPERS
    // ==================================================

    private boolean isActiveReservation(
            JourneySeatReservation reservation) {

        if (reservation == null
                || reservation.getReservationStatus() == null) {
            return false;
        }

        String status = reservation.getReservationStatus()
                .trim()
                .toUpperCase(Locale.ROOT);

        return status.equals("CONFIRMED")
                || status.equals("PENDING");
    }

    private Set<Long> getAssignedPassengerIds(
            List<JourneySeatReservation> reservations) {

        Set<Long> assignedIds = new HashSet<>();

        for (JourneySeatReservation reservation : reservations) {

            if (!isActiveReservation(reservation)) {
                continue;
            }

            if (reservation.getPassenger() != null
                    && reservation.getPassenger().getId() != null) {

                assignedIds.add(
                        reservation.getPassenger().getId());
            }
        }

        return assignedIds;
    }

    // ==================================================
    // CREATE RESERVATION
    // ==================================================

    private JourneySeatReservation createReservation(
            Booking booking,
            Passenger passenger,
            Seat seat,
            Integer fromStopOrder,
            Integer toStopOrder) {

        Long trainId = booking.getTrain().getId();

        validateSeatForBooking(booking, seat);

        boolean available = reservationRepository
                .findOverlappingReservations(
                        trainId,
                        seat.getId(),
                        booking.getJourneyDate(),
                        fromStopOrder,
                        toStopOrder
                ).isEmpty();

        if (!available) {
            throw new IllegalStateException(
                    "Seat is already reserved for an overlapping journey");
        }

        JourneySeatReservation reservation =
                buildReservation(
                        booking,
                        passenger,
                        seat,
                        fromStopOrder,
                        toStopOrder
                );

        return reservationRepository.save(reservation);
    }

    // ==================================================
    // BUILD RESERVATION
    // ==================================================

    private JourneySeatReservation buildReservation(
            Booking booking,
            Passenger passenger,
            Seat seat,
            Integer fromStopOrder,
            Integer toStopOrder) {

        JourneySeatReservation reservation =
                new JourneySeatReservation();

        reservation.setBooking(booking);
        reservation.setPassenger(passenger);
        reservation.setTrain(booking.getTrain());
        reservation.setSeat(seat);
        reservation.setJourneyDate(booking.getJourneyDate());
        reservation.setFromStopOrder(fromStopOrder);
        reservation.setToStopOrder(toStopOrder);
        reservation.setReservationStatus("CONFIRMED");

        return reservation;
    }

    // ==================================================
    // GET RESERVATIONS BY BOOKING
    // ==================================================

    @Transactional(readOnly = true)
    public List<JourneySeatReservation> getReservationsByBooking(
            Long bookingId) {

        if (bookingId == null) {
            throw new IllegalArgumentException(
                    "Booking ID is required");
        }

        return reservationRepository.findByBooking_Id(bookingId);
    }

    // ==================================================
    // GET RESERVATIONS BY TRAIN AND DATE
    // ==================================================

    @Transactional(readOnly = true)
    public List<JourneySeatReservation> getReservationsByTrainAndDate(
            Long trainId,
            LocalDate journeyDate) {

        if (trainId == null || journeyDate == null) {
            throw new IllegalArgumentException(
                    "Train ID and journey date are required");
        }

        return reservationRepository
                .findByTrain_IdAndJourneyDate(
                        trainId,
                        journeyDate
                );
    }

    // ==================================================
    // JOURNEY VALIDATION
    // ==================================================

    private void validateJourney(
            LocalDate journeyDate,
            Integer fromStopOrder,
            Integer toStopOrder) {

        if (journeyDate == null) {
            throw new IllegalArgumentException(
                    "Journey date is required");
        }

        if (fromStopOrder == null || toStopOrder == null) {
            throw new IllegalArgumentException(
                    "Source and destination stop orders are required");
        }

        if (fromStopOrder >= toStopOrder) {
            throw new IllegalArgumentException(
                    "Source stop must be before destination stop");
        }
    }

    // ==================================================
    // ROUTE STOP VALIDATION
    // ==================================================

    private void validateRouteStops(
            Long trainId,
            Integer fromStopOrder,
            Integer toStopOrder) {

        List<TrainStop> stops =
                trainStopRepository
                        .findByTrain_IdOrderByStopOrderAsc(trainId);

        if (stops == null || stops.isEmpty()) {
            throw new IllegalStateException(
                    "No route stops configured for train: " + trainId);
        }

        boolean sourceExists = stops.stream()
                .anyMatch(stop ->
                        Objects.equals(
                                stop.getStopOrder(),
                                fromStopOrder));

        boolean destinationExists = stops.stream()
                .anyMatch(stop ->
                        Objects.equals(
                                stop.getStopOrder(),
                                toStopOrder));

        if (!sourceExists || !destinationExists) {
            throw new IllegalArgumentException(
                    "Invalid source or destination stop order");
        }
    }

    // ==================================================
    // TRAVEL CLASS NORMALIZATION
    // ==================================================

    private String normalizeClass(String value) {

        if (value == null || value.isBlank()) {
            return "";
        }

        String normalized = value.trim()
                .toUpperCase(Locale.ROOT)
                .replace(" ", "")
                .replace("-", "")
                .replace("_", "");

        return switch (normalized) {

            case "SL", "SLEEPER" -> "SL";

            case "1A", "FIRSTAC",
                    "FIRSTCLASSAC", "ACFIRST" -> "1A";

            case "2A", "SECONDAC", "AC2TIER" -> "2A";

            case "3A", "THIRDAC", "AC3TIER" -> "3A";

            case "CC", "CHAIRCAR" -> "CC";

            case "EC", "EXECUTIVECHAIRCAR" -> "EC";

            case "2S", "SECONDSEATING",
                    "SECONDSEATINGCLASS" -> "2S";

            default -> normalized;
        };
    }

    private boolean sameClass(
            String requestedClass,
            String coachType) {

        return normalizeClass(requestedClass)
                .equals(normalizeClass(coachType));
    }

    // ==================================================
    // GENERAL STRING NORMALIZATION
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
