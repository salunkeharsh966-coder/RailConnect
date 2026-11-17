import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Container } from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../context/ToastContext";
import { getAllTrains } from "../../services/trainService";
import {
  addCoach,
  createFormation,
  deleteCoach,
  getCoachesByTrain,
  updateCoach,
} from "../../services/coachService";

/** CoachManagement — manage the coaches of a train. */

const COACH_TYPES = ["SL", "3A", "2A", "1A", "CC", "EC", "2S", "GEN", "PC"];
const CATEGORIES = ["PASSENGER", "LUGGAGE", "PANTRY", "POWER", "BRAKE"];
const FORMATIONS = ["STANDARD", "EXPRESS", "SHATABDI", "RAJDHANI"];

const EMPTY = {
  coachNumber: "",
  coachType: "SL",
  coachCategory: "PASSENGER",
  coachPosition: "",
  totalSeats: "72",
  reservable: true,
  reservationAllowed: true,
};

const CoachManagement = () => {
  const { toast } = useToast();
  const [trains, setTrains] = useState([]);
  const [trainId, setTrainId] = useState("");
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formation, setFormation] = useState("STANDARD");
  const [forming, setForming] = useState(false);

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

  const loadCoaches = useCallback(async () => {
    if (!trainId) {
      setCoaches([]);
      return;
    }
    setListLoading(true);
    try {
      setCoaches(await getCoachesByTrain(trainId));
    } catch (err) {
      toast.error(err.message || "Could not load coaches.");
      setCoaches([]);
    } finally {
      setListLoading(false);
    }
  }, [trainId, toast]);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const openCreate = () => {
    setEditing("new");
    setForm({ ...EMPTY, coachPosition: String(coaches.length + 1) });
  };

  const openEdit = (coach) => {
    setEditing(coach.id);
    setForm({
      coachNumber: coach.coachNumber ?? "",
      coachType: coach.coachType ?? "SL",
      coachCategory: coach.coachCategory ?? "PASSENGER",
      coachPosition: String(coach.coachPosition ?? ""),
      totalSeats: String(coach.totalSeats ?? ""),
      reservable: Boolean(coach.reservable),
      reservationAllowed: Boolean(coach.reservationAllowed),
    });
  };

  const save = async () => {
    if (!form.coachNumber.trim()) {
      toast.error("Coach number is required.");
      return;
    }
    setSaving(true);
    const payload = {
      coachNumber: form.coachNumber.trim(),
      coachType: form.coachType,
      coachCategory: form.coachCategory,
      coachPosition:
        form.coachPosition === "" ? null : Number(form.coachPosition),
      totalSeats: form.totalSeats === "" ? null : Number(form.totalSeats),
      reservable: form.reservable,
      reservationAllowed: form.reservationAllowed,
    };
    try {
      if (editing === "new") {
        await addCoach(trainId, payload);
        toast.success("Coach added.");
      } else {
        await updateCoach(editing, payload);
        toast.success("Coach updated.");
      }
      setEditing(null);
      await loadCoaches();
    } catch (err) {
      toast.error(err.message || "Could not save the coach.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCoach(deleteTarget.id);
      toast.success("Coach deleted.");
      setDeleteTarget(null);
      await loadCoaches();
    } catch (err) {
      toast.error(err.message || "Could not delete the coach.");
    }
  };

  const buildFormation = async () => {
    if (!trainId) return;
    setForming(true);
    try {
      await createFormation(trainId, formation);
      toast.success(`${formation} formation created.`);
      await loadCoaches();
    } catch (err) {
      toast.error(err.message || "Could not create the formation.");
    } finally {
      setForming(false);
    }
  };

  if (loading) return <Loader message="Loading…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <Container size={22} aria-hidden="true" /> Coaches
        </h1>
        <p>Manage the coach composition of each train.</p>
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
        <Button
          variant="primary"
          icon={Plus}
          onClick={openCreate}
          disabled={!trainId}
        >
          Add coach
        </Button>
      </div>

      <div className="card card-pad mb-6">
        <h3 className="card-title">Quick formation</h3>
        <p className="text-sm text-muted mb-4">
          Generate a standard set of coaches for this train in one step.
        </p>
        <div className="flex gap-3 wrap">
          <select
            className="select select-sm"
            value={formation}
            onChange={(e) => setFormation(e.target.value)}
            aria-label="Formation type"
          >
            {FORMATIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            loading={forming}
            onClick={buildFormation}
            disabled={!trainId}
          >
            Create formation
          </Button>
        </div>
      </div>

      {listLoading && <Loader message="Loading coaches…" />}

      {!listLoading && coaches.length === 0 && (
        <EmptyState
          icon={Container}
          title="No coaches"
          message="This train has no coaches yet."
        />
      )}

      {!listLoading && coaches.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Number</th>
                <th>Type</th>
                <th>Category</th>
                <th>Seats</th>
                <th>Reservable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => (
                <tr key={coach.id}>
                  <td className="mono">{coach.coachPosition ?? "—"}</td>
                  <td className="mono">{coach.coachNumber}</td>
                  <td>{coach.coachType}</td>
                  <td>{coach.coachCategory}</td>
                  <td className="mono">{coach.totalSeats ?? "—"}</td>
                  <td>
                    <span
                      className={`badge ${
                        coach.reservable ? "badge-success" : "badge-neutral"
                      }`}
                    >
                      {coach.reservable ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(coach)}
                        aria-label={`Edit ${coach.coachNumber}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        onClick={() => setDeleteTarget(coach)}
                        aria-label={`Delete ${coach.coachNumber}`}
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
        title={editing === "new" ? "Add coach" : "Edit coach"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save coach
            </Button>
          </>
        }
      >
        <div className="admin-form-grid">
          <Input
            label="Coach number"
            value={form.coachNumber}
            onChange={(e) =>
              setForm((p) => ({ ...p, coachNumber: e.target.value }))
            }
            placeholder="S1"
            required
          />
          <Input
            label="Position"
            type="number"
            value={form.coachPosition}
            onChange={(e) =>
              setForm((p) => ({ ...p, coachPosition: e.target.value }))
            }
          />
          <Select
            label="Coach type"
            value={form.coachType}
            onChange={(e) =>
              setForm((p) => ({ ...p, coachType: e.target.value }))
            }
            options={COACH_TYPES.map((t) => ({ value: t, label: t }))}
            placeholder=""
          />
          <Select
            label="Category"
            value={form.coachCategory}
            onChange={(e) =>
              setForm((p) => ({ ...p, coachCategory: e.target.value }))
            }
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            placeholder=""
          />
          <Input
            label="Total seats"
            type="number"
            value={form.totalSeats}
            onChange={(e) =>
              setForm((p) => ({ ...p, totalSeats: e.target.value }))
            }
          />
          <div className="field-full flex gap-4 wrap">
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={form.reservable}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reservable: e.target.checked }))
                }
              />
              <span className="text-sm">Reservable</span>
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={form.reservationAllowed}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    reservationAllowed: e.target.checked,
                  }))
                }
              />
              <span className="text-sm">Reservation allowed</span>
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete coach?"
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
            Delete coach <strong>{deleteTarget.coachNumber}</strong>? Its seats
            will be removed too. This cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default CoachManagement;
