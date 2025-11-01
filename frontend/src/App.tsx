import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TeacherList from './components/TeacherList';
import TeacherDetail from './components/TeacherDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<TeacherList />} />
          <Route path="/teacher/:id" element={<TeacherDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
