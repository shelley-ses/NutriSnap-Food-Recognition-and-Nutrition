import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraPage from "../pages/CameraPage";
import AnalysisPage from "../pages/AnalysisPage";
import LandingPage from "../pages/LandingPage";
import Login from "../pages/LogInPage";
import SignUpPage from "../pages/SignUpPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Routes>
    </Router>
  );
}

export default App;