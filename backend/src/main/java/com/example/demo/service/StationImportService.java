package com.example.demo.service;

import com.example.demo.entity.Station;
import com.example.demo.repository.StationRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class StationImportService {

    private static final String DATASET_PATH = "data/stations.json";

    private final StationRepository stationRepository;
    private final ObjectMapper objectMapper;

    public StationImportService(
            StationRepository stationRepository,
            ObjectMapper objectMapper) {

        this.stationRepository = stationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> importStations() {

        try {
            ClassPathResource resource =
                    new ClassPathResource(DATASET_PATH);

            if (!resource.exists()) {
                throw new IllegalStateException(
                        "Station dataset not found at " + DATASET_PATH);
            }

            JsonNode root;

            try (InputStream inputStream = resource.getInputStream()) {
                root = objectMapper.readTree(inputStream);
            }

            if (root == null || !root.isArray()) {
                throw new IllegalStateException(
                        "Station JSON must contain a root array");
            }

            List<Station> existingStations =
                    stationRepository.findAll();

            Map<String, Station> existingByCode = new HashMap<>();

            for (Station station : existingStations) {
                if (station.getStationCode() != null) {
                    existingByCode.put(
                            normalizeCode(station.getStationCode()),
                            station);
                }
            }

            Set<String> processedCodes = new HashSet<>();
            List<Station> stationsToSave = new ArrayList<>();

            int inserted = 0;
            int enriched = 0;
            int alreadyPresent = 0;
            int duplicateRecords = 0;
            int invalidRecords = 0;

            for (JsonNode node : root) {

                String code = getText(node, "code");
                String name = getText(node, "name");
                String state = getText(node, "state");
                String zone = getText(node, "zone");
                String address = getText(node, "address");

                JsonNode coordinates = node.path("coordinates");

                Double latitude =
                        getDouble(coordinates, "latitude");

                Double longitude =
                        getDouble(coordinates, "longitude");

                if (!isValidStation(
                        code,
                        name,
                        state,
                        latitude,
                        longitude)) {

                    invalidRecords++;
                    continue;
                }

                String normalizedCode = normalizeCode(code);

                if (!processedCodes.add(normalizedCode)) {
                    duplicateRecords++;
                    continue;
                }

                Station existing =
                        existingByCode.get(normalizedCode);

                if (existing != null) {

                    boolean changed =
                            enrichExistingStation(
                                    existing,
                                    state,
                                    zone,
                                    address,
                                    latitude,
                                    longitude);

                    if (changed) {
                        stationsToSave.add(existing);
                        enriched++;
                    } else {
                        alreadyPresent++;
                    }

                    continue;
                }

                String city = deriveCity(address, name);

                Station station = new Station();

                station.setStationName(name.trim());
                station.setStationCode(normalizedCode);
                station.setCity(city);
                station.setState(state.trim());
                station.setZone(emptyToNull(zone));
                station.setAddress(emptyToNull(address));
                station.setLatitude(latitude);
                station.setLongitude(longitude);

                stationsToSave.add(station);
                existingByCode.put(normalizedCode, station);

                inserted++;
            }

            if (!stationsToSave.isEmpty()) {
                stationRepository.saveAll(stationsToSave);
            }

            Map<String, Object> result = new HashMap<>();

            result.put("totalRecords", root.size());
            result.put("newStationsImported", inserted);
            result.put("existingStationsEnriched", enriched);
            result.put("alreadyPresent", alreadyPresent);
            result.put("duplicateRecords", duplicateRecords);
            result.put("invalidRecordsSkipped", invalidRecords);
            result.put("totalStationsInDatabase",
                    stationRepository.count());

            result.put(
                    "message",
                    "Station dataset processed successfully");

            return result;

        } catch (Exception ex) {
            throw new RuntimeException(
                    "Station import failed: " + ex.getMessage(),
                    ex);
        }
    }

    private boolean enrichExistingStation(
            Station station,
            String state,
            String zone,
            String address,
            Double latitude,
            Double longitude) {

        boolean changed = false;

        if (isBlank(station.getState()) && !isBlank(state)) {
            station.setState(state.trim());
            changed = true;
        }

        if (isBlank(station.getZone()) && !isBlank(zone)) {
            station.setZone(zone.trim());
            changed = true;
        }

        if (isBlank(station.getAddress()) && !isBlank(address)) {
            station.setAddress(address.trim());
            changed = true;
        }

        if (!isValidCoordinates(
                station.getLatitude(),
                station.getLongitude())) {

            station.setLatitude(latitude);
            station.setLongitude(longitude);
            changed = true;
        }

        if (isBlank(station.getCity())) {
            station.setCity(deriveCity(address, station.getStationName()));
            changed = true;
        }

        return changed;
    }

    private boolean isValidStation(
            String code,
            String name,
            String state,
            Double latitude,
            Double longitude) {

        if (isBlank(code)
                || isBlank(name)
                || isBlank(state)) {
            return false;
        }

        String normalizedCode = normalizeCode(code);
        String normalizedName = name.trim();

        if (normalizedCode.length() > 10) {
            return false;
        }

        if (normalizedCode.startsWith("XX-")
                || normalizedCode.startsWith("YY-")
                || normalizedCode.startsWith("ZZ-")) {
            return false;
        }

        // Reject obvious placeholder entries such as XX-BECE.
        if (normalizedName.equalsIgnoreCase(normalizedCode)) {
            return false;
        }

        return isValidCoordinates(latitude, longitude);
    }

    private boolean isValidCoordinates(
            Double latitude,
            Double longitude) {

        if (latitude == null || longitude == null) {
            return false;
        }

        // Broad geographic bounds for India, including island territories.
        return latitude >= 6.0
                && latitude <= 38.8
                && longitude >= 68.0
                && longitude <= 98.5;
    }

    private String deriveCity(String address, String stationName) {

        if (!isBlank(address)) {
            String firstPart = address.split(",")[0].trim();

            if (!firstPart.isBlank()) {
                return firstPart;
            }
        }

        if (!isBlank(stationName)) {
            return stationName.trim();
        }

        return "Unknown";
    }

    private String getText(JsonNode node, String field) {
        JsonNode value = node.path(field);

        if (value.isMissingNode() || value.isNull()) {
            return null;
        }

        String text = value.asText();

        return text == null ? null : text.trim();
    }

    private Double getDouble(JsonNode node, String field) {
        JsonNode value = node.path(field);

        if (!value.isNumber()) {
            return null;
        }

        return value.asDouble();
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private String emptyToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}