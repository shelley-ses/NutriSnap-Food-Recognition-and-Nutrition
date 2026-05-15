import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraPage from "../pages/CameraPage";
import AnalysisPage from "../pages/AnalysisPage";
import LandingPage from "../pages/LandingPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Routes>
    </Router>
  );
}

export default App;