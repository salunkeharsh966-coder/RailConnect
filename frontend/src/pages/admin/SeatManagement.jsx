import { useCallback, useEffect, useState } from "react";
import { Armchair, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../context/ToastContext";
import { getAllTrains } from "../../services/trainService";
import { getCoachesByTrain } from "../../services/coachService";
import {
  addSeat,
  deleteSeat,
  generateMissingSeats,
  getSeatsByCoach,
  updateSeat,
} from "../../services/seatService";

/** SeatManagement — manage the seats of a coach. */

const BERTH_TYPES = [
  "LOWER",
  "MIDDLE",
  "UPPER",
  "SIDE_LOWER",
  "SIDE_UPPER",
  "WINDOW",
  "AISLE",
];
const SEAT_STATUSES = ["AVAILABLE", "OCCUPIED", "BLOCKED"];

const EMPTY = {
  seatNumber: "",
  seatLabel: "",
  berthType: "LOWER",
  seatRow: "",
  seatColumn: "",
  seatStatus: "AVAILABLE",
};

const SeatManagement = () => {
  const { toast } = useToast();
  const [trains, setTrains] = useState([]);
  const [trainId, setTrainId] = useState("");
  const [coaches, setCoaches] = useState([]);
  const [coachId, setCoachId] = useState("");
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const t = await getAllTrains();
        setTrains(t);
        if (t.length > 0) setTrainId(String(t[0].id));
      } catch (err) {
        setError(err.message || "Unable to load trains");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!trainId) {
        setCoaches([]);
        setCoachId("");
        return;
      }
      try {
        const c = await getCoachesByTrain(trainId);
        setCoaches(c);
        setCoachId(c.length > 0 ? String(c[0].id) : "");
      } catch (err) {
        toast.error(err.message || "Could not load coaches.");
        setCoaches([]);
        setCoachId("");
      }
    })();
  }, [trainId, toast]);

  const loadSeats = useCallback(async () => {
    if (!coachId) {
      setSeats([]);
      return;
    }
    setSeatsLoading(true);
    try {
      setSeats(await getSeatsByCoach(coachId));
    } catch (err) {
      toast.error(err.message || "Could not load seats.");
      setSeats([]);
    } finally {
      setSeatsLoading(false);
    }
  }, [coachId, toast]);

  useEffect(() => {
    loadSeats();
  }, [loadSeats]);

  const openCreate = () => {
    setEditing("new");
    setForm({ ...EMPTY, seatNumber: String(seats.length + 1) });
  };

  const openEdit = (seat) => {
    setEditing(seat.id);
    setForm({
      seatNumber: String(seat.seatNumber ?? ""),
      seatLabel: seat.seatLabel ?? "",
      berthType: seat.berthType ?? "LOWER",
      seatRow:
        seat.seatRow === null || seat.seatRow === undefined
          ? ""
          : String(seat.seatRow),
      seatColumn:
        seat.seatColumn === null || seat.seatColumn === undefined
          ? ""
          : String(seat.seatColumn),
      seatStatus: seat.seatStatus ?? "AVAILABLE",
    });
  };

  const save = async () => {
    if (!form.seatNumber) {
      toast.error("Seat number is required.");
      return;
    }
    setSaving(true);
    const payload = {
      seatNumber: Number(form.seatNumber),
      seatLabel: form.seatLabel || null,
      berthType: form.berthType,
      seatRow: form.seatRow === "" ? null : Number(form.seatRow),
      seatColumn: form.seatColumn === "" ? null : Number(form.seatColumn),
      seatStatus: form.seatStatus,
    };
    try {
      if (editing === "new") {
        await addSeat(coachId, payload);
        toast.success("Seat added.");
      } else {
        await updateSeat(editing, payload);
        toast.success("Seat updated.");
      }
      setEditing(null);
      await loadSeats();
    } catch (err) {
      toast.error(err.message || "Could not save the seat.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSeat(deleteTarget.id);
      toast.success("Seat deleted.");
      setDeleteTarget(null);
      await loadSeats();
    } catch (err) {
      toast.error(err.message || "Could not delete the seat.");
    }
  };

  const generate = async () => {
    if (!coachId) return;
    setGenerating(true);
    try {
      await generateMissingSeats(coachId);
      toast.success("Missing seats generated.");
      await loadSeats();
    } catch (err) {
      toast.error(err.message || "Could not generate seats.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loader message="Loading…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <Armchair size={22} aria-hidden="true" /> Seats
        </h1>
        <p>Manage the seats inside each coach.</p>
      </div>

      <div className="admin-toolbar">
        <Select
          label="Train"
          value={trainId}
          onChange={(e) => setTrainId(e.target.value)}
          options={trains.map((t) => ({
            value: String(t.id),
            label: `${t.trainName} (#${t.trainNumber})`,
          }))}
          placeholder="Select a train"
        />
        <Select
          label="Coach"
          value={coachId}
          onChange={(e) => setCoachId(e.target.value)}
          options={coaches.map((c) => ({
            value: String(c.id),
            label: `${c.coachNumber} (${c.coachType})`,
          }))}
          placeholder="Select a coach"
        />
        <div className="flex gap-2 wrap">
          <Button
            variant="secondary"
            icon={Sparkles}
            loading={generating}
            onClick={generate}
            disabled={!coachId}
          >
            Generate missing
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={openCreate}
            disabled={!coachId}
          >
            Add seat
          </Button>
        </div>
      </div>

      {seatsLoading && <Loader message="Loading seats…" />}

      {!seatsLoading && seats.length === 0 && (
        <EmptyState
          icon={Armchair}
          title="No seats"
          message="This coach has no seats yet. Add one or generate the missing set."
        />
      )}

      {!seatsLoading && seats.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Label</th>
                <th>Berth</th>
                <th>Row</th>
                <th>Col</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((seat) => (
                <tr key={seat.id}>
                  <td className="mono">{seat.seatNumber}</td>
                  <td className="mono">{seat.seatLabel || "—"}</td>
                  <td>{seat.berthType || "—"}</td>
                  <td className="mono">{seat.seatRow ?? "—"}</td>
                  <td className="mono">{seat.seatColumn ?? "—"}</td>
                  <td>
                    <span
                      className={`badge ${
                        seat.seatStatus === "AVAILABLE"
                          ? "badge-success"
                          : seat.seatStatus === "OCCUPIED"
                          ? "badge-warning"
                          : "badge-neutral"
                      }`}
                    >
                      {seat.seatStatus}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(seat)}
                        aria-label={`Edit seat ${seat.seatNumber}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        onClick={() => setDeleteTarget(seat)}
                        aria-label={`Delete seat ${seat.seatNumber}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add seat" : "Edit seat"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save seat
            </Button>
          </>
        }
      >
        <div className="admin-form-grid">
          <Input
            label="Seat number"
            type="number"
            value={form.seatNumber}
            onChange={(e) =>
              setForm((p) => ({ ...p, seatNumber: e.target.value }))
            }
            required
          />
          <Input
            label="Seat label"
            value={form.seatLabel}
            onChange={(e) =>
              setForm((p) => ({ ...p, seatLabel: e.target.value }))
            }
            placeholder="1-LB"
          />
          <Select
            label="Berth type"
            value={form.berthType}
            onChange={(e) =>
              setForm((p) => ({ ...p, berthType: e.target.value }))
            }
            options={BERTH_TYPES.map((b) => ({ value: b, label: b }))}
            placeholder=""
          />
          <Select
            label="Status"
            value={form.seatStatus}
            onChange={(e) =>
              setForm((p) => ({ ...p, seatStatus: e.target.value }))
            }
            options={SEAT_STATUSES.map((s) => ({ value: s, label: s }))}
            placeholder=""
          />
          <Input
            label="Row"
            type="number"
            value={form.seatRow}
            onChange={(e) => setForm((p) => ({ ...p, seatRow: e.target.value }))}
          />
          <Input
            label="Column"
            type="number"
            value={form.seatColumn}
            onChange={(e) =>
              setForm((p) => ({ ...p, seatColumn: e.target.value }))
            }
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete seat?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p>
            Delete seat <strong>{deleteTarget.seatNumber}</strong>? This cannot
            be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default SeatManagement;
