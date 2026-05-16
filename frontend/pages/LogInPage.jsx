import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../src/services/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    // Load Lottie web component script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
    script.type = "module";
    document.head.appendChild(script);
    setTimeout(() => setLoaded(true), 100);
    return () => document.head.removeChild(script);
  }, []);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.verified) {
      setNotice("Your account has been verified. Please sign in.");
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await loginUser({ email, password });
      if (response.access_token) {
        localStorage.setItem("nutrisnap_token", response.access_token);
        navigate("/camera");
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Poppins', sans-serif",
        minHeight: "100vh",
        display: "flex",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,600&family=Bebas+Neue&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .left-panel {
          width: 52%;
          background: #2d5016;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 48px;
        }

        .blob1 {
          position: absolute;
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, #4a7c2f 0%, transparent 70%);
          top: -80px;
          left: -80px;
          border-radius: 50%;
          opacity: 0.6;
        }
        .blob2 {
          position: absolute;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, #6ba83a 0%, transparent 70%);
          bottom: -60px;
          right: -60px;
          border-radius: 50%;
          opacity: 0.5;
        }
        .blob3 {
          position: absolute;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, #c9d84a 0%, transparent 70%);
          top: 50%;
          right: 10%;
          border-radius: 50%;
          opacity: 0.15;
          transform: translateY(-50%);
        }

        .dots-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        .brand-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 56px;
          letter-spacing: 3px;
          color: #c9d84a;
          line-height: 1;
          position: relative;
          z-index: 2;
          margin-bottom: 4px;
        }

        .brand-tagline {
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          position: relative;
          z-index: 2;
          margin-bottom: 40px;
        }

        .lottie-wrap {
          position: relative;
          z-index: 2;
          margin-bottom: 36px;
        }

        .left-footer {
          position: relative;
          z-index: 2;
          text-align: center;
          color: rgba(255,255,255,0.75);
          font-size: 15px;
          font-weight: 400;
          line-height: 1.7;
          max-width: 300px;
          border-top: 1px solid rgba(255,255,255,0.15);
          padding-top: 24px;
        }

        .left-footer strong {
          color: #c9d84a;
          font-weight: 600;
        }

        .right-panel {
          width: 48%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 56px;
          background: #ffffff;
          position: relative;
        }

        .form-container {
          width: 100%;
          max-width: 380px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .form-container.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .welcome-label {
          font-size: 12px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #7a8c3a;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .form-title {
          font-family: 'Poppins', sans-serif;
          font-size: 34px;
          font-weight: 700;
          color: #1a2e08;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .form-title em {
          color: #4a7c2f;
          font-style: italic;
          font-weight: 600;
        }

        .form-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 36px;
          line-height: 1.6;
        }

        .input-group {
          margin-bottom: 18px;
          position: relative;
        }

        .input-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #374151;
          margin-bottom: 8px;
          transition: color 0.2s;
        }

        .input-label.active {
          color: #4a7c2f;
        }

        .input-field {
          width: 100%;
          padding: 14px 18px;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          font-size: 15px;
          font-family: 'Poppins', sans-serif;
          background: #fff;
          color: #1a2e08;
          outline: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .input-field:focus {
          border-color: #4a7c2f;
          box-shadow: 0 0 0 4px rgba(74, 124, 47, 0.1), 0 2px 8px rgba(0,0,0,0.04);
        }

        .password-wrap {
          position: relative;
        }

        .toggle-pw {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9a9a8e;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
          padding: 4px;
          transition: color 0.2s;
        }
        .toggle-pw:hover { color: #4a7c2f; }

        .row-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          margin-top: 4px;
        }

        .remember-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .custom-checkbox {
          width: 18px;
          height: 18px;
          border: 1.5px solid #c4c0b4;
          border-radius: 5px;
          background: ${checked ? '#4a7c2f' : '#fff'};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          cursor: pointer;
          border-color: ${checked ? '#4a7c2f' : '#c4c0b4'};
        }

        .remember-label {
          font-size: 13px;
          color: #6b7280;
        }

        .forgot-link {
          font-size: 13px;
          color: #4a7c2f;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .forgot-link:hover { text-decoration: underline; }

        .submit-btn {
          width: 100%;
          padding: 16px;
          background: #2d5016;
          color: #c9d84a;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 1px;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          box-shadow: 0 8px 24px rgba(45, 80, 22, 0.3);
        }

        .submit-btn:hover {
          background: #3d6b20;
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(45, 80, 22, 0.4);
        }

        .submit-btn:active {
          transform: translateY(0);
        }

        .submit-btn.loading {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .divider-text {
          font-size: 12px;
          color: #9ca3af;
          letter-spacing: 1px;
        }

        .google-btn {
          width: 100%;
          padding: 13px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
          color: #1a2e08;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .google-btn:hover {
          border-color: #4a7c2f;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }

        .signup-row {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: #6b7280;
        }

        .signup-link {
          color: #4a7c2f;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
        }
        .signup-link:hover { text-decoration: underline; }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(201,216,74,0.4);
          border-top-color: #c9d84a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .accent-bar {
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(to bottom, #c9d84a, #4a7c2f);
          opacity: 0.4;
        }

        @media (max-width: 768px) {
          .left-panel { display: none; }
          .right-panel { width: 100%; padding: 32px 24px; }
        }
      `}</style>

      {/* LEFT PANEL */}
      <div className="left-panel">
        <div className="blob1" />
        <div className="blob2" />
        <div className="blob3" />
        <div className="dots-pattern" />

        <div className="brand-name">NutriSnap</div>
        <div className="brand-tagline">See it. Snap it. Know it.</div>

        <div className="lottie-wrap">
          <dotlottie-wc
            src="https://lottie.host/fa06f779-9be3-40c6-a5a0-4cd6290d88c7/iJtUqluHEZ.lottie"
            style={{ width: "260px", height: "260px" }}
            autoplay
            loop
          />
        </div>

        <div className="left-footer">
          Track your meals, <strong>discover nutrition</strong>, and reach your <strong>health goals.</strong>
        </div>      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <div className="accent-bar" />

        <div className={`form-container ${loaded ? "visible" : ""}`}>
          <div className="welcome-label">Welcome back</div>
          <h1 className="form-title">
            Sign into your<br /><em>NutriSnap</em> account
          </h1>
          <p className="form-subtitle">
            Track your meals, snap your food, and gain instant nutritional insights.
          </p>

          {notice && (
            <div style={{ marginBottom: "16px", color: "#4a7c2f", fontSize: "13px" }}>
              {notice}
            </div>
          )}

          {error && (
            <div style={{ marginBottom: "16px", color: "#b91c1c", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="input-group">
              <label
                className={`input-label ${focused === "email" ? "active" : ""}`}
              >
                Email Address
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                required
              />
            </div>

            {/* Password */}
            <div className="input-group">
              <label
                className={`input-label ${focused === "password" ? "active" : ""}`}
              >
                Password
              </label>
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  required
                  style={{ paddingRight: "60px" }}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div className="row-options">
              <div
                className="remember-wrap"
                onClick={() => setChecked(!checked)}
              >
                <div className="custom-checkbox">
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="remember-label">Remember me</span>
              </div>
              <a className="forgot-link">Forgot password?</a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`submit-btn ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">OR</span>
            <div className="divider-line" />
          </div>

          {/* Google */}
          <button className="google-btn">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div className="signup-row">
            Don't have an account?{" "}
            <a className="signup-link" onClick={() => navigate("/signup")}>Create one free</a>
          </div>
        </div>
      </div>
    </div>
  );
}