
package com.example.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "payments",
    indexes = {
        @Index(name = "idx_payment_order_id", columnList = "order_id"),
        @Index(name = "idx_payment_status", columnList = "status"),
        @Index(name = "idx_refund_status", columnList = "refund_status")
    }
)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    @JsonIgnoreProperties({
        "user",
        "train",
        "hibernateLazyInitializer",
        "handler"
    })
    private Booking booking;

    @Column(name = "order_id", unique = true, length = 100)
    private String orderId;

    @Column(name = "payment_id", unique = true, length = 150)
    private String paymentId;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false, length = 30)
    private String paymentMethod;

    @Column(nullable = false, length = 30)
    private String status;

    private LocalDateTime paymentDate;

    // ==================================================
    // REFUND DETAILS
    // ==================================================

    @Column(name = "refund_id", unique = true, length = 100)
    private String refundId;

    @Column(name = "refund_status", length = 30)
    private String refundStatus;

    @Column(name = "refund_amount_paise")
    private Long refundAmountPaise;

    @Column(name = "refund_receipt", unique = true, length = 100)
    private String refundReceipt;

    @Column(name = "refund_requested_at")
    private LocalDateTime refundRequestedAt;

    @Column(name = "refund_processed_at")
    private LocalDateTime refundProcessedAt;

    @Column(name = "refund_error", length = 1000)
    private String refundError;

    // ==================================================
    // CONSTRUCTOR
    // ==================================================

    public Payment() {
    }

    // ==================================================
    // BASIC GETTERS AND SETTERS
    // ==================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Booking getBooking() {
        return booking;
    }

    public void setBooking(Booking booking) {
        this.booking = booking;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDateTime paymentDate) {
        this.paymentDate = paymentDate;
    }

    // ==================================================
    // REFUND GETTERS AND SETTERS
    // ==================================================

    public String getRefundId() {
        return refundId;
    }

    public void setRefundId(String refundId) {
        this.refundId = refundId;
    }

    public String getRefundStatus() {
        return refundStatus;
    }

    public void setRefundStatus(String refundStatus) {
        this.refundStatus = refundStatus;
    }

    public Long getRefundAmountPaise() {
        return refundAmountPaise;
    }

    public void setRefundAmountPaise(Long refundAmountPaise) {
        this.refundAmountPaise = refundAmountPaise;
    }

    public String getRefundReceipt() {
        return refundReceipt;
    }

    public void setRefundReceipt(String refundReceipt) {
        this.refundReceipt = refundReceipt;
    }

    public LocalDateTime getRefundRequestedAt() {
        return refundRequestedAt;
    }

    public void setRefundRequestedAt(LocalDateTime refundRequestedAt) {
        this.refundRequestedAt = refundRequestedAt;
    }

    public LocalDateTime getRefundProcessedAt() {
        return refundProcessedAt;
    }

    public void setRefundProcessedAt(LocalDateTime refundProcessedAt) {
        this.refundProcessedAt = refundProcessedAt;
    }

    public String getRefundError() {
        return refundError;
    }

    public void setRefundError(String refundError) {
        this.refundError = refundError;
    }
}
