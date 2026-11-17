
package com.example.demo.service;

import com.example.demo.entity.Coach;
import com.example.demo.entity.Station;
import com.example.demo.entity.Train;
import com.example.demo.entity.TrainStop;

import com.example.demo.repository.StationRepository;
import com.example.demo.repository.TrainRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DemoTrainImportService {

    private final TrainRepository trainRepository;
    private final StationRepository stationRepository;
    private final TrainStopService trainStopService;
    private final CoachService coachService;
    private final SeatService seatService;

    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm");

    public DemoTrainImportService(
            TrainRepository trainRepository,
            StationRepository stationRepository,
            TrainStopService trainStopService,
            CoachService coachService,
            SeatService seatService) {

        this.trainRepository = trainRepository;
        this.stationRepository = stationRepository;
        this.trainStopService = trainStopService;
        this.coachService = coachService;
        this.seatService = seatService;
    }

    /*
     * 20 route corridors x 2 demo services = 40 trains.
     * The second service runs eight hours after the first.
     */
    @Transactional
    public Map<String, Object> importDemoTrains() {

        int imported = 0;
        int skippedExisting = 0;
        int skippedMissingStations = 0;
        int coachesCreated = 0;
        int seatsCreated = 0;
        int sequence = 1;

        List<String> importedNumbers = new ArrayList<>();
        List<String> skippedNumbers = new ArrayList<>();
        Set<String> missingStationCodes = new LinkedHashSet<>();

        for (RoutePlan route : getRoutes()) {

            for (int run = 0; run < 2; run++) {

                String trainNumber =
                        String.format("990%02d", sequence++);

                if (trainRepository.existsByTrainNumber(trainNumber)) {
                    skippedExisting++;
                    skippedNumbers.add(trainNumber);
                    continue;
                }

                int offsetHours = run == 0 ? 0 : 8;

                List<Station> stations = new ArrayList<>();
                boolean routeAvailable = true;

                // Resolve every station before creating the train.
                for (StopPlan stop : route.stops()) {

                    Station station = stationRepository
                            .findByStationCodeIgnoreCase(
                                    stop.stationCode())
                            .orElse(null);

                    if (station == null) {
                        missingStationCodes.add(stop.stationCode());
                        routeAvailable = false;
                    } else {
                        stations.add(station);
                    }
                }

                if (!routeAvailable
                        || stations.size() != route.stops().size()) {

                    skippedMissingStations++;
                    skippedNumbers.add(trainNumber);
                    continue;
                }

                Station firstStation = stations.get(0);
                Station lastStation = stations.get(stations.size() - 1);

                StopPlan firstStop = route.stops().get(0);
                StopPlan lastStop =
                        route.stops().get(route.stops().size() - 1);

                Train train = new Train(
                        trainNumber,
                        route.name() + " Demo Express " + (run + 1),
                        displayLocation(firstStation),
                        displayLocation(lastStation),
                        shiftTime(firstStop.departureTime(), offsetHours),
                        shiftTime(lastStop.arrivalTime(), offsetHours),
                        "MIXED"
                );

                train = trainRepository.save(train);

                // Create ordered intermediate stops.
                for (int i = 0; i < route.stops().size(); i++) {

                    StopPlan stopPlan = route.stops().get(i);
                    Station station = stations.get(i);

                    TrainStop trainStop = new TrainStop();

                    trainStop.setStopOrder(i + 1);
                    trainStop.setArrivalTime(
                            shiftTime(stopPlan.arrivalTime(), offsetHours));
                    trainStop.setDepartureTime(
                            shiftTime(stopPlan.departureTime(), offsetHours));
                    trainStop.setDistanceFromSource(
                            stopPlan.distanceFromSource());

                    trainStopService.addTrainStop(
                            train.getId(),
                            station.getId(),
                            trainStop
                    );
                }

                // Standard simplified demo coach configuration.
                coachesCreated += createCoach(
                        train.getId(), "S1", "SL", 72);

                seatsCreated += generateSeatsForLastCoach(
                        train.getId(), "S1");

                coachesCreated += createCoach(
                        train.getId(), "B1", "3A", 72);

                seatsCreated += generateSeatsForLastCoach(
                        train.getId(), "B1");

                coachesCreated += createCoach(
                        train.getId(), "A1", "2A", 54);

                seatsCreated += generateSeatsForLastCoach(
                        train.getId(), "A1");

                imported++;
                importedNumbers.add(trainNumber);
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("plannedTrainCount", 40);
        response.put("importedTrainCount", imported);
        response.put("skippedExistingTrainCount", skippedExisting);
        response.put("skippedMissingStationsCount",
                skippedMissingStations);

        response.put("coachesCreated", coachesCreated);
        response.put("seatsCreated", seatsCreated);

        response.put("importedTrainNumbers", importedNumbers);
        response.put("skippedTrainNumbers", skippedNumbers);
        response.put("missingStationCodes", missingStationCodes);

        response.put("totalTrainsInDatabase",
                trainRepository.count());

        response.put("message",
                "Demo train import process completed");

        return response;
    }

    private int createCoach(
            Long trainId,
            String coachNumber,
            String coachType,
            int totalSeats) {

        Coach coach = new Coach();

        coach.setCoachNumber(coachNumber);
        coach.setCoachType(coachType);
        coach.setTotalSeats(totalSeats);

        coachService.addCoach(trainId, coach);

        return 1;
    }

    /*
     * Finds the newly created coach by its train and coach number,
     * then generates all its missing seats.
     */
    private int generateSeatsForLastCoach(
            Long trainId,
            String coachNumber) {

        Coach coach = coachService.getCoachesByTrainId(trainId)
                .stream()
                .filter(c -> c.getCoachNumber()
                        .equalsIgnoreCase(coachNumber))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Created coach could not be found: " + coachNumber));

        Map<String, Object> result =
                seatService.generateMissingSeats(coach.getId());

        Object created = result.get("newSeatsCreated");

        return created instanceof Number
                ? ((Number) created).intValue()
                : 0;
    }

    private String displayLocation(Station station) {

        if (station.getCity() != null
                && !station.getCity().isBlank()) {
            return station.getCity().trim();
        }

        return station.getStationName();
    }

    private String shiftTime(String value, int hours) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return LocalTime.parse(value, TIME_FORMAT)
                .plusHours(hours)
                .format(TIME_FORMAT);
    }

    private StopPlan stop(
            String code,
            String arrival,
            String departure,
            double distance) {

        return new StopPlan(code, arrival, departure, distance);
    }

    private List<RoutePlan> getRoutes() {

        return List.of(

            new RoutePlan("Mumbai Ahmedabad", List.of(
                stop("BDTS", null, "06:00", 0),
                stop("BVI", "06:35", "06:40", 35),
                stop("VAPI", "08:00", "08:05", 160),
                stop("ST", "09:00", "09:05", 250),
                stop("BRC", "10:40", "10:45", 390),
                stop("ADI", "12:00", null, 490)
            )),

            new RoutePlan("Mumbai New Delhi", List.of(
                stop("BCT", null, "05:00", 0),
                stop("BVI", "05:35", "05:40", 30),
                stop("ST", "08:00", "08:05", 260),
                stop("BRC", "09:40", "09:45", 400),
                stop("RTM", "12:00", "12:05", 650),
                stop("KOTA", "15:00", "15:05", 900),
                stop("NDLS", "19:00", null, 1380)
            )),

            new RoutePlan("Mumbai Jaipur", List.of(
                stop("BDTS", null, "06:30", 0),
                stop("BVI", "07:00", "07:05", 30),
                stop("ST", "09:30", "09:35", 260),
                stop("BRC", "11:00", "11:05", 400),
                stop("RTM", "14:00", "14:05", 650),
                stop("KOTA", "16:30", "16:35", 850),
                stop("JP", "20:00", null, 1150)
            )),

            new RoutePlan("Mumbai Goa", List.of(
                stop("CSTM", null, "06:00", 0),
                stop("PNVL", "07:00", "07:05", 55),
                stop("RN", "10:00", "10:05", 300),
                stop("KKW", "12:00", "12:05", 450),
                stop("SWV", "13:00", "13:05", 550),
                stop("MAO", "15:00", null, 650)
            )),

            new RoutePlan("Pune Hyderabad", List.of(
                stop("PUNE", null, "06:00", 0),
                stop("DD", "07:00", "07:05", 75),
                stop("SUR", "10:00", "10:05", 260),
                stop("WADI", "12:00", "12:05", 400),
                stop("SC", "15:00", null, 550)
            )),

            new RoutePlan("Pune Bengaluru", List.of(
                stop("PUNE", null, "06:00", 0),
                stop("STR", "08:00", "08:05", 140),
                stop("MRJ", "10:00", "10:05", 230),
                stop("UBL", "13:00", "13:05", 430),
                stop("SBC", "18:00", null, 840)
            )),

            new RoutePlan("Mumbai Nagpur", List.of(
                stop("CSTM", null, "05:30", 0),
                stop("KYN", "06:30", "06:35", 55),
                stop("NK", "09:00", "09:05", 180),
                stop("BSL", "12:00", "12:05", 430),
                stop("NGP", "16:00", null, 830)
            )),

            new RoutePlan("Mumbai Varanasi", List.of(
                stop("LTT", null, "05:00", 0),
                stop("NK", "08:00", "08:05", 180),
                stop("BSL", "11:00", "11:05", 430),
                stop("BPL", "15:00", "15:05", 700),
                stop("JBP", "18:00", "18:05", 930),
                stop("PRYJ", "22:00", "22:05", 1250),
                stop("BSB", "23:30", null, 1390)
            )),

            new RoutePlan("Ahmedabad Jaipur", List.of(
                stop("ADI", null, "06:00", 0),
                stop("MSH", "07:00", "07:05", 70),
                stop("ABR", "09:30", "09:35", 180),
                stop("MJ", "12:00", "12:05", 350),
                stop("JP", "15:00", null, 600)
            )),

            new RoutePlan("Delhi Lucknow", List.of(
                stop("NDLS", null, "06:00", 0),
                stop("GZB", "06:30", "06:35", 25),
                stop("MB", "09:00", "09:05", 160),
                stop("BE", "10:30", "10:35", 250),
                stop("LKO", "13:00", null, 510)
            )),

            new RoutePlan("Delhi Amritsar", List.of(
                stop("NDLS", null, "06:00", 0),
                stop("LDH", "10:00", "10:05", 300),
                stop("JUC", "11:00", "11:05", 370),
                stop("ASR", "12:30", null, 450)
            )),

            new RoutePlan("Delhi Dehradun", List.of(
                stop("NDLS", null, "06:00", 0),
                stop("GZB", "06:30", "06:35", 25),
                stop("MB", "09:00", "09:05", 160),
                stop("BE", "10:30", "10:35", 250),
                stop("HW", "12:30", "12:35", 400),
                stop("DDN", "14:00", null, 450)
            )),

            new RoutePlan("Kolkata Patna", List.of(
                stop("HWH", null, "06:00", 0),
                stop("BWN", "07:30", "07:35", 95),
                stop("ASN", "09:00", "09:05", 200),
                stop("JSME", "11:00", "11:05", 300),
                stop("KIUL", "13:00", "13:05", 420),
                stop("PNBE", "15:00", null, 540)
            )),

            new RoutePlan("Kolkata Delhi", List.of(
                stop("HWH", null, "05:00", 0),
                stop("DHN", "08:00", "08:05", 260),
                stop("GAYA", "11:00", "11:05", 440),
                stop("DDU", "14:00", "14:05", 700),
                stop("PRYJ", "16:00", "16:05", 800),
                stop("CNB", "18:00", "18:05", 1000),
                stop("NDLS", "22:00", null, 1450)
            )),

            new RoutePlan("Chennai Bengaluru", List.of(
                stop("MAS", null, "06:00", 0),
                stop("KPD", "08:00", "08:05", 130),
                stop("JTJ", "09:00", "09:05", 215),
                stop("BNC", "11:00", "11:05", 350),
                stop("SBC", "11:30", null, 360)
            )),

            new RoutePlan("Chennai Hyderabad", List.of(
                stop("MAS", null, "05:00", 0),
                stop("GDR", "07:00", "07:05", 140),
                stop("NLR", "08:00", "08:05", 180),
                stop("BZA", "11:00", "11:05", 430),
                stop("KZJ", "14:00", "14:05", 650),
                stop("SC", "16:00", null, 790)
            )),

            new RoutePlan("Bengaluru Mysuru", List.of(
                stop("SBC", null, "06:00", 0),
                stop("KGI", "06:30", "06:35", 20),
                stop("MYA", "08:00", "08:05", 90),
                stop("MYS", "09:00", null, 140)
            )),

            new RoutePlan("Hyderabad Vijayawada", List.of(
                stop("SC", null, "06:00", 0),
                stop("KZJ", "08:00", "08:05", 140),
                stop("WL", "09:00", "09:05", 150),
                stop("BZA", "12:00", null, 280)
            )),

            new RoutePlan("Chennai Coimbatore", List.of(
                stop("MAS", null, "05:00", 0),
                stop("AJJ", "06:00", "06:05", 70),
                stop("KPD", "07:00", "07:05", 130),
                stop("SA", "09:00", "09:05", 340),
                stop("ED", "10:00", "10:05", 400),
                stop("CBE", "11:00", null, 500)
            )),

            new RoutePlan("Ernakulam Mangalore", List.of(
                stop("ERS", null, "06:00", 0),
                stop("TCR", "07:00", "07:05", 75),
                stop("CLT", "09:30", "09:35", 190),
                stop("MAQ", "12:00", null, 420)
            ))
        );
    }

    private record StopPlan(
            String stationCode,
            String arrivalTime,
            String departureTime,
            double distanceFromSource) {
    }

    private record RoutePlan(
            String name,
            List<StopPlan> stops) {
    }
}
