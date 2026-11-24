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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(form.firstName)) {
      window.alert("First name must only contain letters, spaces, hyphens, or apostrophes.");
      return;
    }
    if (!nameRegex.test(form.lastName)) {
      window.alert("Last name must only contain letters, spaces, hyphens, or apostrophes.");
      return;
    }

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
        .rg-input[type="date"] { color: #1a2e08; }
        .rg-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(201, 216, 74, 0.4);
          border-top-color: #c9d84a;
          border-radius: 50%;
          animation: rg-spin 0.7s linear infinite;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes rg-spin { to { transform: rotate(360deg); } }

        /* Terms and Privacy Modals Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 32, 10, 0.45);
          backdrop-filter: blur(12px);
          animation: modalFadeIn 0.3s ease forwards;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-card {
          background: linear-gradient(135deg, #ffffff 0%, #f9fbf7 100%);
          border: 1px solid rgba(74, 124, 47, 0.15);
          border-radius: 28px;
          padding: 40px 36px 32px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 32px 80px rgba(22, 63, 34, 0.22);
          display: flex;
          flex-direction: column;
          font-family: 'Poppins', sans-serif;
          position: relative;
          text-align: left;
          animation: modalSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-title {
          font-family: 'Poppins', sans-serif;
          font-size: 24px;
          font-weight: 800;
          line-height: 1.25;
          margin-bottom: 4px;
          background: linear-gradient(135deg, #163f22 0%, #4a7c2f 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modal-subtitle {
          font-size: 10px;
          font-weight: 700;
          color: #7ba367;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 24px;
        }

        .modal-body {
          max-height: 280px;
          overflow-y: auto;
          padding-right: 12px;
          margin-bottom: 28px;
        }
        
        /* Modern Scrollbar Styling */
        .modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .modal-body::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.03);
          border-radius: 99px;
        }
        .modal-body::-webkit-scrollbar-thumb {
          background: #7ba367;
          border-radius: 99px;
        }
        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #4a7c2f;
        }

        .modal-section {
          background: rgba(242, 247, 238, 0.5);
          border: 1px solid rgba(123, 163, 103, 0.12);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.25s ease;
        }
        .modal-section:hover {
          background: rgba(242, 247, 238, 0.85);
          border-color: rgba(74, 124, 47, 0.25);
          transform: translateY(-1px);
        }

        .modal-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .modal-section-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #4a7c2f;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }

        .modal-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1a2e08;
        }

        .modal-section-text {
          font-size: 12px;
          line-height: 1.6;
          color: #4b5563;
        }

        .modal-btn-close {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #4a7c2f 0%, #2d5016 100%);
          color: #c9d84a;
          border: none;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 8px 24px rgba(74, 124, 47, 0.25);
          text-align: center;
        }
        .modal-btn-close:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(74, 124, 47, 0.35);
        }
        .modal-btn-close:active {
          transform: translateY(0);
        }

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
      </div>

      {/* RIGHT PANEL */}
      <div className="rg-right">
        <div className="rg-accent-bar" />
        <div className={`rg-form-wrap ${loaded ? "visible" : ""}`}>

          <div className="rg-eyebrow">Get started free</div>
          <h1 className="rg-title">Create your<br /><em>NutriSnap</em> account</h1>
          <p className="rg-subtitle">Create your account in a minute.</p>

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
                  onBlur={() => setFocused(null)} 
                  pattern="^[a-zA-Z\s\-']+$"
                  title="First name must only contain letters, spaces, hyphens, or apostrophes."
                  required
                />
              </div>
              <div className="rg-group">
                <label className={`rg-label ${focused === "lastName" ? "active" : ""}`}>Last Name</label>
                <input
                  name="lastName" type="text" className="rg-input"
                  placeholder="dela Cruz" value={form.lastName}
                  onChange={handleChange}
                  onFocus={() => setFocused("lastName")}
                  onBlur={() => setFocused(null)} 
                  pattern="^[a-zA-Z\s\-']+$"
                  title="Last name must only contain letters, spaces, hyphens, or apostrophes."
                  required
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
                I agree to the{" "}
                <span
                  className="rg-terms-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTermsModal(true);
                  }}
                >
                  Terms of Service
                </span>{" "}
                and{" "}
                <span
                  className="rg-terms-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrivacyModal(true);
                  }}
                >
                  Privacy Policy
                </span>
              </span>
            </div>

            {/* Submit */}
            <button type="submit" className="rg-submit" disabled={loading || !agreed}>
              {loading ? (
                <><span className="rg-spinner" />Creating account...</>
              ) : "Create Account"}
            </button>
          </form>

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

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Terms of Service</h3>
            <p className="modal-subtitle">NutriSnap User Agreement</p>
            
            <div className="modal-body">
              <div className="modal-section">
                <div className="modal-section-header">
                  <span className="modal-section-badge">1</span>
                  <h4 className="modal-section-title">Accuracy of AI Analysis</h4>
                </div>
                <p className="modal-section-text">
                  NutriSnap uses advanced ensemble models (including YOLOv11 and Gemini AI) to estimate meal portion sizes and nutritional values. These are statistical approximations. Do not rely on them as absolute values.
                </p>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">
                  <span className="modal-section-badge">2</span>
                  <h4 className="modal-section-title">Medical Advice Disclaimer</h4>
                </div>
                <p className="modal-section-text">
                  All content, estimates, and calculations provided by NutriSnap are for informational purposes only. We do not provide medical advice. Consult a qualified doctor or registered dietitian before starting any diet or exercise program.
                </p>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">
                  <span className="modal-section-badge">3</span>
                  <h4 className="modal-section-title">Accountability</h4>
                </div>
                <p className="modal-section-text">
                  You agree to use this application responsibly and input accurate metrics for goal estimations.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowTermsModal(false)}
              className="modal-btn-close"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="modal-overlay" onClick={() => setShowPrivacyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Privacy Policy</h3>
            <p className="modal-subtitle">How We Handle Your Data</p>
            
            <div className="modal-body">
              <div className="modal-section">
                <div className="modal-section-header">
                  <span className="modal-section-badge">1</span>
                  <h4 className="modal-section-title">Physical Metrics & Goals</h4>
                </div>
                <p className="modal-section-text">
                  We collect and process user parameters (weight, height, age, sex) solely to calculate BMR, TDEE, and daily nutrition targets.
                </p>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">
                  <span className="modal-section-badge">2</span>
                  <h4 className="modal-section-title">Photo Processing</h4>
                </div>
                <p className="modal-section-text">
                  Uploaded food images are securely sent to our backend APIs (Roboflow, Clarifai, and Google Gemini) to identify dishes and estimate portions. Images are processed live and are not stored permanently or shared with third-party advertisers.
                </p>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">
                  <span className="modal-section-badge">3</span>
                  <h4 className="modal-section-title">Security</h4>
                </div>
                <p className="modal-section-text">
                  Your passwords are salted and hashed. We implement rate-limiting to protect account access security.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="modal-btn-close"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}