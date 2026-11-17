package com.example.demo.controller;

import com.example.demo.entity.Station;
import com.example.demo.service.StationService;
import com.example.demo.service.StationImportService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stations")
@CrossOrigin(origins = "*")
public class StationController {

    private final StationService stationService;
    private final StationImportService stationImportService;

    public StationController(
            StationService stationService,
            StationImportService stationImportService) {

        this.stationService = stationService;
        this.stationImportService = stationImportService;
    }

    // Add one station
    @PostMapping
    public ResponseEntity<Station> addStation(
            @RequestBody Station station) {

        return ResponseEntity
                .status(201)
                .body(stationService.addStation(station));
    }

    // Import the bundled station JSON dataset
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importStations() {

        return ResponseEntity.ok(
                stationImportService.importStations());
    }

    // Get all stations
    @GetMapping
    public List<Station> getAllStations() {
        return stationService.getAllStations();
    }

    // Get station by ID
    @GetMapping("/{id}")
    public Station getStationById(@PathVariable Long id) {
        return stationService.getStationById(id);
    }

    // Search station by code
    @GetMapping("/code/{stationCode}")
    public Station getStationByCode(
            @PathVariable String stationCode) {

        return stationService.getStationByCode(stationCode);
    }

    // Search station by name
    @GetMapping("/search")
    public List<Station> searchStations(
            @RequestParam String name) {

        return stationService.searchStationsByName(name);
    }

    // Search by city
    @GetMapping("/city/{city}")
    public List<Station> getStationsByCity(
            @PathVariable String city) {

        return stationService.getStationsByCity(city);
    }

    // Search by state
    @GetMapping("/state/{state}")
    public List<Station> getStationsByState(
            @PathVariable String state) {

        return stationService.getStationsByState(state);
    }

    // Search by railway zone
    @GetMapping("/zone/{zone}")
    public List<Station> getStationsByZone(
            @PathVariable String zone) {

        return stationService.getStationsByZone(zone);
    }

    // Update station
    @PutMapping("/{id}")
    public Station updateStation(
            @PathVariable Long id,
            @RequestBody Station station) {

        return stationService.updateStation(id, station);
    }

    // Delete station
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteStation(
            @PathVariable Long id) {

        stationService.deleteStation(id);

        return ResponseEntity.ok(
                Map.of("message", "Station deleted successfully"));
    }
}