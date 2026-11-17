import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Info, RefreshCw } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import BookingSteps from "../components/common/BookingSteps";
import CoachSelector from "../components/booking/CoachSelector";
import SeatLayout from "../components/booking/SeatLayout";
import SeatLegend from "../components/booking/SeatLegend";
import JourneySummaryCard from "../components/booking/JourneySummaryCard";
import { useBooking } from "../context/BookingContext";
import { useToast } from "../context/ToastContext";
import { getCoachesByTrain } from "../services/coachService";
import { getSeatsByCoach } from "../services/seatService";
import { checkSeatAvailability } from "../services/journeySeatService";
import { availableClasses } from "../utils/coachUtils";
import { MAX_PASSENGERS } from "../utils/constants";

/**
 * SeatSelectionPage.
 *
 * Availability is checked PER SEAT against the journey segment, not against a
 * coach-level flag. Each seat's status comes from
 * GET /api/journey-seat-reservations/availability, which answers the only
 * question that matters: is this berth free for MY segment of the route?
 */

const SeatSelectionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft, setClassAndCoach, setSelectedSeats } = useBooking();

  const travelClass = searchParams.get("class") || draft.travelClass || "";
  const coachIdParam = searchParams.get("coach") || "";

  const [coaches, setCoaches] = useState([]);
  const [coach, setCoach] = useState(null);
  const [seats, setSeats] = useState([]);
  const [availability, setAvailability] = useState({});
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const { train, fromStop, toStop, journeyDate } = draft;

  // Load the train's coaches once.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!train?.id) {
        setError("Your booking session has expired. Please search again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await getCoachesByTrain(train.id);
        if (cancelled) return;
        setCoaches(data);

        const groups = availableClasses(data);
        const group =
          groups.find((g) => g.code === travelClass) || groups[0] || null;

        if (group) {
          const preferred =
            group.coaches.find((c) => String(c.id) === String(coachIdParam)) ||
            group.coaches[0];
          setCoach(preferred);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load coaches");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [train?.id]);

  // Load seats + availability whenever the coach changes.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!coach?.id || !train?.id || !fromStop || !toStop) return;

      setSeatsLoading(true);
      setSelected([]);
      try {
        const seatList = await getSeatsByCoach(coach.id);
        if (cancelled) return;
        setSeats(seatList);

        // Check every seat's availability for this journey segment.
        const entries = await Promise.all(
          seatList.map(async (seat) => {
            try {
              const ok = await checkSeatAvailability({
                trainId: train.id,
                seatId: seat.id,
                journeyDate,
                fromStopOrder: fromStop.stopOrder,
                toStopOrder: toStop.stopOrder,
              });
              return [String(seat.id), ok];
            } catch {
              // If the check fails, treat the seat as unavailable rather than
              // offering a berth we cannot confirm.
              return [String(seat.id), false];
            }
          })
        );

        if (cancelled) return;
        setAvailability(Object.fromEntries(entries));
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || "Unable to load seats");
          setSeats([]);
        }
      } finally {
        if (!cancelled) setSeatsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id, train?.id, fromStop?.stopOrder, toStop?.stopOrder, journeyDate]);

  const isAvailable = (seatId) => availability[String(seatId)] === true;

  const availableCount = useMemo(
    () => seats.filter((s) => isAvailable(s.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seats, availability]
  );

  const toggleSeat = (seat) => {
    setSelected((prev) => {
      const exists = prev.some((s) => String(s.id) === String(seat.id));
      if (exists) {
        return prev.filter((s) => String(s.id) !== String(seat.id));
      }
      if (prev.length >= MAX_PASSENGERS) {
        toast.warning(`You can select at most ${MAX_PASSENGERS} seats.`);
        return prev;
      }
      return [...prev, seat];
    });
  };

  const recheck = async () => {
    if (!coach?.id) return;
    setChecking(true);
    try {
      const entries = await Promise.all(
        seats.map(async (seat) => {
          try {
            const ok = await checkSeatAvailability({
              trainId: train.id,
              seatId: seat.id,
              journeyDate,
              fromStopOrder: fromStop.stopOrder,
              toStopOrder: toStop.stopOrder,
            });
            return [String(seat.id), ok];
          } catch {
            return [String(seat.id), false];
          }
        })
      );
      setAvailability(Object.fromEntries(entries));
      toast.success("Availability refreshed.");
    } finally {
      setChecking(false);
    }
  };

  const proceed = () => {
    if (selected.length === 0) {
      toast.error("Please select at least one seat to continue.");
      return;
    }

    setClassAndCoach(travelClass, coach);
    setSelectedSeats(selected);
    navigate("/booking/passengers");
  };

  if (loading) {
    return (
      <div className="container">
        <Loader message="Loading coach layout…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <ErrorState
          message={error}
          onRetry={() => navigate("/trains")}
          retryLabel="Back to search"
        />
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title="Choose your seats"
        subtitle="Availability is checked for your exact journey segment."
        crumbs={[
          { label: "Home", to: "/" },
          { label: "Search trains", to: "/trains" },
          { label: "Seats" },
        ]}
      />

      <BookingSteps current="seats" />

      <div className="booking-grid">
        <div className="booking-main">
          <JourneySummaryCard
            draft={draft}
            travelClass={travelClass}
            coach={coach}
          />

          <section className="card card-pad">
            <div className="flex-between wrap gap-3">
              <h2 className="card-title">Coach</h2>
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                loading={checking}
                onClick={recheck}
              >
                Refresh availability
              </Button>
            </div>

            <CoachSelector
              coaches={
                availableClasses(coaches).find((g) => g.code === travelClass)
                  ?.coaches || []
              }
              selectedCoachId={coach?.id}
              onSelect={setCoach}
            />
          </section>

          <section className="card card-pad">
            <div className="flex-between wrap gap-3">
              <h2 className="card-title">Seat layout</h2>
              <span className="text-sm text-muted">
                {availableCount} of {seats.length} seats free for this journey
              </span>
            </div>

            <SeatLegend />

            {seatsLoading && <Loader message="Checking seat availability…" />}

            {!seatsLoading && (
              <SeatLayout
                seats={seats}
                selectedSeatIds={selected.map((s) => s.id)}
                isAvailable={isAvailable}
                onToggle={toggleSeat}
                maxSelectable={MAX_PASSENGERS}
              />
            )}
          </section>
        </div>

        <aside className="booking-side">
          <section className="card card-pad sticky-side">
            <h2 className="card-title">Your selection</h2>

            {selected.length === 0 && (
              <p className="text-sm text-muted">
                No seats selected yet. Tap a seat in the layout to add it.
              </p>
            )}

            {selected.length > 0 && (
              <ul className="selected-seats">
                {selected.map((seat) => (
                  <li key={seat.id}>
                    <span className="mono">
                      {coach?.coachNumber || coach?.coachName} / {seat.seatNumber}
                    </span>
                    <span className="text-xs text-muted">{seat.berthType}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="alert alert-info mt-4" role="note">
              <Info size={16} aria-hidden="true" />
              <span className="text-xs">
                Seats are held only after payment is verified. If a berth is
                taken in the meantime, the server will reject the reservation.
              </span>
            </div>

            <Button
              variant="primary"
              block
              iconRight={ArrowRight}
              className="mt-4"
              disabled={selected.length === 0}
              onClick={proceed}
            >
              Continue with {selected.length || 0} seat
              {selected.length === 1 ? "" : "s"}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SeatSelectionPage;
