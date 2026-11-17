
package com.example.demo.controller;

import com.example.demo.entity.Seat;
import com.example.demo.service.SeatService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seats")
@CrossOrigin(origins = "*")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    // Add a seat to a coach
    @PostMapping("/coach/{coachId}")
    public ResponseEntity<?> addSeat(
            @PathVariable Long coachId,
            @RequestBody Seat seat) {

        try {
            return ResponseEntity.ok(
                    seatService.addSeat(coachId, seat));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Get all seats
    @GetMapping
    public ResponseEntity<List<Seat>> getAllSeats() {
        return ResponseEntity.ok(seatService.getAllSeats());
    }

    // Get seats by coach ID
    @GetMapping("/coach/{coachId}")
    public ResponseEntity<?> getSeatsByCoach(
            @PathVariable Long coachId) {

        try {
            return ResponseEntity.ok(
                    seatService.getSeatsByCoach(coachId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Get a seat by ID
    @GetMapping("/{seatId}")
    public ResponseEntity<?> getSeatById(
            @PathVariable Long seatId) {

        try {
            return ResponseEntity.ok(
                    seatService.getSeatById(seatId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Update a seat
    @PutMapping("/{seatId}")
    public ResponseEntity<?> updateSeat(
            @PathVariable Long seatId,
            @RequestBody Seat seat) {

        try {
            return ResponseEntity.ok(
                    seatService.updateSeat(seatId, seat));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Delete a seat
    @DeleteMapping("/{seatId}")
    public ResponseEntity<?> deleteSeat(
            @PathVariable Long seatId) {

        try {
            seatService.deleteSeat(seatId);
            return ResponseEntity.ok("Seat deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Generate only missing seats up to coach.totalSeats
    @PostMapping("/generate-missing/{coachId}")
    public ResponseEntity<?> generateMissingSeats(
            @PathVariable Long coachId) {

        try {
            Map<String, Object> result =
                    seatService.generateMissingSeats(coachId);

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
