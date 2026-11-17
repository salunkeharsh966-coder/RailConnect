package com.example.demo.service;

import com.example.demo.entity.Station;
import com.example.demo.repository.StationRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class StationService {

    private final StationRepository stationRepository;

    public StationService(StationRepository stationRepository) {
        this.stationRepository = stationRepository;
    }

    @Transactional
    public Station addStation(Station station) {

        validateStation(station);

        String code = station.getStationCode()
                .trim().toUpperCase(Locale.ROOT);

        if (stationRepository.existsByStationCodeIgnoreCase(code)) {
            throw new IllegalArgumentException(
                    "Station code already exists: " + code);
        }

        station.setStationCode(code);
        station.setStationName(station.getStationName().trim());
        station.setCity(station.getCity().trim());

        return stationRepository.save(station);
    }

    @Transactional(readOnly = true)
    public List<Station> getAllStations() {
        return stationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Station getStationById(Long id) {
        return stationRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Station not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public Station getStationByCode(String stationCode) {
        return stationRepository
                .findByStationCodeIgnoreCase(stationCode.trim())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Station not found with code: " + stationCode));
    }

    @Transactional(readOnly = true)
    public List<Station> searchStationsByName(String name) {
        if (name == null || name.isBlank()) {
            return List.of();
        }

        return stationRepository
                .findByStationNameContainingIgnoreCase(name.trim());
    }

    @Transactional(readOnly = true)
    public List<Station> getStationsByCity(String city) {
        return stationRepository.findByCityIgnoreCase(city.trim());
    }

    @Transactional(readOnly = true)
    public List<Station> getStationsByState(String state) {
        return stationRepository.findByStateIgnoreCase(state.trim());
    }

    @Transactional(readOnly = true)
    public List<Station> getStationsByZone(String zone) {
        return stationRepository.findByZoneIgnoreCase(zone.trim());
    }

    @Transactional
    public Station updateStation(Long id, Station updatedStation) {

        validateStation(updatedStation);

        Station existingStation = getStationById(id);

        String newCode = updatedStation.getStationCode()
                .trim().toUpperCase(Locale.ROOT);

        boolean codeUsedByAnotherStation =
                stationRepository.findByStationCodeIgnoreCase(newCode)
                        .map(station -> !station.getId().equals(id))
                        .orElse(false);

        if (codeUsedByAnotherStation) {
            throw new IllegalArgumentException(
                    "Station code already exists: " + newCode);
        }

        existingStation.setStationName(
                updatedStation.getStationName().trim());

        existingStation.setStationCode(newCode);
        existingStation.setCity(updatedStation.getCity().trim());
        existingStation.setState(updatedStation.getState());
        existingStation.setZone(updatedStation.getZone());
        existingStation.setAddress(updatedStation.getAddress());
        existingStation.setLatitude(updatedStation.getLatitude());
        existingStation.setLongitude(updatedStation.getLongitude());

        return stationRepository.save(existingStation);
    }

    @Transactional
    public void deleteStation(Long id) {
        Station station = getStationById(id);
        stationRepository.delete(station);
    }

    private void validateStation(Station station) {

        if (station == null) {
            throw new IllegalArgumentException(
                    "Station details are required");
        }

        if (station.getStationName() == null
                || station.getStationName().isBlank()) {
            throw new IllegalArgumentException(
                    "Station name is required");
        }

        if (station.getStationCode() == null
                || station.getStationCode().isBlank()) {
            throw new IllegalArgumentException(
                    "Station code is required");
        }

        if (station.getStationCode().trim().length() > 10) {
            throw new IllegalArgumentException(
                    "Station code cannot exceed 10 characters");
        }

        if (station.getCity() == null || station.getCity().isBlank()) {
            throw new IllegalArgumentException("City is required");
        }

        Double latitude = station.getLatitude();
        Double longitude = station.getLongitude();

        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new IllegalArgumentException("Invalid latitude");
        }

        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Invalid longitude");
        }
    }
}