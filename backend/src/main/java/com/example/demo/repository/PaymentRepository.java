
package com.example.demo.repository;

import com.example.demo.entity.Booking;
import com.example.demo.entity.Payment;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByBooking(Booking booking);

    Optional<Payment> findByOrderId(String orderId);

    Optional<Payment> findByPaymentId(String paymentId);

    boolean existsByOrderId(String orderId);

    // Lock the payment record while starting a refund.
    // Helps prevent concurrent cancellation requests
    // from starting separate refund operations.

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        "SELECT p FROM Payment p "
        + "WHERE p.booking.id = :bookingId"
    )
    Optional<Payment> findByBookingIdForUpdate(
            @Param("bookingId") Long bookingId
    );
}
