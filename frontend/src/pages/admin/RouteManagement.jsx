import { useCallback, useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Route, Trash2 } from "lucide-react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../context/ToastContext";
import { getAllTrains } from "../../services/trainService";
import { getAllStations } from "../../services/stationService";
import {
  addTrainStop,
  deleteTrainStop,
  getTrainRoute,
  updateTrainStop,
} from "../../services/trainStopService";

/**
 * RouteManagement — manage the ordered stops (route) of a train.
 *
 * Pick a train, then add / edit / remove its stops. stopOrder defines the
 * sequence; the backend uses it for journey validation and seat reservation.
 */

const EMPTY = {
  stationId: "",
  stopOrder: "",
  arrivalTime: "",
  departureTime: "",
  distanceFromSource: "",
};

const RouteManagement = () => {
  const { toast } = useToast();
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [trainId, setTrainId] = useState("");
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [t, s] = await Promise.all([getAllTrains(), getAllStations()]);
        setTrains(t);
        setStations(s);
        if (t.length > 0) setTrainId(String(t[0].id));
      } catch (err) {
        setError(err.message || "Unable to load trains and stations");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadRoute = useCallback(async () => {
    if (!trainId) {
      setRoute([]);
      return;
    }
    setRouteLoading(true);
    try {
      setRoute(await getTrainRoute(trainId));
    } catch (err) {
      toast.error(err.message || "Could not load the route.");
      setRoute([]);
    } finally {
      setRouteLoading(false);
    }
  }, [trainId, toast]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  const stationOptions = stations.map((s) => ({
    value: String(s.id),
    label: `${s.stationName} (${s.stationCode})`,
  }));

  const openCreate = () => {
    setEditing("new");
    setForm({
      ...EMPTY,
      stopOrder: String(route.length + 1),
    });
  };

  const openEdit = (stop) => {
    setEditing(stop.id);
    setForm({
      stationId: String(stop.station?.id ?? ""),
      stopOrder: String(stop.stopOrder ?? ""),
      arrivalTime: stop.arrivalTime ?? "",
      departureTime: stop.departureTime ?? "",
      distanceFromSource:
        stop.distanceFromSource === null ||
        stop.distanceFromSource === undefined
          ? ""
          : String(stop.distanceFromSource),
    });
  };

  const save = async () => {
    if (!form.stationId || !form.stopOrder) {
      toast.error("Station and stop order are required.");
      return;
    }
    setSaving(true);
    const payload = {
      stopOrder: Number(form.stopOrder),
      arrivalTime: form.arrivalTime || null,
      departureTime: form.departureTime || null,
      distanceFromSource:
        form.distanceFromSource === ""
          ? null
          : Number(form.distanceFromSource),
    };
    try {
      if (editing === "new") {
        await addTrainStop(trainId, Number(form.stationId), payload);
        toast.success("Stop added to the route.");
      } else {
        await updateTrainStop(editing, payload);
        toast.success("Stop updated.");
      }
      setEditing(null);
      await loadRoute();
    } catch (err) {
      toast.error(err.message || "Could not save the stop.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTrainStop(deleteTarget.id);
      toast.success("Stop removed.");
      setDeleteTarget(null);
      await loadRoute();
    } catch (err) {
      toast.error(err.message || "Could not remove the stop.");
    }
  };

  if (loading) return <Loader message="Loading…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <Route size={22} aria-hidden="true" /> Routes
        </h1>
        <p>Manage the ordered stops that make up each train's route.</p>
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
          Add stop
        </Button>
      </div>

      {routeLoading && <Loader message="Loading route…" />}

      {!routeLoading && route.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="No stops yet"
          message="This train has no route defined. Add its first stop."
        />
      )}

      {!routeLoading && route.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Station</th>
                <th>Code</th>
                <th>Arrival</th>
                <th>Departure</th>
                <th>Distance (km)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {route.map((stop) => (
                <tr key={stop.id}>
                  <td className="mono">{stop.stopOrder}</td>
                  <td>{stop.station?.stationName || "—"}</td>
                  <td className="mono">{stop.station?.stationCode || "—"}</td>
                  <td className="mono">{stop.arrivalTime || "—"}</td>
                  <td className="mono">{stop.departureTime || "—"}</td>
                  <td className="mono">
                    {stop.distanceFromSource ?? "—"}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openEdit(stop)}
                        aria-label="Edit stop"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        onClick={() => setDeleteTarget(stop)}
                        aria-label="Delete stop"
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
        title={editing === "new" ? "Add stop" : "Edit stop"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save stop
            </Button>
          </>
        }
      >
        <div className="admin-form-grid">
          <div className="field-full">
            <Select
              label="Station"
              value={form.stationId}
              onChange={(e) =>
                setForm((p) => ({ ...p, stationId: e.target.value }))
              }
              options={stationOptions}
              placeholder="Select a station"
              required
              disabled={editing !== "new"}
              hint={
                editing !== "new"
                  ? "The station of an existing stop cannot be changed."
                  : ""
              }
            />
          </div>
          <Input
            label="Stop order"
            type="number"
            value={form.stopOrder}
            onChange={(e) =>
              setForm((p) => ({ ...p, stopOrder: e.target.value }))
            }
            required
          />
          <Input
            label="Distance from source (km)"
            type="number"
            value={form.distanceFromSource}
            onChange={(e) =>
              setForm((p) => ({ ...p, distanceFromSource: e.target.value }))
            }
          />
          <Input
            label="Arrival (HH:mm)"
            value={form.arrivalTime}
            onChange={(e) =>
              setForm((p) => ({ ...p, arrivalTime: e.target.value }))
            }
            placeholder="Leave blank for the origin"
          />
          <Input
            label="Departure (HH:mm)"
            value={form.departureTime}
            onChange={(e) =>
              setForm((p) => ({ ...p, departureTime: e.target.value }))
            }
            placeholder="Leave blank for the terminus"
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove stop?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Remove
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p>
            Remove <strong>{deleteTarget.station?.stationName}</strong> from
            this route? This cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default RouteManagement;
