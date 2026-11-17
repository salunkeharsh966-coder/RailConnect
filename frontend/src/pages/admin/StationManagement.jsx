import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../context/ToastContext";
import {
  addStation,
  deleteStation,
  getAllStations,
  updateStation,
} from "../../services/stationService";

/**
 * StationManagement — CRUD over stations.
 *
 * The dataset is large (~4,100 rows), so the table is paginated and filtered
 * client-side rather than rendering every row at once.
 */

const PAGE_SIZE = 25;

const EMPTY = {
  stationName: "",
  stationCode: "",
  city: "",
  state: "",
  zone: "",
  address: "",
};

const StationManagement = () => {
  const { toast } = useToast();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setStations(await getAllStations());
    } catch (err) {
      setError(err.message || "Unable to load stations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        String(s.stationName ?? "").toLowerCase().includes(q) ||
        String(s.stationCode ?? "").toLowerCase().includes(q) ||
        String(s.city ?? "").toLowerCase().includes(q)
    );
  }, [stations, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE
  );

  const openCreate = () => {
    setEditing("new");
    setForm(EMPTY);
  };

  const openEdit = (station) => {
    setEditing(station.id);
    setForm({
      stationName: station.stationName ?? "",
      stationCode: station.stationCode ?? "",
      city: station.city ?? "",
      state: station.state ?? "",
      zone: station.zone ?? "",
      address: station.address ?? "",
    });
  };

  const save = async () => {
    if (!form.stationName.trim() || !form.stationCode.trim()) {
      toast.error("Station name and code are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await addStation(form);
        toast.success("Station added.");
      } else {
        await updateStation(editing, form);
        toast.success("Station updated.");
      }
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not save the station.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStation(deleteTarget.id);
      toast.success("Station deleted.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not delete the station.");
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <Building2 size={22} aria-hidden="true" /> Stations
        </h1>
        <p>{stations.length.toLocaleString("en-IN")} stations in the dataset.</p>
      </div>

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search by name, code or city…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          aria-label="Search stations"
        />
        <Button variant="primary" icon={Plus} onClick={openCreate}>
          Add station
        </Button>
      </div>

      {loading && <Loader message="Loading stations…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No stations"
          message="No station matches your search."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((station) => (
                  <tr key={station.id}>
                    <td className="mono">{station.stationCode}</td>
                    <td>{station.stationName}</td>
                    <td>{station.city || "—"}</td>
                    <td>{station.state || "—"}</td>
                    <td>{station.zone || "—"}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(station)}
                          aria-label={`Edit ${station.stationName}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn is-danger"
                          onClick={() => setDeleteTarget(station)}
                          aria-label={`Delete ${station.stationName}`}
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

          <div className="flex-between wrap gap-3 mt-4">
            <span className="text-sm text-muted">
              Page {current} of {totalPages} · {filtered.length.toLocaleString("en-IN")}{" "}
              results
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={current >= totalPages}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add station" : "Edit station"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save station
            </Button>
          </>
        }
      >
        <div className="admin-form-grid">
          <Input
            label="Station name"
            value={form.stationName}
            onChange={(e) =>
              setForm((p) => ({ ...p, stationName: e.target.value }))
            }
            required
          />
          <Input
            label="Station code"
            value={form.stationCode}
            onChange={(e) =>
              setForm((p) => ({ ...p, stationCode: e.target.value }))
            }
            required
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          />
          <Input
            label="State"
            value={form.state}
            onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
          />
          <Input
            label="Zone"
            value={form.zone}
            onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete station?"
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
            Delete <strong>{deleteTarget.stationName}</strong> (
            {deleteTarget.stationCode})? This cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default StationManagement;
