package com.example.demo.controller;

import com.example.demo.entity.Train;
import com.example.demo.service.TrainService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trains")
@CrossOrigin(origins = "*")
public class TrainController {

    private final TrainService trainService;

    public TrainController(TrainService trainService) {
        this.trainService = trainService;
    }

    // Get all trains
    @GetMapping
    public ResponseEntity<List<Train>> getAllTrains() {
        return ResponseEntity.ok(trainService.getAllTrains());
    }

    // Get a train by ID
    @GetMapping("/{id}")
    public ResponseEntity<Train> getTrainById(
            @PathVariable Long id) {

        Train train = trainService.getTrainById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Train not found with ID: " + id));

        return ResponseEntity.ok(train);
    }

    // Search trains by source and destination
    @GetMapping("/search")
    public ResponseEntity<List<Train>> searchTrains(
            @RequestParam String source,
            @RequestParam String destination) {

        List<Train> trains =
                trainService.searchTrains(source, destination);

        return ResponseEntity.ok(trains);
    }

    // Add a train
    @PostMapping
    public ResponseEntity<Train> addTrain(
            @RequestBody Train train) {

        Train savedTrain = trainService.addTrain(train);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedTrain);
    }

    // Update a train
    @PutMapping("/{id}")
    public ResponseEntity<Train> updateTrain(
            @PathVariable Long id,
            @RequestBody Train updatedTrain) {

        Train train = trainService.updateTrain(id, updatedTrain);

        return ResponseEntity.ok(train);
    }

    // Delete a train
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrain(
            @PathVariable Long id) {

        trainService.deleteTrain(id);

        return ResponseEntity.noContent().build();
    }
}