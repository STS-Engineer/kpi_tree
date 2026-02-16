// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PlantTreeNavigatorEnhanced from './Components/PlantTreeNavigatorEnhanced';


function App() {
  return (
 
      <Router>
        <div className="App">
  
          <Routes>
          
        
             <Route path="/" element={<PlantTreeNavigatorEnhanced/>} />
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
 
  );
}

export default App;
