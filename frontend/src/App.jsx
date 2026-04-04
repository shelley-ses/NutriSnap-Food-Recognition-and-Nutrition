import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraPage from "../pages/CameraPage";
import AnalysisPage from "../pages/AnalysisPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CameraPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Routes>
    </Router>
  );
}

export default App;