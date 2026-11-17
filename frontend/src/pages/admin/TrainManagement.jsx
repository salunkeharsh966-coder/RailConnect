import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, TrainFront } from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../context/ToastContext";
import {
  addTrain,
  deleteTrain,
  getAllTrains,
  updateTrain,
} from "../../services/trainService";

/** TrainManagement — full CRUD over trains. */

const TRAIN_TYPES = [
  "EXPRESS",
  "SUPERFAST",
  "PASSENGER",
  "MIXED",
  "RAJDHANI",
  "SHATABDI",
  "DURONTO",
  "LOCAL",
];

const EMPTY = {
  trainNumber: "",
  trainName: "",
  source: "",
  destination: "",
  departureTime: "",
  arrivalTime: "",
  trainType: "EXPRESS",
};

const TrainManagement = () => {
  const { toast } = useToast();
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setTrains(await getAllTrains());
    } catch (err) {
      setError(err.message || "Unable to load trains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing("new");
    setForm(EMPTY);
  };

  const openEdit = (train) => {
    setEditing(train.id);
    setForm({
      trainNumber: train.trainNumber ?? "",
      trainName: train.trainName ?? "",
      source: train.source ?? "",
      destination: train.destination ?? "",
      departureTime: train.departureTime ?? "",
      arrivalTime: train.arrivalTime ?? "",
      trainType: train.trainType ?? "EXPRESS",
    });
  };

  const save = async () => {
    if (!form.trainNumber.trim() || !form.trainName.trim()) {
      toast.error("Train number and name are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await addTrain(form);
        toast.success("Train added.");
      } else {
        await updateTrain(editing, form);
        toast.success("Train updated.");
      }
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not save the train.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTrain(deleteTarget.id);
      toast.success("Train deleted.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not delete the train.");
    }
  };

  const filtered = trains.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(t.trainName ?? "").toLowerCase().includes(q) ||
      String(t.trainNumber ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <TrainFront size={22} aria-hidden="true" /> Trains
        </h1>
        <p>Add, edit and remove trains in the system.</p>
      </div>

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search by name or number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search trains"
        />
        <Button variant="primary" icon={Plus} onClick={openCreate}>
          Add train
        </Button>
      </div>

      {loading && <Loader message="Loading trains…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={TrainFront}
          title="No trains"
          message="No train matches your search."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>From</th>
                <th>To</th>
                <th>Dep</th>
                <th>Arr</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((train) => (
                <tr key={train.id}>
                  <td className="mono">{train.trainNumber}</td>
                  <td>{train.trainName}</td>
                  <td>{train.source || "—"}</td>
                  <td>{train.destination || "—"}</td>
                  <td className="mono">{train.departureTime || "—"}</td>
                  <td className="mono">{train.arrivalTime || "—"}</td>
                  <td>{train.trainType || "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(train)}
                        aria-label={`Edit ${train.trainName}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        onClick={() => setDeleteTarget(train)}
                        aria-label={`Delete ${train.trainName}`}
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
        title={editing === "new" ? "Add train" : "Edit train"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save train
            </Button>
          </>
        }
      >
        <div className="admin-form-grid">
          <Input
            label="Train number"
            value={form.trainNumber}
            onChange={(e) =>
              setForm((p) => ({ ...p, trainNumber: e.target.value }))
            }
            required
          />
          <Input
            label="Train name"
            value={form.trainName}
            onChange={(e) =>
              setForm((p) => ({ ...p, trainName: e.target.value }))
            }
            required
          />
          <Input
            label="Source"
            value={form.source}
            onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
          />
          <Input
            label="Destination"
            value={form.destination}
            onChange={(e) =>
              setForm((p) => ({ ...p, destination: e.target.value }))
            }
          />
          <Input
            label="Departure (HH:mm)"
            value={form.departureTime}
            onChange={(e) =>
              setForm((p) => ({ ...p, departureTime: e.target.value }))
            }
            placeholder="06:00"
          />
          <Input
            label="Arrival (HH:mm)"
            value={form.arrivalTime}
            onChange={(e) =>
              setForm((p) => ({ ...p, arrivalTime: e.target.value }))
            }
            placeholder="15:00"
          />
          <div className="field-full">
            <Select
              label="Train type"
              value={form.trainType}
              onChange={(e) =>
                setForm((p) => ({ ...p, trainType: e.target.value }))
              }
              options={TRAIN_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder=""
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete train?"
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
            Delete <strong>{deleteTarget.trainName}</strong> (
            {deleteTarget.trainNumber})? This cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default TrainManagement;
