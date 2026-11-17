
package com.example.demo.repository;

import com.example.demo.entity.JourneySeatReservation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface JourneySeatReservationRepository
        extends JpaRepository<JourneySeatReservation, Long> {

    List<JourneySeatReservation> findByBooking_Id(Long bookingId);

    List<JourneySeatReservation> findByTrain_IdAndJourneyDate(
            Long trainId,
            LocalDate journeyDate
    );

    List<JourneySeatReservation> findByBooking_IdAndJourneyDate(
            Long bookingId,
            LocalDate journeyDate
    );

    List<JourneySeatReservation> findBySeat_Id(Long seatId);

    // Check overlapping reservations.
    // Both CONFIRMED and PENDING reservations block a seat.
    @Query("""
        SELECT r
        FROM JourneySeatReservation r
        WHERE r.train.id = :trainId
          AND r.seat.id = :seatId
          AND r.journeyDate = :journeyDate
          AND UPPER(r.reservationStatus) IN ('CONFIRMED', 'PENDING')
          AND r.fromStopOrder < :toStopOrder
          AND r.toStopOrder > :fromStopOrder
        """)
    List<JourneySeatReservation> findOverlappingReservations(
            @Param("trainId") Long trainId,
            @Param("seatId") Long seatId,
            @Param("journeyDate") LocalDate journeyDate,
            @Param("fromStopOrder") Integer fromStopOrder,
            @Param("toStopOrder") Integer toStopOrder
    );
}
