
package com.example.demo.repository;

import com.example.demo.entity.Seat;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    // Get all seats belonging to a coach.
    List<Seat> findByCoach_Id(Long coachId);

    // Get seats in ascending seat-number order.
    List<Seat> findByCoach_IdOrderBySeatNumberAsc(Long coachId);

    // Check whether a seat number already exists in a coach.
    boolean existsByCoach_IdAndSeatNumber(
            Long coachId,
            Integer seatNumber
    );

    // Find a specific seat inside a coach.
    Optional<Seat> findByCoach_IdAndSeatNumber(
            Long coachId,
            Integer seatNumber
    );

    // Lock a seat row during reservation to prevent
    // concurrent bookings of the same seat.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.id = :seatId")
    Optional<Seat> findByIdForUpdate(
            @Param("seatId") Long seatId
    );
}
