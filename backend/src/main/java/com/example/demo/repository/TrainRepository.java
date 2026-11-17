package com.example.demo.repository;

import com.example.demo.entity.Train;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainRepository extends JpaRepository<Train, Long> {

    List<Train> findBySourceIgnoreCaseAndDestinationIgnoreCase(
            String source,
            String destination
    );

    boolean existsByTrainNumber(String trainNumber);
}