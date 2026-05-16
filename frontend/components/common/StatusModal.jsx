import { useEffect, useMemo, useRef, useState } from "react";
import { requestOtp, verifyOtp } from "../../src/services/auth";

export default function OTPModal({ isOpen, email, onVerified, onClose }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState("idle");
  const [resendTimer, setResendTimer] = useState(30);
  const [shake, setShake] = useState(false);
  const [notice, setNotice] = useState("");
  const inputs = useRef([]);

  const maskedEmail = useMemo(() => {
    if (!email) return "your email address";
    const [localPart, domain = ""] = email.split("@");
    const start = localPart.slice(0, 1);
    const hidden = localPart.length > 1 ? "*".repeat(Math.max(localPart.length - 1, 2)) : "*";
    return `${start}${hidden}@${domain}`;
  }, [email]);

  useEffect(() => {
    if (!isOpen) return;

    setOtp(["", "", "", "", "", ""]);
    setStatus("idle");
    setResendTimer(30);
    setShake(false);
    setNotice("");

    const focusTimer = setTimeout(() => {
      inputs.current[0]?.focus();
    }, 0);

    return () => clearTimeout(focusTimer);
  }, [email, isOpen]);

  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOpen, resendTimer]);

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => {
      onVerified?.();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onVerified, status]);

  const filled = otp.filter(Boolean).length;
  const isComplete = filled === 6;

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setNotice("");

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
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

  const closeWithReset = () => {
    setOtp(["", "", "", "", "", ""]);
    setStatus("idle");
    setShake(false);
    setNotice("");
    onClose?.();
  };

  const handleVerify = async () => {
    if (!isComplete || status === "loading") return;

    setStatus("loading");
    setNotice("");

    try {
      await verifyOtp({ email, otp: otp.join("") });
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setShake(true);
      setNotice(error.message || "Incorrect code. Please try again.");
      setTimeout(() => {
        setShake(false);
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
      }, 600);
      setTimeout(() => setStatus("idle"), 800);
    }
  };

  const handleResend = async () => {
    if (!email || resendTimer > 0 || status === "loading") return;

    try {
      setStatus("loading");
      const response = await requestOtp(email);
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      setNotice(
        response.otp_delivery === "email"
          ? "A new verification code was sent to your inbox."
          : "A new code was printed in the backend console for development testing.",
      );
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setNotice(error.message || "Unable to resend the code.");
    }
  };

  if (!isOpen) return null;

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
      onClick={(event) => {
        if (event.target === event.currentTarget) closeWithReset();
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }

        .otp-card {
          background: #fff;
          border-radius: 28px;
          padding: 48px 44px 40px;
          width: 100%;
          max-width: 440px;
          position: relative;
          box-shadow: 0 32px 80px rgba(0,0,0,0.25);
          animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .otp-top-bar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 56px;
          height: 5px;
          background: #c9d84a;
          border-radius: 0 0 8px 8px;
        }

        .otp-close {
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
        .otp-close:hover { background: #e5e7eb; color: #1a2e08; }

        .otp-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a2e08;
          text-align: center;
          margin-bottom: 8px;
        }

        .otp-subtitle {
          font-size: 13px;
          color: #6b7280;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .otp-email {
          display: block;
          width: fit-content;
          margin: 0 auto 32px;
          background: #f0f7eb;
          color: #4a7c2f;
          font-weight: 600;
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 20px;
          text-align: center;
        }

        .otp-boxes {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 10px;
        }

        .otp-boxes.shake { animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
        @keyframes shake {
          10%, 90% { transform: translateX(-3px); }
          20%, 80% { transform: translateX(5px); }
          30%, 50%, 70% { transform: translateX(-5px); }
          40%, 60% { transform: translateX(5px); }
        }

        .otp-input {
          width: 52px;
          height: 60px;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          color: #1a2e08;
          background: #fafafa;
          outline: none;
          transition: all 0.2s ease;
          caret-color: #4a7c2f;
        }
        .otp-input:focus {
          border-color: #4a7c2f;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(74,124,47,0.12);
          transform: translateY(-2px);
        }
        .otp-input.filled {
          border-color: #4a7c2f;
          background: #f0f7eb;
          color: #2d5016;
        }
        .otp-input.error-box {
          border-color: #ef4444;
          background: #fef2f2;
          color: #ef4444;
          box-shadow: 0 0 0 4px rgba(239,68,68,0.1);
        }

        .otp-status {
          text-align: center;
          min-height: 22px;
          font-size: 12px;
          line-height: 1.5;
          margin: 10px 0 18px;
          color: #6b7280;
        }
        .otp-status.error { color: #ef4444; }
        .otp-status.success { color: #4a7c2f; }

        .otp-verify {
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
          margin-bottom: 20px;
        }
        .otp-verify:hover:not(:disabled) {
          background: #3d6b20;
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(45,80,22,0.35);
        }
        .otp-verify:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .otp-resend {
          text-align: center;
          font-size: 13px;
          color: #6b7280;
        }
        .otp-resend-btn {
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
        .otp-resend-btn:disabled { color: #9ca3af; cursor: default; }
        .otp-resend-btn:hover:not(:disabled) { text-decoration: underline; }

        .otp-spinner {
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

        .otp-success-wrap {
          text-align: center;
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .otp-success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #2d5016, #4a7c2f);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 12px 32px rgba(45,80,22,0.35);
          animation: popIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes popIn {
          0% { transform: scale(0); }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .otp-success-title {
          font-size: 22px;
          font-weight: 700;
          color: #1a2e08;
          margin-bottom: 8px;
        }
        .otp-success-sub {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 28px;
        }
        .otp-success-btn {
          width: 100%;
          padding: 15px;
          background: #2d5016;
          color: #c9d84a;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(45,80,22,0.25);
          transition: all 0.2s;
        }
        .otp-success-btn:hover {
          background: #3d6b20;
          transform: translateY(-1px);
        }
      `}</style>

      <div className="otp-card" onClick={(event) => event.stopPropagation()}>
        <div className="otp-top-bar" />
        <button className="otp-close" onClick={closeWithReset} aria-label="Close OTP modal">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {status === "success" ? (
          <div className="otp-success-wrap">
            <div className="otp-success-icon">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 18L15 25L28 11" stroke="#c9d84a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="otp-success-title">Verified!</div>
            <div className="otp-success-sub">
              Your account has been verified.<br />
              Redirecting you to login now.
            </div>
            <button className="otp-success-btn" onClick={() => onVerified?.()}>
              Continue to Login
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
              <dotlottie-wc
                src="https://lottie.host/b6e5f29e-d23c-40c7-8be1-9856325a096e/TXPTjNJ32K.lottie"
                style={{ width: "140px", height: "140px" }}
                autoplay
                loop
              />
            </div>

            <div className="otp-title">Check your inbox</div>
            <div className="otp-subtitle">We sent a 6-digit verification code to</div>
            <span className="otp-email">{maskedEmail}</span>

            <div className={`otp-boxes ${shake ? "shake" : ""}`}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => (inputs.current[index] = element)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  className={`otp-input ${digit ? (status === "error" ? "error-box" : "filled") : ""}`}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  disabled={status === "loading"}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className={`otp-status ${status === "error" ? "error" : status === "success" ? "success" : ""}`}>
              {notice || (status === "loading" ? "Verifying your code..." : "")}
            </div>

            <button className="otp-verify" disabled={!isComplete || status === "loading"} onClick={handleVerify}>
              {status === "loading" ? (
                <><span className="otp-spinner" />Verifying...</>
              ) : (
                "Verify Code"
              )}
            </button>

            <div className="otp-resend">
              Didn't receive it?{" "}
              <button className="otp-resend-btn" disabled={resendTimer > 0 || status === "loading"} onClick={handleResend}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
