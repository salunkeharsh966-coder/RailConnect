
package com.example.demo.repository;

import com.example.demo.entity.Coach;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CoachRepository extends JpaRepository<Coach, Long> {

    // Get coaches belonging to a train
    List<Coach> findByTrain_Id(Long trainId);

    // Get coaches in their actual train formation order
    List<Coach> findByTrain_IdOrderByCoachPositionAsc(Long trainId);

    // Find coach using its train and coach number
    Optional<Coach> findByTrain_IdAndCoachNumber(
            Long trainId,
            String coachNumber
    );

    // Check duplicate coach number
    boolean existsByTrain_IdAndCoachNumber(
            Long trainId,
            String coachNumber
    );

    // Check duplicate coach position within a train
    boolean existsByTrain_IdAndCoachPosition(
            Long trainId,
            Integer coachPosition
    );
}
