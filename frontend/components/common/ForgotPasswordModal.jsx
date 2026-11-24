import { useEffect, useMemo, useRef, useState } from "react";
import { requestForgotPasswordOtp, resetPasswordWithOtp } from "../../src/services/auth";

export default function ForgotPasswordModal({ isOpen, onClose, onResetSuccess }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password, 3: Success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [notice, setNotice] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [shake, setShake] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const inputs = useRef([]);

  const maskedEmail = useMemo(() => {
    if (!email) return "";
    const [localPart, domain = ""] = email.split("@");
    const start = localPart.slice(0, 1);
    const hidden = localPart.length > 1 ? "*".repeat(Math.max(localPart.length - 1, 2)) : "*";
    return `${start}${hidden}@${domain}`;
  }, [email]);

  useEffect(() => {
    if (!isOpen) return;

    // Reset everything
    setStep(1);
    setEmail("");
    setOtp(["", "", "", "", "", ""]);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setStatus("idle");
    setNotice("");
    setResendTimer(0);
    setShake(false);
  }, [isOpen]);

  // Resend Timer Effect
  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((val) => val - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOpen, resendTimer]);

  // Handle auto-focus on Step 2 OTP first box
  useEffect(() => {
    if (step === 2) {
      const focusTimer = setTimeout(() => {
        inputs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(focusTimer);
    }
  }, [step]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    setNotice("");

    try {
      const response = await requestForgotPasswordOtp(email);
      setResendTimer(30);
      setStep(2);
      setStatus("idle");
      setNotice(
        response.otp_delivery === "email"
          ? "Verification code sent to your email inbox."
          : "Development mode: OTP printed to the backend terminal console."
      );
    } catch (err) {
      setStatus("error");
      setNotice(err.message || "Failed to send reset code. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    if (!email || resendTimer > 0 || status === "loading") return;

    setStatus("loading");
    setNotice("");

    try {
      const response = await requestForgotPasswordOtp(email);
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      setStatus("idle");
      setNotice(
        response.otp_delivery === "email"
          ? "A new verification code was sent to your inbox."
          : "A new code was printed in the backend console for development testing."
      );
    } catch (err) {
      setStatus("error");
      setNotice(err.message || "Unable to resend code.");
    }
  };

  const handleChangeOtp = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setNotice("");

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDownOtp = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
  };

  const handlePasteOtp = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = [...otp];
    pasted.split("").forEach((char, index) => {
      next[index] = char;
    });
    setOtp(next);
    setNotice("");
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setNotice("Please enter the complete 6-digit verification code.");
      return;
    }

    if (password.length < 8) {
      setNotice("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setNotice("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setNotice("");

    try {
      await resetPasswordWithOtp(email, otpCode, password);
      setStatus("success");
      setStep(3);
    } catch (err) {
      setStatus("error");
      setShake(true);
      setNotice(err.message || "Failed to reset password. Please try again.");
      setTimeout(() => setShake(false), 600);
    }
  };

  const closeWithReset = () => {
    onClose?.();
  };

  if (!isOpen) return null;

  const filledOtpCount = otp.filter(Boolean).length;
  const isOtpComplete = filledOtpCount === 6;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Poppins', sans-serif",
        padding: "24px",
        position: "fixed",
        inset: 0,
        zIndex: 700,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeWithReset();
      }}
    >
      <style>{`
        * { box-sizing: border-box; }

        .fp-card {
          background: #fff;
          border-radius: 28px;
          padding: 40px 36px;
          width: 100%;
          max-width: 440px;
          position: relative;
          box-shadow: 0 32px 80px rgba(0,0,0,0.25);
          animation: fpSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes fpSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .fp-top-bar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 56px;
          height: 5px;
          background: #2d5016;
          border-radius: 0 0 8px 8px;
        }

        .fp-close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f3f4f6;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }
        .fp-close:hover { background: #e5e7eb; color: #1a2e08; }

        .fp-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a2e08;
          text-align: center;
          margin-bottom: 8px;
        }

        .fp-subtitle {
          font-size: 13px;
          color: #6b7280;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .fp-email-badge {
          display: block;
          width: fit-content;
          margin: -12px auto 24px;
          background: #f0f7eb;
          color: #4a7c2f;
          font-weight: 600;
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 20px;
          text-align: center;
        }

        .fp-input-group {
          margin-bottom: 20px;
          position: relative;
          text-align: left;
        }

        .fp-input-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #374151;
          margin-bottom: 8px;
          transition: color 0.2s;
        }
        .fp-input-label.active {
          color: #4a7c2f;
        }

        .fp-input-field {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          font-size: 15px;
          font-family: 'Poppins', sans-serif;
          background: #fff;
          color: #1a2e08;
          outline: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .fp-input-field:focus {
          border-color: #4a7c2f;
          box-shadow: 0 0 0 4px rgba(74, 124, 47, 0.1), 0 2px 8px rgba(0,0,0,0.02);
        }

        .fp-pw-wrap {
          position: relative;
        }

        .fp-toggle-pw {
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
        .fp-toggle-pw:hover { color: #4a7c2f; }

        .fp-otp-boxes {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 12px;
        }
        .fp-otp-boxes.shake { animation: fpShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
        @keyframes fpShake {
          10%, 90% { transform: translateX(-3px); }
          20%, 80% { transform: translateX(5px); }
          30%, 50%, 70% { transform: translateX(-5px); }
          40%, 60% { transform: translateX(5px); }
        }

        .fp-otp-input {
          width: 48px;
          height: 56px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          color: #1a2e08;
          background: #fafafa;
          outline: none;
          transition: all 0.2s ease;
          caret-color: #4a7c2f;
        }
        .fp-otp-input:focus {
          border-color: #4a7c2f;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(74,124,47,0.12);
          transform: translateY(-2px);
        }
        .fp-otp-input.filled {
          border-color: #4a7c2f;
          background: #f0f7eb;
          color: #2d5016;
        }
        .fp-otp-input.error-box {
          border-color: #ef4444;
          background: #fef2f2;
          color: #ef4444;
          box-shadow: 0 0 0 4px rgba(239,68,68,0.1);
        }

        .fp-status-notice {
          text-align: center;
          min-height: 22px;
          font-size: 12px;
          line-height: 1.5;
          margin: 10px 0 16px;
          color: #6b7280;
        }
        .fp-status-notice.error { color: #ef4444; }
        .fp-status-notice.success { color: #4a7c2f; }

        .fp-btn-primary {
          width: 100%;
          padding: 15px;
          background: #2d5016;
          color: #c9d84a;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.8px;
          cursor: pointer;
          transition: all 0.25s ease;
          text-transform: uppercase;
          box-shadow: 0 8px 24px rgba(45,80,22,0.25);
          margin-bottom: 16px;
        }
        .fp-btn-primary:hover:not(:disabled) {
          background: #3d6b20;
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(45,80,22,0.35);
        }
        .fp-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .fp-resend-row {
          text-align: center;
          font-size: 13px;
          color: #6b7280;
        }
        .fp-resend-btn {
          background: none;
          border: none;
          color: #4a7c2f;
          font-weight: 700;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.2s;
        }
        .fp-resend-btn:disabled { color: #9ca3af; cursor: default; }
        .fp-resend-btn:hover:not(:disabled) { text-decoration: underline; }

        .fp-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(201,216,74,0.4);
          border-top-color: #c9d84a;
          border-radius: 50%;
          animation: fpSpin 0.7s linear infinite;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes fpSpin { to { transform: rotate(360deg); } }

        .fp-success-wrap {
          text-align: center;
          animation: fpFadeIn 0.4s ease;
        }
        @keyframes fpFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .fp-success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #2d5016, #4a7c2f);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 12px 32px rgba(45,80,22,0.35);
          animation: fpPopIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes fpPopIn {
          0% { transform: scale(0); }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="fp-card" onClick={(e) => e.stopPropagation()}>
        <div className="fp-top-bar" />
        <button className="fp-close" onClick={closeWithReset} aria-label="Close modal">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {step === 1 && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
              <dotlottie-wc
                src="https://lottie.host/fa06f779-9be3-40c6-a5a0-4cd6290d88c7/iJtUqluHEZ.lottie"
                style={{ width: "120px", height: "120px" }}
                autoplay
                loop
              />
            </div>
            <h2 className="fp-title">Forgot Password</h2>
            <p className="fp-subtitle">
              Enter your email address and we'll send you a 6-digit OTP code to verify your identity.
            </p>

            <form onSubmit={handleRequestOtp}>
              <div className="fp-input-group">
                <label className={`fp-input-label ${focusedField === "email" ? "active" : ""}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="fp-input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={status === "loading"}
                />
              </div>

              {notice && (
                <div className={`fp-status-notice ${status === "error" ? "error" : "success"}`}>
                  {notice}
                </div>
              )}

              <button
                type="submit"
                className="fp-btn-primary"
                disabled={!email || status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <span className="fp-spinner" />
                    Sending Code...
                  </>
                ) : (
                  "Send Code"
                )}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
              <dotlottie-wc
                src="https://lottie.host/b6e5f29e-d23c-40c7-8be1-9856325a096e/TXPTjNJ32K.lottie"
                style={{ width: "120px", height: "120px" }}
                autoplay
                loop
              />
            </div>
            <h2 className="fp-title">Reset Password</h2>
            <p className="fp-subtitle">
              We sent a 6-digit verification code to
            </p>
            <span className="fp-email-badge">{maskedEmail}</span>

            <form onSubmit={handleResetPassword}>
              {/* OTP Code Boxes */}
              <div className={`fp-otp-boxes ${shake ? "shake" : ""}`}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    className={`fp-otp-input ${digit ? (status === "error" ? "error-box" : "filled") : ""}`}
                    onChange={(e) => handleChangeOtp(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDownOtp(index, e)}
                    onPaste={handlePasteOtp}
                    disabled={status === "loading"}
                  />
                ))}
              </div>

              {/* New Password */}
              <div className="fp-input-group" style={{ marginTop: "24px" }}>
                <label className={`fp-input-label ${focusedField === "password" ? "active" : ""}`}>
                  New Password
                </label>
                <div className="fp-pw-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="fp-input-field"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={{ paddingRight: "60px" }}
                    disabled={status === "loading"}
                  />
                  <button
                    type="button"
                    className="fp-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="fp-input-group">
                <label className={`fp-input-label ${focusedField === "confirmPassword" ? "active" : ""}`}>
                  Confirm Password
                </label>
                <div className="fp-pw-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="fp-input-field"
                    placeholder="Verify password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={{ paddingRight: "60px" }}
                    disabled={status === "loading"}
                  />
                  <button
                    type="button"
                    className="fp-toggle-pw"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {notice && (
                <div className={`fp-status-notice ${status === "error" ? "error" : "success"}`}>
                  {notice}
                </div>
              )}

              <button
                type="submit"
                className="fp-btn-primary"
                disabled={!isOtpComplete || !password || !confirmPassword || status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <span className="fp-spinner" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div className="fp-resend-row">
              Didn't receive code?{" "}
              <button
                className="fp-resend-btn"
                disabled={resendTimer > 0 || status === "loading"}
                onClick={handleResendOtp}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fp-success-wrap">
            <div className="fp-success-icon">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 18L15 25L28 11" stroke="#c9d84a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="fp-title">Success!</h2>
            <p className="fp-subtitle" style={{ marginBottom: "28px" }}>
              Your password has been reset successfully.<br />
              You can now sign in using your new credentials.
            </p>
            <button
              className="fp-btn-primary"
              onClick={() => {
                onResetSuccess?.(email);
                onClose?.();
              }}
            >
              Continue to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
