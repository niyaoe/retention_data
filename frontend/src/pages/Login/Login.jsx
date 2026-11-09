
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ret-login-page">
      <div className="ret-login-card">
        <div className="ret-login-brand">
          <div className="ret-login-logo">
            <i className="bi bi-bar-chart-line-fill"></i>
          </div>

          <h2>Retention Data</h2>
          <p>Management Information System</p>
        </div>

        <div className="ret-login-heading">
          <h3>Welcome Back</h3>
          <p>Sign in to continue to your dashboard.</p>
        </div>

        {error && (
          <div className="ret-login-error">
            <i className="bi bi-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="ret-login-field">
            <label htmlFor="ret-username">Username</label>

            <div className="ret-login-input-wrap">
              <i className="bi bi-person"></i>
              <input
                id="ret-username"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="ret-login-field">
            <label htmlFor="ret-password">Password</label>

            <div className="ret-login-input-wrap">
              <i className="bi bi-lock"></i>
              <input
                id="ret-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="ret-login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="ret-login-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm"></span>
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <i className="bi bi-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        <div className="ret-login-footer">
          <span>Retention Data Management System</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
