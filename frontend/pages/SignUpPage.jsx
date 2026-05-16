import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signupUser } from "../src/services/auth";
import OTPModal from "../components/common/StatusModal";

export default function NutriSnapRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", birthday: "", password: "", confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
    script.type = "module";
    document.head.appendChild(script);
    setTimeout(() => setLoaded(true), 100);
    return () => document.head.removeChild(script);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await signupUser({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        birthday: form.birthday,
        password: form.password,
      });
      if (response.otp_required) {
        setOtpModalOpen(true);
      }
    } catch (submitError) {
      window.alert(submitError.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Too short", color: "#ef4444", width: "25%" };
    if (p.length < 8 || !/[A-Z]/.test(p)) return { label: "Weak", color: "#f97316", width: "50%" };
    if (!/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) return { label: "Good", color: "#eab308", width: "75%" };
    return { label: "Strong", color: "#4a7c2f", width: "100%" };
  };

  const strength = passwordStrength();
  const passwordMatch = form.confirm && form.password === form.confirm;
  const passwordMismatch = form.confirm && form.password !== form.confirm;

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: "100vh", display: "flex", background: "#ffffff", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,600&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .rg-left {
          width: 44%;
          background: #2d5016;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 48px;
        }
        .rg-blob1 {
          position: absolute; width: 420px; height: 420px;
          background: radial-gradient(circle, #4a7c2f 0%, transparent 70%);
          top: -80px; left: -80px; border-radius: 50%; opacity: 0.6;
        }
        .rg-blob2 {
          position: absolute; width: 320px; height: 320px;
          background: radial-gradient(circle, #6ba83a 0%, transparent 70%);
          bottom: -60px; right: -60px; border-radius: 50%; opacity: 0.5;
        }
        .rg-blob3 {
          position: absolute; width: 200px; height: 200px;
          background: radial-gradient(circle, #c9d84a 0%, transparent 70%);
          top: 50%; right: 10%; border-radius: 50%; opacity: 0.15;
          transform: translateY(-50%);
        }
        .rg-dots {
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .rg-brand { font-family: 'Bebas Neue', sans-serif; font-size: 56px; letter-spacing: 3px; color: #c9d84a; line-height: 1; position: relative; z-index: 2; margin-bottom: 4px; }
        .rg-tagline { font-family: 'Poppins', sans-serif; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.5); position: relative; z-index: 2; margin-bottom: 40px; }
        .rg-lottie { position: relative; z-index: 2; margin-bottom: 36px; }
        .rg-footer { position: relative; z-index: 2; text-align: center; color: rgba(255,255,255,0.75); font-size: 15px; font-weight: 400; line-height: 1.7; max-width: 300px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 24px; }
        .rg-footer strong { color: #c9d84a; font-weight: 600; }

        .rg-right {
          width: 56%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 56px;
          background: #ffffff;
          position: relative;
          overflow-y: auto;
        }
        .rg-accent-bar { position: absolute; top: 0; right: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #c9d84a, #4a7c2f); opacity: 0.4; }

        .rg-form-wrap {
          width: 100%; max-width: 420px;
          opacity: 0; transform: translateY(20px);
          transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .rg-form-wrap.visible { opacity: 1; transform: translateY(0); }

        .rg-eyebrow { font-size: 12px; letter-spacing: 4px; text-transform: uppercase; color: #7a8c3a; font-weight: 600; margin-bottom: 10px; }
        .rg-title { font-family: 'Poppins', sans-serif; font-size: 30px; font-weight: 700; color: #1a2e08; line-height: 1.2; margin-bottom: 6px; }
        .rg-title em { color: #4a7c2f; font-style: italic; font-weight: 600; }
        .rg-subtitle { font-size: 13px; color: #6b7280; margin-bottom: 28px; line-height: 1.6; }

        .rg-row { display: flex; gap: 14px; }
        .rg-row .rg-group { flex: 1; }

        .rg-group { margin-bottom: 16px; position: relative; }
        .rg-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #374151; margin-bottom: 7px; transition: color 0.2s; }
        .rg-label.active { color: #4a7c2f; }

        .rg-input {
          width: 100%; padding: 13px 16px;
          border: 1.5px solid #e5e7eb; border-radius: 12px;
          font-size: 14px; font-family: 'Poppins', sans-serif;
          background: #fff; color: #1a2e08; outline: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .rg-input:focus { border-color: #4a7c2f; box-shadow: 0 0 0 4px rgba(74,124,47,0.1); }
        .rg-input.error { border-color: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,0.08); }
        .rg-input.success { border-color: #4a7c2f; }

        .rg-pw-wrap { position: relative; }
        .rg-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 12px; font-weight: 600; font-family: 'Poppins', sans-serif; padding: 4px; transition: color 0.2s; }
        .rg-toggle:hover { color: #4a7c2f; }

        .rg-strength-bar { margin-top: 8px; }
        .rg-strength-track { height: 4px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
        .rg-strength-fill { height: 100%; border-radius: 99px; transition: all 0.4s ease; }
        .rg-strength-label { font-size: 11px; font-weight: 600; margin-top: 4px; }

        .rg-match-hint { font-size: 11px; font-weight: 500; margin-top: 5px; }

        .rg-terms { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 22px; margin-top: 4px; cursor: pointer; }
        .rg-checkbox { width: 18px; height: 18px; min-width: 18px; border-radius: 5px; border: 1.5px solid #d1d5db; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-top: 1px; }
        .rg-checkbox.checked { background: #4a7c2f; border-color: #4a7c2f; }
        .rg-terms-text { font-size: 12px; color: #6b7280; line-height: 1.6; }
        .rg-terms-link { color: #4a7c2f; font-weight: 600; cursor: pointer; }

        .rg-submit {
          width: 100%; padding: 15px;
          background: #2d5016; color: #c9d84a;
          border: none; border-radius: 14px;
          font-size: 15px; font-weight: 700; letter-spacing: 1px;
          font-family: 'Poppins', sans-serif;
          cursor: pointer; transition: all 0.25s ease;
          text-transform: uppercase;
          box-shadow: 0 8px 24px rgba(45,80,22,0.3);
        }
        .rg-submit:hover:not(:disabled) { background: #3d6b20; transform: translateY(-1px); box-shadow: 0 12px 32px rgba(45,80,22,0.4); }
        .rg-submit:active { transform: translateY(0); }
        .rg-submit:disabled { opacity: 0.75; cursor: not-allowed; }

        .rg-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .rg-divider-line { flex: 1; height: 1px; background: #e5e7eb; }
        .rg-divider-text { font-size: 12px; color: #9ca3af; letter-spacing: 1px; }

        .rg-google {
          width: 100%; padding: 12px;
          background: #fff; border: 1.5px solid #e5e7eb; border-radius: 14px;
          font-size: 14px; font-weight: 600; font-family: 'Poppins', sans-serif;
          color: #1a2e08; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .rg-google:hover { border-color: #4a7c2f; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

        .rg-login-row { text-align: center; margin-top: 20px; font-size: 13px; color: #6b7280; }
        .rg-login-link { color: #4a7c2f; font-weight: 700; cursor: pointer; text-decoration: none; }
        .rg-login-link:hover { text-decoration: underline; }

        .rg-input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        .rg-input[type="date"] { color: #1a2e08; } border: 2px solid rgba(201,216,74,0.4); border-top-color: #c9d84a; border-radius: 50%; animation: rg-spin 0.7s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
        @keyframes rg-spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .rg-left { display: none; }
          .rg-right { width: 100%; padding: 32px 24px; }
          .rg-row { flex-direction: column; gap: 0; }
        }
      `}</style>

      {/* LEFT PANEL */}
      <div className="rg-left">
        <div className="rg-blob1" /><div className="rg-blob2" /><div className="rg-blob3" />
        <div className="rg-dots" />
        <div className="rg-brand">NutriSnap</div>
        <div className="rg-tagline">See it. Snap it. Know it.</div>
        <div className="rg-lottie">
          <dotlottie-wc
            src="https://lottie.host/fa06f779-9be3-40c6-a5a0-4cd6290d88c7/iJtUqluHEZ.lottie"
            style={{ width: "240px", height: "240px" }}
            autoplay loop
          />
        </div>
        <div className="rg-footer">
          Track your meals, <strong>discover nutrition</strong>, and reach your <strong>health goals.</strong>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="rg-right">
        <div className="rg-accent-bar" />
        <div className={`rg-form-wrap ${loaded ? "visible" : ""}`}>

          <div className="rg-eyebrow">Get started free</div>
          <h1 className="rg-title">Create your<br /><em>NutriSnap</em> account</h1>
          <p className="rg-subtitle">Join thousands already tracking smarter. It only takes a minute.</p>

          <form onSubmit={handleSubmit}>
            {/* Name row */}
            <div className="rg-row">
              <div className="rg-group">
                <label className={`rg-label ${focused === "firstName" ? "active" : ""}`}>First Name</label>
                <input
                  name="firstName" type="text" className="rg-input"
                  placeholder="Juan" value={form.firstName}
                  onChange={handleChange}
                  onFocus={() => setFocused("firstName")}
                  onBlur={() => setFocused(null)} required
                />
              </div>
              <div className="rg-group">
                <label className={`rg-label ${focused === "lastName" ? "active" : ""}`}>Last Name</label>
                <input
                  name="lastName" type="text" className="rg-input"
                  placeholder="dela Cruz" value={form.lastName}
                  onChange={handleChange}
                  onFocus={() => setFocused("lastName")}
                  onBlur={() => setFocused(null)} required
                />
              </div>
            </div>

            {/* Birthday & Email row */}
            <div className="rg-row">
              <div className="rg-group" style={{ flex: 1 }}>
                <label className={`rg-label ${focused === "birthday" ? "active" : ""}`}>Birthday</label>
                <input
                  name="birthday" type="date" className="rg-input"
                  value={form.birthday}
                  onChange={handleChange}
                  onFocus={() => setFocused("birthday")}
                  onBlur={() => setFocused(null)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="rg-group" style={{ flex: 1.4 }}>
                <label className={`rg-label ${focused === "email" ? "active" : ""}`}>Email Address</label>
                <input
                  name="email" type="email" className="rg-input"
                  placeholder="you@example.com" value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)} required
                />
              </div>
            </div>

            {/* Password */}
            <div className="rg-group">
              <label className={`rg-label ${focused === "password" ? "active" : ""}`}>Password</label>
              <div className="rg-pw-wrap">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="rg-input"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  required
                  style={{ paddingRight: "56px" }}
                />
                <button type="button" className="rg-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {strength && (
                <div className="rg-strength-bar">
                  <div className="rg-strength-track">
                    <div className="rg-strength-fill" style={{ width: strength.width, background: strength.color }} />
                  </div>
                  <div className="rg-strength-label" style={{ color: strength.color }}>{strength.label}</div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="rg-group">
              <label className={`rg-label ${focused === "confirm" ? "active" : ""}`}>Confirm Password</label>
              <div className="rg-pw-wrap">
                <input
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  className={`rg-input ${passwordMismatch ? "error" : ""} ${passwordMatch ? "success" : ""}`}
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={handleChange}
                  onFocus={() => setFocused("confirm")}
                  onBlur={() => setFocused(null)}
                  required
                  style={{ paddingRight: "56px" }}
                />
                <button type="button" className="rg-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {passwordMatch && <div className="rg-match-hint" style={{ color: "#4a7c2f" }}>✓ Passwords match</div>}
              {passwordMismatch && <div className="rg-match-hint" style={{ color: "#ef4444" }}>✗ Passwords don't match</div>}
            </div>

            {/* Terms */}
            <div className="rg-terms" onClick={() => setAgreed(!agreed)}>
              <div className={`rg-checkbox ${agreed ? "checked" : ""}`}>
                {agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="rg-terms-text">
                I agree to the <span className="rg-terms-link">Terms of Service</span> and <span className="rg-terms-link">Privacy Policy</span>
              </span>
            </div>

            {/* Submit */}
            <button type="submit" className="rg-submit" disabled={loading || !agreed}>
              {loading ? (
                <><span className="rg-spinner" />Creating account...</>
              ) : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="rg-divider">
            <div className="rg-divider-line" />
            <span className="rg-divider-text">OR</span>
            <div className="rg-divider-line" />
          </div>

          {/* Google */}
          <button className="rg-google">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
            </svg>
            Sign up with Google
          </button>

          <div className="rg-login-row">
            Already have an account?{" "}
            <a className="rg-login-link" onClick={() => navigate("/login")}>Sign in</a>
          </div>
        </div>
      </div>

      <OTPModal
        isOpen={otpModalOpen}
        email={form.email}
        onVerified={() => navigate("/login", { state: { email: form.email, verified: true } })}
        onClose={() => setOtpModalOpen(false)}
      />
    </div>
  );
}