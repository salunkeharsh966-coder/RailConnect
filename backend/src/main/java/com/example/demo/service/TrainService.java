package com.example.demo.service;

import com.example.demo.entity.Train;
import com.example.demo.repository.TrainRepository;
import com.example.demo.repository.TrainStopRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TrainService {

    private final TrainRepository trainRepository;
    private final TrainStopRepository trainStopRepository;

    public TrainService(
            TrainRepository trainRepository,
            TrainStopRepository trainStopRepository) {

        this.trainRepository = trainRepository;
        this.trainStopRepository = trainStopRepository;
    }

    @Transactional
    public Train addTrain(Train train) {

        if (train == null) {
            throw new IllegalArgumentException(
                    "Train details are required");
        }

        if (train.getTrainNumber() == null
                || train.getTrainNumber().isBlank()) {
            throw new IllegalArgumentException(
                    "Train number is required");
        }

        if (trainRepository.existsByTrainNumber(
                train.getTrainNumber())) {

            throw new IllegalArgumentException(
                    "Train number already exists");
        }

        return trainRepository.save(train);
    }

    @Transactional(readOnly = true)
    public List<Train> getAllTrains() {

        return trainRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Train> getTrainById(Long id) {

        if (id == null) {
            throw new IllegalArgumentException(
                    "Train ID is required");
        }

        return trainRepository.findById(id);
    }

    @Transactional
    public Train updateTrain(Long id, Train updatedTrain) {

        if (id == null) {
            throw new IllegalArgumentException(
                    "Train ID is required");
        }

        if (updatedTrain == null) {
            throw new IllegalArgumentException(
                    "Updated train details are required");
        }

        Train train = trainRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Train not found"));

        String newTrainNumber = updatedTrain.getTrainNumber();

        if (newTrainNumber == null
                || newTrainNumber.isBlank()) {

            throw new IllegalArgumentException(
                    "Train number is required");
        }

        if (!newTrainNumber.equals(train.getTrainNumber())
                && trainRepository.existsByTrainNumber(
                        newTrainNumber)) {

            throw new IllegalArgumentException(
                    "Train number already exists");
        }

        train.setTrainNumber(newTrainNumber);
        train.setTrainName(updatedTrain.getTrainName());
        train.setSource(updatedTrain.getSource());
        train.setDestination(updatedTrain.getDestination());
        train.setDepartureTime(updatedTrain.getDepartureTime());
        train.setArrivalTime(updatedTrain.getArrivalTime());
        train.setTrainType(updatedTrain.getTrainType());

        return trainRepository.save(train);
    }

    @Transactional
    public void deleteTrain(Long id) {

        if (id == null) {
            throw new IllegalArgumentException(
                    "Train ID is required");
        }

        if (!trainRepository.existsById(id)) {
            throw new IllegalArgumentException(
                    "Train not found");
        }

        trainRepository.deleteById(id);
    }

    // Route-aware train search
    @Transactional(readOnly = true)
    public List<Train> searchTrains(
            String source,
            String destination) {

        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException(
                    "Source is required");
        }

        if (destination == null || destination.isBlank()) {
            throw new IllegalArgumentException(
                    "Destination is required");
        }

        String from = source.trim();
        String to = destination.trim();

        if (from.equalsIgnoreCase(to)) {
            throw new IllegalArgumentException(
                    "Source and destination cannot be the same");
        }

        // Existing direct source/destination search
        List<Train> directMatches =
                trainRepository
                        .findBySourceIgnoreCaseAndDestinationIgnoreCase(
                                from, to
                        );

        // New intermediate-station route search
        List<Train> routeMatches =
                trainStopRepository.findTrainsByRoute(
                        from, to
                );

        // Merge results without returning duplicate trains
        Map<Long, Train> uniqueTrains = new LinkedHashMap<>();

        for (Train train : directMatches) {
            uniqueTrains.put(train.getId(), train);
        }

        for (Train train : routeMatches) {
            uniqueTrains.put(train.getId(), train);
        }

        return new ArrayList<>(uniqueTrains.values());
    }
}