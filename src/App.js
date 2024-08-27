import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './screens/home/home';
import Music from './screens/login/Login';
// Example of another component (e.g., a home screen after login)

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/music" element={<Music />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
