import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loginUser, registerUser } from "../services/authService";
import { STORAGE_KEYS } from "../utils/constants";

/**
 * AuthContext.
 *
 * The backend has no JWT: login returns the full User object and the frontend
 * keeps it in localStorage. `user.id` is what every user-scoped endpoint needs.
 *
 * SECURITY NOTE: because the backend does not authenticate requests, the role
 * check here is a UI convenience only. It is NOT a security boundary — anyone
 * can call /api/admin/* directly. This is documented in the report.
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch {
      /* storage unavailable — session simply will not persist */
    }
  }, [user]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const loggedIn = await loginUser(credentials);
      setUser(loggedIn);
      return loggedIn;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      return await registerUser(userData);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isLoggedIn: Boolean(user),
      isAdmin: String(user?.role ?? "").toUpperCase() === "ADMIN",
      userId: user?.id ?? null,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};

export default AuthContext;
