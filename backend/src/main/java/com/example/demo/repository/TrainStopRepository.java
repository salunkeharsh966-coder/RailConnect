package com.example.demo.repository;

import com.example.demo.entity.Train;
import com.example.demo.entity.TrainStop;
import com.example.demo.entity.Station;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TrainStopRepository
        extends JpaRepository<TrainStop, Long> {

    List<TrainStop> findByTrainOrderByStopOrderAsc(Train train);

    List<TrainStop> findByTrain_IdOrderByStopOrderAsc(Long trainId);

    Optional<TrainStop> findByTrain_IdAndStopOrder(
            Long trainId,
            Integer stopOrder
    );

    Optional<TrainStop> findByTrainAndStation(
            Train train,
            Station station
    );

    boolean existsByTrain_IdAndStation_Id(
            Long trainId,
            Long stationId
    );

    boolean existsByTrain_IdAndStopOrder(
            Long trainId,
            Integer stopOrder
    );

    boolean existsByTrain_IdAndStation_IdAndStopOrderNot(
            Long trainId,
            Long stationId,
            Integer stopOrder
    );

    // Find trains where the boarding stop comes before the destination stop.
    // Supports station name, station code and city searches.
    @Query("""
        SELECT DISTINCT origin.train
        FROM TrainStop origin, TrainStop destination
        WHERE origin.train.id = destination.train.id
          AND origin.stopOrder < destination.stopOrder

          AND (
              LOWER(origin.station.stationName) = LOWER(:source)
              OR LOWER(origin.station.stationCode) = LOWER(:source)
              OR LOWER(origin.station.city) = LOWER(:source)
              OR LOWER(origin.station.stationName)
                    LIKE LOWER(CONCAT('%', :source, '%'))
          )

          AND (
              LOWER(destination.station.stationName) = LOWER(:destination)
              OR LOWER(destination.station.stationCode) = LOWER(:destination)
              OR LOWER(destination.station.city) = LOWER(:destination)
              OR LOWER(destination.station.stationName)
                    LIKE LOWER(CONCAT('%', :destination, '%'))
          )
        """)
    List<Train> findTrainsByRoute(
            @Param("source") String source,
            @Param("destination") String destination
    );
}