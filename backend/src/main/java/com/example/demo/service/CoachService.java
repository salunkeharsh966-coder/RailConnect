
package com.example.demo.service;

import com.example.demo.entity.Coach;
import com.example.demo.entity.Train;
import com.example.demo.repository.CoachRepository;
import com.example.demo.repository.TrainRepository;
import com.example.demo.repository.SeatRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class CoachService {

    private final CoachRepository coachRepository;
    private final TrainRepository trainRepository;
    private final SeatRepository seatRepository;
    private final SeatService seatService;

    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "PASSENGER",
            "GENERAL",
            "PANTRY",
            "LUGGAGE",
            "BRAKE",
            "POWER",
            "SERVICE"
    );

    private record CoachTemplate(
            String coachNumber,
            String coachType,
            Integer totalSeats,
            String category,
            boolean reservationAllowed,
            Integer position
    ) {
    }

    public CoachService(
            CoachRepository coachRepository,
            TrainRepository trainRepository,
            SeatRepository seatRepository,
            SeatService seatService) {

        this.coachRepository = coachRepository;
        this.trainRepository = trainRepository;
        this.seatRepository = seatRepository;
        this.seatService = seatService;
    }

    // ==================================================
    // ADD COACH
    // ==================================================

    @Transactional
    public Coach addCoach(Long trainId, Coach coach) {

        if (trainId == null || coach == null) {
            throw new IllegalArgumentException(
                    "Train ID and coach details are required");
        }

        Train train = trainRepository.findById(trainId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Train not found with ID: " + trainId));

        String coachNumber = normalize(coach.getCoachNumber());
        String coachType = normalize(coach.getCoachType());

        if (coachNumber == null || coachType == null) {
            throw new IllegalArgumentException(
                    "Coach number and coach type are required");
        }

        String category = resolveCategory(
                coachType,
                coach.getCoachCategory()
        );

        boolean reservationAllowed =
                Boolean.TRUE.equals(coach.getReservationAllowed())
                        && "PASSENGER".equals(category);

        validateCapacity(
                coach.getTotalSeats(),
                reservationAllowed
        );

        if (coachRepository.existsByTrain_IdAndCoachNumber(
                trainId, coachNumber)) {

            throw new IllegalArgumentException(
                    "Coach " + coachNumber
                            + " already exists for this train");
        }

        Integer position = coach.getCoachPosition();

        if (position == null) {
            position = getNextCoachPosition(trainId);
        }

        validatePosition(trainId, position);

        coach.setTrain(train);
        coach.setCoachNumber(coachNumber);
        coach.setCoachType(coachType);
        coach.setCoachCategory(category);
        coach.setReservationAllowed(reservationAllowed);
        coach.setCoachPosition(position);

        return coachRepository.save(coach);
    }

    // ==================================================
    // CREATE COMPLETE TRAIN FORMATION
    // ==================================================

    @Transactional
    public Map<String, Object> createFormation(
            Long trainId,
            String formationType) {

        if (trainId == null) {
            throw new IllegalArgumentException(
                    "Train ID is required");
        }

        Train train = trainRepository.findById(trainId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Train not found with ID: " + trainId));

        List<CoachTemplate> templates =
                getFormationTemplate(formationType);

        List<Coach> existingCoaches =
                coachRepository.findByTrain_Id(trainId);

        Map<String, Coach> existingByNumber =
                new LinkedHashMap<>();

        Map<String, CoachTemplate> templateByNumber =
                new LinkedHashMap<>();

        for (CoachTemplate template : templates) {

            templateByNumber.put(
                    template.coachNumber(),
                    template
            );
        }

        // --------------------------------------------------
        // STEP 1: VALIDATE EXISTING COACHES
        // --------------------------------------------------

        // Existing coaches must match the selected formation.
        // We never silently delete or replace an existing coach.

        for (Coach coach : existingCoaches) {

            String number = normalize(coach.getCoachNumber());

            if (number == null) {
                throw new IllegalStateException(
                        "An existing coach has no coach number");
            }

            if (existingByNumber.put(number, coach) != null) {
                throw new IllegalStateException(
                        "Duplicate existing coach number: " + number);
            }

            CoachTemplate expected = templateByNumber.get(number);

            if (expected == null) {
                throw new IllegalStateException(
                        "Existing coach " + number
                                + " is not part of the selected formation. "
                                + "No coaches were modified.");
            }

            String existingType = normalize(coach.getCoachType());

            if (!Objects.equals(
                    existingType, expected.coachType())) {

                throw new IllegalStateException(
                        "Coach type mismatch for " + number
                                + ". Existing: " + existingType
                                + ", expected: " + expected.coachType());
            }

            if (!Objects.equals(
                    coach.getTotalSeats(),
                    expected.totalSeats())) {

                throw new IllegalStateException(
                        "Coach capacity mismatch for " + number
                                + ". Existing capacity: "
                                + coach.getTotalSeats()
                                + ", expected capacity: "
                                + expected.totalSeats()
                                + ". Existing inventory was not changed.");
            }
        }

        // --------------------------------------------------
        // STEP 2: CLEAR OLD POSITIONS TEMPORARILY
        // --------------------------------------------------

        // This prevents unique-position conflicts when coaches
        // are reordered into the selected formation.

        for (Coach coach : existingCoaches) {
            coach.setCoachPosition(null);
        }

        if (!existingCoaches.isEmpty()) {
            coachRepository.saveAllAndFlush(existingCoaches);
        }

        // --------------------------------------------------
        // STEP 3: APPLY FORMATION
        // --------------------------------------------------

        int createdCount = 0;
        int updatedCount = 0;

        List<Map<String, Object>> inventoryResults =
                new ArrayList<>();

        for (CoachTemplate template : templates) {

            Coach coach =
                    existingByNumber.get(template.coachNumber());

            if (coach == null) {

                coach = new Coach();
                createdCount++;

            } else {

                updatedCount++;
            }

            coach.setTrain(train);
            coach.setCoachNumber(template.coachNumber());
            coach.setCoachType(template.coachType());
            coach.setTotalSeats(template.totalSeats());

            coach.setCoachPosition(template.position());
            coach.setCoachCategory(template.category());

            coach.setReservationAllowed(
                    template.reservationAllowed()
            );

            Coach savedCoach = coachRepository.save(coach);

            // Passenger and general coaches receive physical
            // seat inventory. General seats remain unreserved.
            if ("PASSENGER".equals(template.category())
                    || "GENERAL".equals(template.category())) {

                Map<String, Object> seatResult =
                        seatService.generateMissingSeats(
                                savedCoach.getId()
                        );

                inventoryResults.add(seatResult);
            }
        }

        // --------------------------------------------------
        // STEP 4: RESPONSE
        // --------------------------------------------------

        List<Coach> finalCoaches =
                coachRepository
                        .findByTrain_IdOrderByCoachPositionAsc(trainId);

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("trainId", trainId);
        response.put("trainNumber", train.getTrainNumber());
        response.put("trainName", train.getTrainName());
        response.put("formationType", normalizeFormationType(formationType));

        response.put("expectedCoachCount", templates.size());
        response.put("createdCoachCount", createdCount);
        response.put("updatedCoachCount", updatedCount);

        response.put("seatInventoryResults", inventoryResults);
        response.put("coaches", finalCoaches);

        response.put(
                "message",
                "Train formation created/updated successfully"
        );

        return response;
    }

    // ==================================================
    // CONVENTIONAL AND VANDE BHARAT TEMPLATES
    // ==================================================

    private List<CoachTemplate> getFormationTemplate(
            String formationType) {

        String type = normalizeFormationType(formationType);

        switch (type) {

            // ----------------------------------------------
            // CONVENTIONAL 15-COACH DEMO FORMATION
            // ----------------------------------------------

            case "CONVENTIONAL":
            case "CONVENTIONAL15":
            case "CONVENTIONAL15COACH":

                return List.of(

                        new CoachTemplate(
                                "EOG", "EOG", 0,
                                "POWER", false, 1
                        ),

                        new CoachTemplate(
                                "GEN", "GEN", 90,
                                "GENERAL", false, 2
                        ),

                        new CoachTemplate(
                                "S1", "SL", 72,
                                "PASSENGER", true, 3
                        ),

                        new CoachTemplate(
                                "S2", "SL", 72,
                                "PASSENGER", true, 4
                        ),

                        new CoachTemplate(
                                "S3", "SL", 72,
                                "PASSENGER", true, 5
                        ),

                        new CoachTemplate(
                                "S4", "SL", 72,
                                "PASSENGER", true, 6
                        ),

                        new CoachTemplate(
                                "S5", "SL", 72,
                                "PASSENGER", true, 7
                        ),

                        new CoachTemplate(
                                "B1", "3A", 72,
                                "PASSENGER", true, 8
                        ),

                        new CoachTemplate(
                                "B2", "3A", 72,
                                "PASSENGER", true, 9
                        ),

                        new CoachTemplate(
                                "B3", "3A", 72,
                                "PASSENGER", true, 10
                        ),

                        new CoachTemplate(
                                "A1", "2A", 54,
                                "PASSENGER", true, 11
                        ),

                        new CoachTemplate(
                                "A2", "2A", 54,
                                "PASSENGER", true, 12
                        ),

                        new CoachTemplate(
                                "H1", "1A", 24,
                                "PASSENGER", true, 13
                        ),

                        new CoachTemplate(
                                "PC", "PC", 0,
                                "PANTRY", false, 14
                        ),

                        new CoachTemplate(
                                "SLR", "SLR", 0,
                                "LUGGAGE", false, 15
                        )
                );

            // ----------------------------------------------
            // VANDE BHARAT 16-CAR DEMO FORMATION
            // ----------------------------------------------

            case "VANDEBHARAT":
            case "VANDEBHARAT16":
            case "VB":
            case "VB16":

                List<CoachTemplate> vandeBharat =
                        new ArrayList<>();

                // First Executive Chair Car
                vandeBharat.add(
                        new CoachTemplate(
                                "E1", "EC", 56,
                                "PASSENGER", true, 1
                        )
                );

                // Fourteen Chair Cars
                for (int i = 1; i <= 14; i++) {

                    vandeBharat.add(
                            new CoachTemplate(
                                    "C" + i,
                                    "CC",
                                    78,
                                    "PASSENGER",
                                    true,
                                    i + 1
                            )
                    );
                }

                // Last Executive Chair Car
                vandeBharat.add(
                        new CoachTemplate(
                                "E2", "EC", 56,
                                "PASSENGER", true, 16
                        )
                );

                return List.copyOf(vandeBharat);

            default:

                throw new IllegalArgumentException(
                        "Unsupported formation type: " + formationType
                                + ". Use conventional-15 or "
                                + "vande-bharat-16");
        }
    }

    // ==================================================
    // POSITION MANAGEMENT
    // ==================================================

    private Integer getNextCoachPosition(Long trainId) {

        return coachRepository.findByTrain_Id(trainId)
                .stream()
                .map(Coach::getCoachPosition)
                .filter(position -> position != null)
                .max(Integer::compareTo)
                .orElse(0) + 1;
    }

    private void validatePosition(
            Long trainId,
            Integer position) {

        if (position == null || position <= 0) {
            throw new IllegalArgumentException(
                    "Coach position must be greater than zero");
        }

        if (coachRepository.existsByTrain_IdAndCoachPosition(
                trainId, position)) {

            throw new IllegalArgumentException(
                    "Coach position " + position
                            + " already exists in this train");
        }
    }

    // ==================================================
    // CAPACITY VALIDATION
    // ==================================================

    private void validateCapacity(
            Integer totalSeats,
            boolean reservationAllowed) {

        if (totalSeats == null || totalSeats < 0) {
            throw new IllegalArgumentException(
                    "Coach capacity cannot be negative or null");
        }

        if (reservationAllowed && totalSeats == 0) {
            throw new IllegalArgumentException(
                    "Reservable coaches must have seats");
        }
    }

    // ==================================================
    // CATEGORY RESOLUTION
    // ==================================================

    private String resolveCategory(
            String coachType,
            String requestedCategory) {

        String category = normalize(requestedCategory);

        if (category == null) {

            category = switch (coachType) {

                case "GEN", "GENERAL", "UR", "GS" ->
                        "GENERAL";

                case "PC", "PANTRY" ->
                        "PANTRY";

                case "SLR", "LUGGAGE" ->
                        "LUGGAGE";

                case "BRAKE" ->
                        "BRAKE";

                case "EOG", "POWER" ->
                        "POWER";

                default ->
                        "PASSENGER";
            };
        }

        if (!ALLOWED_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException(
                    "Unsupported coach category: " + category);
        }

        return category;
    }

    // ==================================================
    // GET COACHES
    // ==================================================

    @Transactional(readOnly = true)
    public List<Coach> getCoachesByTrainId(Long trainId) {

        if (trainId == null || !trainRepository.existsById(trainId)) {
            throw new IllegalArgumentException(
                    "Train not found with ID: " + trainId);
        }

        return coachRepository
                .findByTrain_IdOrderByCoachPositionAsc(trainId);
    }

    @Transactional(readOnly = true)
    public List<Coach> getAllCoaches() {
        return coachRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Coach getCoachById(Long coachId) {

        return coachRepository.findById(coachId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Coach not found with ID: " + coachId));
    }

    // ==================================================
    // UPDATE COACH
    // ==================================================

    @Transactional
    public Coach updateCoach(
            Long coachId,
            Coach updatedCoach) {

        if (updatedCoach == null) {
            throw new IllegalArgumentException(
                    "Updated coach details are required");
        }

        Coach existingCoach = getCoachById(coachId);

        String coachNumber = normalize(
                updatedCoach.getCoachNumber());

        String coachType = normalize(
                updatedCoach.getCoachType());

        if (coachNumber == null || coachType == null) {
            throw new IllegalArgumentException(
                    "Coach number and coach type are required");
        }

        String category = resolveCategory(
                coachType,
                updatedCoach.getCoachCategory() != null
                        ? updatedCoach.getCoachCategory()
                        : existingCoach.getCoachCategory()
        );

        boolean reservationAllowed =
                Boolean.TRUE.equals(updatedCoach.getReservationAllowed())
                        && "PASSENGER".equals(category);

        validateCapacity(
                updatedCoach.getTotalSeats(),
                reservationAllowed
        );

        Long trainId = existingCoach.getTrain().getId();

        // Do not change coach type or capacity after seat inventory
        // exists. Use a planned inventory migration instead.
        boolean hasSeats =
                !seatRepository.findByCoach_Id(coachId).isEmpty();

        if (hasSeats && (
                !Objects.equals(
                        coachType,
                        normalize(existingCoach.getCoachType()))
                || !Objects.equals(
                        updatedCoach.getTotalSeats(),
                        existingCoach.getTotalSeats())
        )) {

            throw new IllegalStateException(
                    "Cannot change coach type or capacity while "
                            + "seat inventory exists.");
        }

        boolean duplicateNumber = coachRepository
                .findByTrain_IdAndCoachNumber(
                        trainId, coachNumber)
                .filter(other -> !other.getId().equals(coachId))
                .isPresent();

        if (duplicateNumber) {
            throw new IllegalArgumentException(
                    "Coach number already exists: " + coachNumber);
        }

        Integer position = updatedCoach.getCoachPosition() != null
                ? updatedCoach.getCoachPosition()
                : existingCoach.getCoachPosition();

        if (position == null) {
            position = getNextCoachPosition(trainId);
        }

        if (position <= 0) {
            throw new IllegalArgumentException(
                    "Coach position must be greater than zero");
        }

        boolean duplicatePosition =
                coachRepository.existsByTrain_IdAndCoachPosition(
                        trainId, position);

        if (duplicatePosition
                && !position.equals(existingCoach.getCoachPosition())) {

            throw new IllegalArgumentException(
                    "Coach position already exists: " + position);
        }

        existingCoach.setCoachNumber(coachNumber);
        existingCoach.setCoachType(coachType);
        existingCoach.setCoachCategory(category);
        existingCoach.setReservationAllowed(reservationAllowed);
        existingCoach.setCoachPosition(position);
        existingCoach.setTotalSeats(updatedCoach.getTotalSeats());

        return coachRepository.save(existingCoach);
    }

    // ==================================================
    // SAFE COACH DELETION
    // ==================================================

    @Transactional
    public void deleteCoach(Long coachId) {

        Coach coach = getCoachById(coachId);

        boolean hasSeats =
                !seatRepository.findByCoach_Id(coachId).isEmpty();

        if (hasSeats) {
            throw new IllegalStateException(
                    "Cannot delete this coach because seat records "
                            + "exist. Preserve the coach and its "
                            + "booking history.");
        }

        coachRepository.delete(coach);
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

    private String normalizeFormationType(String value) {

        if (value == null || value.isBlank()) {
            return "";
        }

        return value.trim()
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "");
    }
}
