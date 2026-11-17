
package com.example.demo.service;

import com.example.demo.entity.Station;
import com.example.demo.entity.Train;
import com.example.demo.entity.TrainStop;
import com.example.demo.repository.StationRepository;
import com.example.demo.repository.TrainRepository;
import com.example.demo.repository.TrainStopRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TrainStopService {

    private final TrainStopRepository trainStopRepository;
    private final TrainRepository trainRepository;
    private final StationRepository stationRepository;

    public TrainStopService(
            TrainStopRepository trainStopRepository,
            TrainRepository trainRepository,
            StationRepository stationRepository) {
        this.trainStopRepository = trainStopRepository;
        this.trainRepository = trainRepository;
        this.stationRepository = stationRepository;
    }

    @Transactional
    public TrainStop addTrainStop(
            Long trainId, Long stationId, TrainStop trainStop) {

        Train train = trainRepository.findById(trainId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Train not found with ID: " + trainId));

        Station station = stationRepository.findById(stationId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Station not found with ID: " + stationId));

        if (trainStop.getStopOrder() == null
                || trainStop.getStopOrder() < 1) {
            throw new RuntimeException(
                    "Stop order must be greater than zero");
        }

        if (trainStopRepository.existsByTrain_IdAndStopOrder(
                trainId, trainStop.getStopOrder())) {
            throw new RuntimeException(
                    "This stop order is already used by this train");
        }

        if (trainStopRepository.existsByTrain_IdAndStation_Id(
                trainId, stationId)) {
            throw new RuntimeException(
                    "This station is already added to this train's route");
        }

        if (trainStop.getDistanceFromSource() != null
                && trainStop.getDistanceFromSource() < 0) {
            throw new RuntimeException(
                    "Distance cannot be negative");
        }

        trainStop.setTrain(train);
        trainStop.setStation(station);

        return trainStopRepository.save(trainStop);
    }

    @Transactional(readOnly = true)
    public List<TrainStop> getRouteByTrainId(Long trainId) {

        if (!trainRepository.existsById(trainId)) {
            throw new RuntimeException(
                    "Train not found with ID: " + trainId);
        }

        return trainStopRepository
                .findByTrain_IdOrderByStopOrderAsc(trainId);
    }

    @Transactional(readOnly = true)
    public TrainStop getTrainStopById(Long id) {
        return trainStopRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Train stop not found with ID: " + id));
    }

    @Transactional
    public TrainStop updateTrainStop(
            Long id, TrainStop updatedStop) {

        TrainStop existingStop = getTrainStopById(id);

        Long trainId = existingStop.getTrain().getId();

        if (updatedStop.getStopOrder() == null
                || updatedStop.getStopOrder() < 1) {
            throw new RuntimeException(
                    "Stop order must be greater than zero");
        }

        boolean orderUsed =
                trainStopRepository.existsByTrain_IdAndStopOrder(
                        trainId, updatedStop.getStopOrder());

        if (orderUsed
                && !existingStop.getStopOrder()
                        .equals(updatedStop.getStopOrder())) {
            throw new RuntimeException(
                    "This stop order is already used by this train");
        }

        if (updatedStop.getStation() != null
                && updatedStop.getStation().getId() != null) {

            Long stationId = updatedStop.getStation().getId();

            Station station = stationRepository.findById(stationId)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Station not found with ID: " + stationId));

            boolean stationUsed =
                    trainStopRepository
                            .existsByTrain_IdAndStation_IdAndStopOrderNot(
                                    trainId, stationId,
                                    existingStop.getStopOrder());

            if (stationUsed) {
                throw new RuntimeException(
                        "This station is already present in the route");
            }

            existingStop.setStation(station);
        }

        if (updatedStop.getDistanceFromSource() != null
                && updatedStop.getDistanceFromSource() < 0) {
            throw new RuntimeException(
                    "Distance cannot be negative");
        }

        existingStop.setStopOrder(updatedStop.getStopOrder());
        existingStop.setArrivalTime(updatedStop.getArrivalTime());
        existingStop.setDepartureTime(updatedStop.getDepartureTime());
        existingStop.setDistanceFromSource(
                updatedStop.getDistanceFromSource());

        return trainStopRepository.save(existingStop);
    }

    @Transactional
    public void deleteTrainStop(Long id) {
        TrainStop trainStop = getTrainStopById(id);
        trainStopRepository.delete(trainStop);
    }
}

