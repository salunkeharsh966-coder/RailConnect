package com.example.demo.repository;

import com.example.demo.entity.Station;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StationRepository extends JpaRepository<Station, Long> {

    Optional<Station> findByStationCodeIgnoreCase(String stationCode);

    List<Station> findByStationNameContainingIgnoreCase(String stationName);

    List<Station> findByCityIgnoreCase(String city);

    List<Station> findByStateIgnoreCase(String state);

    List<Station> findByZoneIgnoreCase(String zone);

    boolean existsByStationCodeIgnoreCase(String stationCode);
}