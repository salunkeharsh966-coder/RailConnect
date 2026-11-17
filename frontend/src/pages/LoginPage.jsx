import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, TrainFront } from "lucide-react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { APP_NAME } from "../utils/constants";
import { validateEmail, validatePassword } from "../utils/validators";

/**
 * LoginPage.
 *
 * The backend returns the full User object (id, name, email, role) and the
 * frontend keeps it in localStorage. There is no JWT — see the report.
 */

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const redirectTo = location.state?.from?.pathname || "/";

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");

    const nextErrors = {
      email: validateEmail(email) || "",
      password: validatePassword(password) || "",
    };
    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) return;

    try {
      const user = await login({ email: email.trim(), password });
      toast.success(`Welcome back, ${user.name?.split(" ")[0] || "traveller"}.`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message || "Sign in failed. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <TrainFront size={20} />
          </span>
          <span className="brand-text">
            <strong>{APP_NAME}</strong>
            <small>Railway Reservation</small>
          </span>
        </Link>

        <h1 className="auth-heading">Sign in to your account</h1>
        <p className="auth-sub">
          Access your bookings, e-tickets and saved journeys.
        </p>

        {formError && (
          <div className="alert alert-error auth-error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((p) => ({ ...p, email: "" }));
            }}
            placeholder="you@example.com"
            icon={Mail}
            required
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((p) => ({ ...p, password: "" }));
            }}
            placeholder="Your password"
            icon={Lock}
            required
            error={errors.password}
            autoComplete="current-password"
            suffix={
              <button
                type="button"
                className="input-suffix-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={loading}
            className="auth-submit"
          >
            Sign in
          </Button>
        </form>

        <p className="auth-switch">
          New to {APP_NAME}? <Link to="/register">Create an account</Link>
        </p>

        <div className="auth-demo">
          <strong>Demo accounts</strong>
          <span>
            Traveller — <span className="mono">rahul@example.com</span> /{" "}
            <span className="mono">rahul123</span>
          </span>
          <span>
            Admin — <span className="mono">admin@railconnect.in</span> /{" "}
            <span className="mono">admin123</span>
          </span>
        </div>

        <Link to="/" className="auth-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to home
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
