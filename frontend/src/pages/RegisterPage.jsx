import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  TrainFront,
  User,
} from "lucide-react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { APP_NAME } from "../utils/constants";
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "../utils/validators";

/**
 * RegisterPage.
 *
 * Public registration always creates a USER — the backend forces the role, so
 * there is no way to self-register as an admin.
 */

const RegisterPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, loading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");

    const nextErrors = {
      name: validateName(form.name) || "",
      email: validateEmail(form.email) || "",
      phone: validatePhone(form.phone) || "",
      password: validatePassword(form.password) || "",
      confirmPassword:
        validateConfirmPassword(form.password, form.confirmPassword) || "",
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      });
      toast.success("Account created. Please sign in to continue.");
      navigate("/login", { replace: true });
    } catch (err) {
      setFormError(err.message || "Registration failed. Please try again.");
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

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-sub">
          It takes a minute — then you can book and manage journeys.
        </p>

        {formError && (
          <div className="alert alert-error auth-error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="As on your ID proof"
            icon={User}
            required
            error={errors.name}
            autoComplete="name"
          />

          <Input
            label="Email address"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            icon={Mail}
            required
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label="Phone number"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="Optional"
            icon={Phone}
            error={errors.phone}
            hint="Used only for booking updates."
            autoComplete="tel"
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="At least 6 characters"
            icon={Lock}
            required
            error={errors.password}
            autoComplete="new-password"
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

          <Input
            label="Confirm password"
            type={showPassword ? "text" : "password"}
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            placeholder="Re-enter your password"
            icon={Lock}
            required
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={loading}
            className="auth-submit"
          >
            Create account
          </Button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <Link to="/" className="auth-back">
          <ArrowLeft size={15} aria-hidden="true" /> Back to home
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
