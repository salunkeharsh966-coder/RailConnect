import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import BookingSteps from "../components/common/BookingSteps";
import PassengerForm from "../components/booking/PassengerForm";
import JourneySummaryCard from "../components/booking/JourneySummaryCard";
import { useBooking } from "../context/BookingContext";
import { useToast } from "../context/ToastContext";
import { MAX_PASSENGERS } from "../utils/constants";
import {
  validateAge,
  validateGender,
  validateName,
} from "../utils/validators";

/**
 * PassengerDetailsPage.
 *
 * One passenger per selected seat. The seat-to-passenger mapping is fixed by
 * the order of selection, so the user always knows which berth each passenger
 * is getting. State lives in BookingContext, so going back and forward never
 * loses what was typed.
 */

const emptyPassenger = () => ({ name: "", age: "", gender: "" });

const PassengerDetailsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft, setPassengers } = useBooking();

  const seats = draft.selectedSeats || [];
  const [passengers, setLocalPassengers] = useState(() => {
    if (draft.passengers?.length) return draft.passengers;
    return seats.map(() => emptyPassenger());
  });
  const [errors, setErrors] = useState({});

  // Keep the passenger count in step with the seat count.
  useEffect(() => {
    setLocalPassengers((prev) => {
      if (prev.length === seats.length) return prev;
      if (prev.length < seats.length) {
        return [
          ...prev,
          ...Array.from({ length: seats.length - prev.length }, () =>
            emptyPassenger()
          ),
        ];
      }
      return prev.slice(0, seats.length);
    });
  }, [seats.length]);

  const updatePassenger = (index, next) => {
    setLocalPassengers((prev) => prev.map((p, i) => (i === index ? next : p)));
    setErrors((prev) => ({ ...prev, [index]: {} }));
  };

  const removePassenger = (index) => {
    setLocalPassengers((prev) => prev.filter((_, i) => i !== index));
  };

  const addPassenger = () => {
    if (passengers.length >= MAX_PASSENGERS) {
      toast.warning(`A booking can hold at most ${MAX_PASSENGERS} passengers.`);
      return;
    }
    setLocalPassengers((prev) => [...prev, emptyPassenger()]);
  };

  const validate = () => {
    const next = {};
    let ok = true;

    passengers.forEach((p, index) => {
      const row = {
        name: validateName(p.name) || "",
        age: validateAge(p.age) || "",
        gender: validateGender(p.gender) || "",
      };
      if (row.name || row.age || row.gender) {
        ok = false;
        next[index] = row;
      }
    });

    setErrors(next);
    return ok;
  };

  const proceed = () => {
    if (passengers.length === 0) {
      toast.error("Add at least one passenger to continue.");
      return;
    }

    if (!validate()) {
      toast.error("Please fix the highlighted passenger details.");
      return;
    }

    setPassengers(
      passengers.map((p) => ({
        name: p.name.trim(),
        age: Number(p.age),
        gender: p.gender,
      }))
    );

    navigate("/booking/summary");
  };

  if (seats.length === 0) {
    return (
      <div className="container">
        <PageHeader
          title="Passenger details"
          crumbs={[{ label: "Home", to: "/" }]}
        />
        <EmptyState
          title="No seats selected"
          message="Please choose your seats before adding passengers."
          action={
            <Button variant="primary" onClick={() => navigate("/trains")}>
              Back to search
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title="Passenger details"
        subtitle="One passenger per selected berth."
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Search trains", to: "/trains" },
          { label: "Passengers" },
        ]}
      />

      <BookingSteps current="passengers" />

      <div className="booking-grid">
        <div className="booking-main">
          <JourneySummaryCard
            draft={draft}
            travelClass={draft.travelClass}
            coach={draft.coach}
          />

          {passengers.map((passenger, index) => (
            <PassengerForm
              key={index}
              index={index}
              passenger={passenger}
              seat={seats[index]}
              onChange={updatePassenger}
              onRemove={removePassenger}
              canRemove={passengers.length > 1}
              errors={errors[index] || {}}
            />
          ))}

          {passengers.length < MAX_PASSENGERS && (
            <Button variant="secondary" icon={Plus} onClick={addPassenger}>
              Add another passenger
            </Button>
          )}
        </div>

        <aside className="booking-side">
          <section className="card card-pad sticky-side">
            <h2 className="card-title">Seat allocation</h2>
            <ul className="selected-seats">
              {seats.map((seat, index) => (
                <li key={seat.id}>
                  <span className="mono">
                    {draft.coach?.coachNumber || draft.coach?.coachName} /{" "}
                    {seat.seatNumber}
                  </span>
                  <span className="text-xs text-muted">
                    {passengers[index]?.name || `Passenger ${index + 1}`}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 mt-4">
              <Button
                variant="ghost"
                icon={ArrowLeft}
                onClick={() => navigate("/booking/seats")}
              >
                Back
              </Button>
              <Button
                variant="primary"
                iconRight={ArrowRight}
                className="flex-1"
                onClick={proceed}
              >
                Review booking
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PassengerDetailsPage;
