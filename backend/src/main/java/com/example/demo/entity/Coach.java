
package com.example.demo.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "coaches",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_train_coach_number",
            columnNames = {"train_id", "coach_number"}
        ),
        @UniqueConstraint(
            name = "uk_train_coach_position",
            columnNames = {"train_id", "coach_position"}
        )
    }
)
public class Coach {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "train_id", nullable = false)
    private Train train;

    @Column(name = "coach_number", nullable = false)
    private String coachNumber;

    @Column(name = "coach_type", nullable = false)
    private String coachType;

    @Column(name = "totalSeats", nullable = false)
    private Integer totalSeats;

    // Position of coach in the train formation.
    @Column(name = "coach_position")
    private Integer coachPosition;

    // PASSENGER, GENERAL, PANTRY, LUGGAGE, BRAKE, POWER.
    @Column(name = "coach_category")
    private String coachCategory;

    // Existing records with null are treated as reservable.
    @Column(name = "reservation_allowed")
    private Boolean reservationAllowed = true;

    public Coach() {
    }

    public Long getId() {
        return id;
    }

    public Train getTrain() {
        return train;
    }

    public void setTrain(Train train) {
        this.train = train;
    }

    public String getCoachNumber() {
        return coachNumber;
    }

    public void setCoachNumber(String coachNumber) {
        this.coachNumber = coachNumber;
    }

    public String getCoachType() {
        return coachType;
    }

    public void setCoachType(String coachType) {
        this.coachType = coachType;
    }

    public Integer getTotalSeats() {
        return totalSeats;
    }

    public void setTotalSeats(Integer totalSeats) {
        this.totalSeats = totalSeats;
    }

    public Integer getCoachPosition() {
        return coachPosition;
    }

    public void setCoachPosition(Integer coachPosition) {
        this.coachPosition = coachPosition;
    }

    public String getCoachCategory() {
        return coachCategory;
    }

    public void setCoachCategory(String coachCategory) {
        this.coachCategory = coachCategory;
    }

    public Boolean getReservationAllowed() {
        return reservationAllowed == null
                ? Boolean.TRUE
                : reservationAllowed;
    }

    public void setReservationAllowed(Boolean reservationAllowed) {
        this.reservationAllowed = reservationAllowed;
    }

    public boolean isReservable() {
        return !Boolean.FALSE.equals(reservationAllowed);
    }
}
