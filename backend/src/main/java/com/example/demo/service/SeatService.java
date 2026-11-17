
package com.example.demo.service;

import com.example.demo.entity.Coach;
import com.example.demo.entity.JourneySeatReservation;
import com.example.demo.entity.Seat;
import com.example.demo.repository.CoachRepository;
import com.example.demo.repository.JourneySeatReservationRepository;
import com.example.demo.repository.SeatRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class SeatService {

    private final SeatRepository seatRepository;
    private final CoachRepository coachRepository;
    private final JourneySeatReservationRepository reservationRepository;

    public SeatService(
            SeatRepository seatRepository,
            CoachRepository coachRepository,
            JourneySeatReservationRepository reservationRepository) {

        this.seatRepository = seatRepository;
        this.coachRepository = coachRepository;
        this.reservationRepository = reservationRepository;
    }

    private record SeatLayout(
            List<String> berthTypes,
            List<String> labelCodes,
            List<Integer> rowOffsets,
            List<Integer> columnOffsets,
            boolean singleRow,
            String labelStyle) {
    }

    // ==================================================
    // ADD SEAT
    // ==================================================

    @Transactional
    public Seat addSeat(Long coachId, Seat seat) {

        if (coachId == null || seat == null) {
            throw new IllegalArgumentException(
                    "Coach ID and seat details are required");
        }

        Coach coach = coachRepository.findById(coachId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Coach not found with ID: " + coachId));

        validateSeatDetails(seat);
        ensureSeatInventoryAllowed(coach);

        if (seat.getSeatNumber() > coach.getTotalSeats()) {
            throw new IllegalArgumentException(
                    "Seat number cannot exceed configured coach capacity");
        }

        if (seatRepository.existsByCoach_IdAndSeatNumber(
                coachId, seat.getSeatNumber())) {

            throw new IllegalArgumentException(
                    "This seat number already exists in the selected coach");
        }

        seat.setCoach(coach);
        seat.setSeatStatus("AVAILABLE");

        applyLayout(seat, coach, true);

        return seatRepository.save(seat);
    }

    // ==================================================
    // GET SEATS
    // ==================================================

    @Transactional(readOnly = true)
    public List<Seat> getAllSeats() {
        return seatRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Seat> getSeatsByCoach(Long coachId) {

        if (!coachRepository.existsById(coachId)) {
            throw new IllegalArgumentException(
                    "Coach not found with ID: " + coachId);
        }

        return seatRepository
                .findByCoach_IdOrderBySeatNumberAsc(coachId);
    }

    @Transactional(readOnly = true)
    public Seat getSeatById(Long seatId) {

        return seatRepository.findById(seatId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Seat not found with ID: " + seatId));
    }

    // ==================================================
    // UPDATE SEAT
    // ==================================================

    @Transactional
    public Seat updateSeat(Long seatId, Seat updatedSeat) {

        if (updatedSeat == null) {
            throw new IllegalArgumentException(
                    "Updated seat details are required");
        }

        Seat existingSeat = getSeatById(seatId);
        Coach coach = existingSeat.getCoach();

        validateSeatDetails(updatedSeat);
        ensureSeatInventoryAllowed(coach);

        if (updatedSeat.getSeatNumber() > coach.getTotalSeats()) {
            throw new IllegalArgumentException(
                    "Seat number cannot exceed configured coach capacity");
        }

        if (hasActiveReservations(existingSeat)) {
            throw new IllegalStateException(
                    "Cannot update a seat that has an active reservation");
        }

        Long coachId = coach.getId();

        boolean duplicate = seatRepository
                .findByCoach_IdAndSeatNumber(
                        coachId, updatedSeat.getSeatNumber())
                .filter(seat -> !seat.getId().equals(seatId))
                .isPresent();

        if (duplicate) {
            throw new IllegalArgumentException(
                    "This seat number already exists in the selected coach");
        }

        existingSeat.setSeatNumber(updatedSeat.getSeatNumber());

        existingSeat.setBerthType(
                updatedSeat.getBerthType()
                        .trim().toUpperCase(Locale.ROOT));

        applyLayoutPosition(existingSeat, coach);

        return seatRepository.save(existingSeat);
    }

    // ==================================================
    // DELETE SEAT
    // ==================================================

    @Transactional
    public void deleteSeat(Long seatId) {

        Seat seat = getSeatById(seatId);

        if (hasActiveReservations(seat)) {
            throw new IllegalStateException(
                    "Cannot delete a seat that has an active reservation");
        }

        seatRepository.delete(seat);
    }

    // ==================================================
    // ACTIVE RESERVATION CHECK
    // ==================================================

    private boolean hasActiveReservations(Seat seat) {

        if ("BOOKED".equalsIgnoreCase(seat.getSeatStatus())) {
            return true;
        }

        List<JourneySeatReservation> reservations =
                reservationRepository.findBySeat_Id(seat.getId());

        return reservations.stream().anyMatch(reservation -> {

            String status = reservation.getReservationStatus();

            return "CONFIRMED".equalsIgnoreCase(status)
                    || "PENDING".equalsIgnoreCase(status);
        });
    }

    // ==================================================
    // GENERATE MISSING SEATS + SAFE LAYOUT MIGRATION
    // ==================================================

    @Transactional
    public Map<String, Object> generateMissingSeats(Long coachId) {

        Coach coach = coachRepository.findById(coachId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Coach not found with ID: " + coachId));

        ensureSeatInventoryAllowed(coach);

        Integer totalSeats = coach.getTotalSeats();

        if (totalSeats == null || totalSeats <= 0) {
            throw new IllegalArgumentException(
                    "Coach totalSeats must be greater than zero");
        }

        SeatLayout layout = getLayout(coach);

        List<Seat> existingSeats =
                seatRepository.findByCoach_Id(coachId);

        Set<Integer> existingNumbers = new HashSet<>();

        List<Seat> updatedExistingSeats = new ArrayList<>();

        String coachType = normalizeType(coach.getCoachType());

        boolean isTwoTierCoach =
                coachType.equals("2A")
                        || coachType.equals("AC2TIER");

        boolean hasStoredBerthTypes = existingSeats.stream()
                .anyMatch(seat ->
                        seat.getBerthType() != null
                                && !seat.getBerthType().isBlank());

        // OLD 2A PATTERN
        // LOWER, UPPER, SIDE_LOWER, SIDE_UPPER
        List<String> legacyTwoTierPattern = Arrays.asList(
                "LOWER",
                "UPPER",
                "SIDE_LOWER",
                "SIDE_UPPER"
        );

        // Detect the existing and new 2A patterns.
        boolean legacyTwoTierMigration =
                isTwoTierCoach
                        && matchesBerthPattern(
                                existingSeats,
                                legacyTwoTierPattern
                        );

        boolean currentTwoTierPattern =
                isTwoTierCoach
                        && matchesBerthPattern(
                                existingSeats,
                                layout.berthTypes()
                        );

        // Never guess if the stored 2A data is inconsistent.
        if (isTwoTierCoach
                && hasStoredBerthTypes
                && !legacyTwoTierMigration
                && !currentTwoTierPattern) {

            throw new IllegalStateException(
                    "Existing 2A berth data does not match either "
                            + "the legacy or current layout. "
                            + "Automatic migration stopped to "
                            + "protect seat information.");
        }

        // IMPORTANT:
        // Check ALL existing seats before modifying ANY seat.
        // If one seat has an active reservation, migration stops.
        if (legacyTwoTierMigration) {

            for (Seat seat : existingSeats) {

                if (hasActiveReservations(seat)) {

                    throw new IllegalStateException(
                            "Cannot migrate this 2A coach layout. Seat "
                                    + seat.getSeatNumber()
                                    + " has an active reservation. "
                                    + "No seats were modified.");
                }
            }
        }

        // Update existing seats.
        for (Seat seat : existingSeats) {

            Integer existingNumber = seat.getSeatNumber();

            if (existingNumber == null || existingNumber <= 0) {
                continue;
            }

            existingNumbers.add(existingNumber);

            boolean changed;

            if (legacyTwoTierMigration) {

                // Convert old four-berth pattern into
                // the new six-berth pattern.
                //
                // Existing ID, seat number and seat status
                // are preserved.
                applyLayout(seat, coach, true);

                changed = true;

            } else {

                // For other coaches, preserve existing berth types.
                // Only fill missing layout metadata.
                changed = applyMissingLayoutMetadata(seat, coach);
            }

            if (changed) {
                updatedExistingSeats.add(seat);
            }
        }

        if (!updatedExistingSeats.isEmpty()) {
            seatRepository.saveAll(updatedExistingSeats);
        }

        // Generate only genuinely missing seat records.
        List<Seat> missingSeats = new ArrayList<>();

        for (int number = 1; number <= totalSeats; number++) {

            if (existingNumbers.contains(number)) {
                continue;
            }

            Seat seat = new Seat();

            seat.setCoach(coach);
            seat.setSeatNumber(number);
            seat.setSeatStatus("AVAILABLE");

            applyLayout(seat, coach, true);

            missingSeats.add(seat);
        }

        if (!missingSeats.isEmpty()) {
            seatRepository.saveAll(missingSeats);
        }

        int totalSeatsNow =
                seatRepository.findByCoach_Id(coachId).size();

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("coachId", coachId);
        response.put("coachNumber", coach.getCoachNumber());
        response.put("coachType", coach.getCoachType());
        response.put("coachCategory", coach.getCoachCategory());

        response.put(
                "reservationAllowed",
                coach.getReservationAllowed()
        );

        response.put("configuredSeats", totalSeats);
        response.put(
                "previouslyExistingSeats",
                existingSeats.size()
        );

        response.put(
                "existingSeatsUpdatedForLayout",
                updatedExistingSeats.size()
        );

        response.put("newSeatsCreated", missingSeats.size());
        response.put("totalSeatsNow", totalSeatsNow);

        response.put(
                "layoutMigration",
                legacyTwoTierMigration
                        ? "LEGACY_2A_FOUR_BERTH_TO_SIX_BERTH"
                        : "NOT_REQUIRED"
        );

        response.put(
                "message",
                "Missing seats generated successfully"
        );

        return response;
    }

    // ==================================================
    // DETECT EXISTING BERTH PATTERN
    // ==================================================

    private boolean matchesBerthPattern(
            List<Seat> seats,
            List<String> expectedPattern) {

        boolean foundBerthType = false;

        for (Seat seat : seats) {

            Integer seatNumber = seat.getSeatNumber();

            if (seatNumber == null || seatNumber <= 0) {
                continue;
            }

            String actualBerthType =
                    normalize(seat.getBerthType());

            if (actualBerthType == null) {
                continue;
            }

            foundBerthType = true;

            int patternIndex =
                    (seatNumber - 1) % expectedPattern.size();

            String expectedBerthType =
                    expectedPattern.get(patternIndex);

            if (!actualBerthType.equals(expectedBerthType)) {
                return false;
            }
        }

        return foundBerthType;
    }

    // ==================================================
    // COACH VALIDATION
    // ==================================================

    private void ensureSeatInventoryAllowed(Coach coach) {

        String category = normalize(coach.getCoachCategory());
        String type = normalizeType(coach.getCoachType());

        if (category != null) {

            switch (category) {

                case "PANTRY":
                case "LUGGAGE":
                case "BRAKE":
                case "POWER":
                case "SERVICE":

                    throw new IllegalArgumentException(
                            "Passenger seats cannot be generated for "
                                    + category + " coaches");

                case "PASSENGER":
                case "GENERAL":
                    break;

                default:
                    throw new IllegalArgumentException(
                            "Unsupported coach category: " + category);
            }
        }

        // Compatibility with older coaches whose category is null.
        if (isServiceCoachType(type)) {
            throw new IllegalArgumentException(
                    "Passenger seats cannot be generated "
                            + "for service coaches");
        }
    }

    private boolean isServiceCoachType(String type) {

        return switch (type) {

            case "PC", "PANTRY",
                    "SLR", "LUGGAGE",
                    "BRAKE",
                    "EOG", "POWER",
                    "SERVICE" -> true;

            default -> false;
        };
    }

    // ==================================================
    // SEAT LAYOUT DEFINITIONS
    // ==================================================

    private SeatLayout getLayout(Coach coach) {

        String type = normalizeType(coach.getCoachType());

        switch (type) {

            // SLEEPER AND AC 3 TIER
            case "SL":
            case "SLEEPER":
            case "3A":
            case "AC3TIER":

                return new SeatLayout(

                        Arrays.asList(
                                "LOWER", "MIDDLE", "UPPER",
                                "LOWER", "MIDDLE", "UPPER",
                                "SIDE_LOWER", "SIDE_UPPER"
                        ),

                        Arrays.asList(
                                "LB", "MB", "UB",
                                "LB", "MB", "UB",
                                "SL", "SU"
                        ),

                        Arrays.asList(
                                1, 1, 1, 2, 2, 2, 1, 2
                        ),

                        Arrays.asList(
                                1, 2, 3, 1, 2, 3, 4, 4
                        ),

                        false,
                        "BERTH"
                );

            // AC 2 TIER: NEW SIX-BERTH PATTERN
            case "2A":
            case "AC2TIER":

                return new SeatLayout(

                        Arrays.asList(
                                "LOWER", "UPPER",
                                "LOWER", "UPPER",
                                "SIDE_LOWER", "SIDE_UPPER"
                        ),

                        Arrays.asList(
                                "LB", "UB",
                                "LB", "UB",
                                "SL", "SU"
                        ),

                        Arrays.asList(
                                1, 1, 2, 2, 1, 2
                        ),

                        Arrays.asList(
                                1, 2, 1, 2, 3, 3
                        ),

                        false,
                        "BERTH"
                );

            // AC FIRST CLASS
            case "1A":
            case "ACFIRST":
            case "ACFIRSTCLASS":

                return new SeatLayout(

                        Arrays.asList(
                                "LOWER", "UPPER",
                                "LOWER", "UPPER"
                        ),

                        Arrays.asList(
                                "LB", "UB", "LB", "UB"
                        ),

                        Arrays.asList(
                                1, 1, 2, 2
                        ),

                        Arrays.asList(
                                1, 2, 1, 2
                        ),

                        false,
                        "COMPARTMENT"
                );

            // CHAIR CAR AND SECOND SITTING
            case "CC":
            case "CHAIRCAR":
            case "2S":
            case "SECONDSITTING":

                return new SeatLayout(

                        Arrays.asList(
                                "WINDOW", "MIDDLE", "AISLE",
                                "AISLE", "WINDOW"
                        ),

                        Arrays.asList(
                                "A", "B", "C", "D", "E"
                        ),

                        Arrays.asList(
                                1, 1, 1, 1, 1
                        ),

                        Arrays.asList(
                                1, 2, 3, 5, 6
                        ),

                        true,
                        "CHAIR"
                );

            // EXECUTIVE CHAIR CAR
            case "EC":
            case "EXECUTIVECHAIRCAR":

                return new SeatLayout(

                        Arrays.asList(
                                "WINDOW", "AISLE",
                                "AISLE", "WINDOW"
                        ),

                        Arrays.asList(
                                "A", "B", "C", "D"
                        ),

                        Arrays.asList(
                                1, 1, 1, 1
                        ),

                        Arrays.asList(
                                1, 2, 5, 6
                        ),

                        true,
                        "CHAIR"
                );

            // GENERAL UNRESERVED COACH
            case "GEN":
            case "GENERAL":
            case "GS":
            case "UR":

                return new SeatLayout(

                        Arrays.asList(
                                "BENCH", "BENCH", "BENCH",
                                "BENCH", "BENCH", "BENCH"
                        ),

                        Arrays.asList(
                                "B1", "B2", "B3",
                                "B4", "B5", "B6"
                        ),

                        Arrays.asList(
                                1, 1, 1, 1, 1, 1
                        ),

                        Arrays.asList(
                                1, 2, 3, 4, 5, 6
                        ),

                        true,
                        "BENCH"
                );

            default:

                throw new IllegalArgumentException(
                        "Unsupported coach type for seat layout: "
                                + coach.getCoachType());
        }
    }

    // ==================================================
    // APPLY LAYOUT TO A SEAT
    // ==================================================

    private void applyLayout(
            Seat seat,
            Coach coach,
            boolean setBerthType) {

        SeatLayout layout = getLayout(coach);

        Integer number = seat.getSeatNumber();

        if (number == null || number <= 0) {
            throw new IllegalArgumentException(
                    "Invalid seat number");
        }

        int patternIndex =
                (number - 1) % layout.berthTypes().size();

        int group =
                ((number - 1) / layout.berthTypes().size()) + 1;

        int row = layout.singleRow()
                ? group
                : ((group - 1) * 2)
                    + layout.rowOffsets().get(patternIndex);

        int column =
                layout.columnOffsets().get(patternIndex);

        if (setBerthType) {
            seat.setBerthType(
                    layout.berthTypes().get(patternIndex));
        }

        seat.setSeatRow(row);
        seat.setSeatColumn(column);

        seat.setSeatLabel(
                buildSeatLabel(
                        number,
                        group,
                        patternIndex,
                        row,
                        layout
                )
        );
    }

    // ==================================================
    // APPLY POSITION WITHOUT CHANGING BERTH TYPE
    // ==================================================

    private void applyLayoutPosition(
            Seat seat,
            Coach coach) {

        applyLayout(seat, coach, false);
    }

    // ==================================================
    // BACKFILL MISSING LAYOUT DATA
    // ==================================================

    private boolean applyMissingLayoutMetadata(
            Seat seat,
            Coach coach) {

        Integer number = seat.getSeatNumber();

        if (number == null || number <= 0) {
            return false;
        }

        boolean changed = false;

        if (seat.getSeatRow() == null
                || seat.getSeatColumn() == null
                || seat.getSeatLabel() == null
                || seat.getSeatLabel().isBlank()) {

            applyLayoutPosition(seat, coach);
            changed = true;
        }

        if (seat.getBerthType() == null
                || seat.getBerthType().isBlank()) {

            SeatLayout layout = getLayout(coach);

            int index =
                    (number - 1) % layout.berthTypes().size();

            seat.setBerthType(
                    layout.berthTypes().get(index));

            changed = true;
        }

        return changed;
    }

    // ==================================================
    // SEAT LABEL GENERATION
    // ==================================================

    private String buildSeatLabel(
            int seatNumber,
            int group,
            int patternIndex,
            int row,
            SeatLayout layout) {

        String code = layout.labelCodes().get(patternIndex);

        return switch (layout.labelStyle()) {

            case "CHAIR" ->
                    row + code;

            case "COMPARTMENT" ->
                    "C" + group + "-"
                            + (patternIndex + 1) + "-"
                            + code;

            case "BENCH" ->
                    "R" + row + "-" + code;

            default ->
                    seatNumber + "-" + code;
        };
    }

    // ==================================================
    // SEAT VALIDATION
    // ==================================================

    private void validateSeatDetails(Seat seat) {

        if (seat.getSeatNumber() == null
                || seat.getSeatNumber() <= 0) {

            throw new IllegalArgumentException(
                    "Seat number must be greater than zero");
        }

        if (seat.getBerthType() == null
                || seat.getBerthType().isBlank()) {

            throw new IllegalArgumentException(
                    "Berth type is required");
        }
    }

    // ==================================================
    // NORMALIZATION
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
