// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PlantTreeNavigatorEnhanced from './Components/PlantTreeNavigatorEnhanced';
import PlantStatsDashboard from './Components/PLantstatsdashboard';


function App() {
  return (

    <Router>
      <div className="App">

        <Routes>


          <Route path="/" element={<PlantTreeNavigatorEnhanced />} />
          <Route path="/dashboard" element={<PlantStatsDashboard />} />
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>

  );
}

export default App;
