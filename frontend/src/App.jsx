import { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import CameraPage from "../pages/CameraPage";
import AnalysisPage from "../pages/AnalysisPage";
import LandingPage from "../pages/LandingPage";
import SaveMealPage from "../pages/SaveMealPage";
import DailyLogPage from "../pages/DailyLogPage";
import Login from "../pages/LogInPage";
import SignUpPage from "../pages/SignUpPage";
import ProfilePage from "../pages/ProfilePage";
import { getMe } from "../services/api";
import OnboardingWizard from "../components/common/OnboardingWizard";

// Protect routes for logged-in users only
function ProtectedRoute({ children }) {
  // Read from localStorage once — stable ref so it never re-triggers the effect
  const wasLoggedIn = useRef(localStorage.getItem("nutrisnap_logged_in") === "true");
  const [loading, setLoading] = useState(wasLoggedIn.current);
  const [profile, setProfile] = useState(null);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    // Only run once on mount; if never logged in, skip immediately
    if (!wasLoggedIn.current) return;

    let active = true;
    getMe().then((res) => {
      if (!active) return;
      if (res.ok && res.data) {
        setProfile(res.data);
        setLoading(false);
      } else {
        localStorage.removeItem("nutrisnap_logged_in");
        setAuthFailed(true);
        setLoading(false);
      }
    }).catch(() => {
      if (!active) return;
      localStorage.removeItem("nutrisnap_logged_in");
      setAuthFailed(true);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []); // Run once on mount only — no dependency on reactive values

  if (!wasLoggedIn.current || authFailed) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--app-color-surface)]">
        <div className="text-center font-poppins">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--app-color-primary)] mx-auto mb-4"></div>
          <p className="text-xs font-bold text-[#6f8a63] uppercase tracking-wider">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!profile?.calorie_goal) {
    return (
      <OnboardingWizard 
        onComplete={(goalData) => {
          setProfile((prev) => ({ ...prev, calorie_goal: goalData }));
        }} 
      />
    );
  }

  return children;
}

// Redirect logged-in users away from auth pages (login/signup)
function PublicRoute({ children }) {
  const isLoggedIn = localStorage.getItem("nutrisnap_logged_in") === "true";
  if (isLoggedIn) {
    return <Navigate to="/daily-log" replace />;
  }
  return children;
}

function App() {
  // Inactivity Auto-Logout (2 hours of inactivity)
  useEffect(() => {
    let idleTimeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimeout);
      // 2 hours = 2 * 60 * 60 * 1000 = 7,200,000 milliseconds
      idleTimeout = setTimeout(() => {
        const isLoggedIn = localStorage.getItem("nutrisnap_logged_in") === "true";
        if (isLoggedIn) {
          localStorage.removeItem("nutrisnap_logged_in");
          // Clear cookie by hit logout or just redirect to login screen
          window.location.href = "/login";
        }
      }, 7200000);
    };

    // User interactions to monitor
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    // Initialize listeners if logged in
    const isLoggedIn = localStorage.getItem("nutrisnap_logged_in") === "true";
    if (isLoggedIn) {
      activityEvents.forEach((event) => window.addEventListener(event, resetIdleTimer));
      resetIdleTimer();
    }

    return () => {
      clearTimeout(idleTimeout);
      activityEvents.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Auth pages protected from authenticated users */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
        
        {/* App pages protected from guest users */}
        <Route path="/camera" element={<ProtectedRoute><CameraPage /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
        <Route path="/saved-meals" element={<ProtectedRoute><SaveMealPage /></ProtectedRoute>} />
        <Route path="/daily-log" element={<ProtectedRoute><DailyLogPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;