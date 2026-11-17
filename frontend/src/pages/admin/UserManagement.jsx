import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Phone, ShieldCheck, Trash2, Users } from "lucide-react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Loader from "../../components/common/Loader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { deleteUser, getAllUsers } from "../../services/userService";
import { formatDateTime } from "../../utils/dateUtils";

/** UserManagement — list and remove user accounts. */

const UserManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await getAllUsers());
    } catch (err) {
      setError(err.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        String(u.name ?? "").toLowerCase().includes(q) ||
        String(u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      toast.success("User deleted.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not delete the user.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <h1>
          <Users size={22} aria-hidden="true" /> Users
        </h1>
        <p>{users.length} registered accounts.</p>
      </div>

      <div className="admin-toolbar">
        <input
          className="input"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
      </div>

      {loading && <Loader message="Loading users…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title="No users"
          message="No user matches your search."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="mono">#{u.id}</td>
                  <td>{u.name}</td>
                  <td>
                    <span className="flex gap-2">
                      <Mail size={14} aria-hidden="true" />
                      {u.email}
                    </span>
                  </td>
                  <td>
                    {u.phone ? (
                      <span className="flex gap-2">
                        <Phone size={14} aria-hidden="true" />
                        {u.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        u.role === "ADMIN" ? "badge-navy" : "badge-neutral"
                      }`}
                    >
                      {u.role === "ADMIN" && (
                        <ShieldCheck size={12} aria-hidden="true" />
                      )}
                      {u.role}
                    </span>
                  </td>
                  <td className="text-sm">{formatDateTime(u.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn is-danger"
                      onClick={() => setDeleteTarget(u)}
                      disabled={u.id === currentUser?.id}
                      aria-label={`Delete ${u.name}`}
                      title={
                        u.id === currentUser?.id
                          ? "You cannot delete your own account"
                          : `Delete ${u.name}`
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete user
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p>
            Delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
            This cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
