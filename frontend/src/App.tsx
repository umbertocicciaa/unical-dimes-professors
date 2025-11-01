import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import TeacherList from './components/TeacherList';
import TeacherDetail from './components/TeacherDetail';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand">
          Professor Reviews
        </Link>
        <nav className="app-header__nav">
          <Link to="/">Teachers</Link>
        </nav>
        <div className="app-header__spacer" />
        {user ? (
          <div className="app-header__auth">
            <span className="app-header__user-email">{user.email}</span>
            <button type="button" onClick={handleLogout} className="app-header__logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <div className="app-header__auth">
            <Link to="/login">Login</Link>
            <Link to="/register" className="primary-link">
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

const AppRoutes: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="full-screen-message">Checking your session...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<TeacherList />} />
      <Route path="/teacher/:id" element={<TeacherDetail />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <main className="app-main">
            <AppRoutes />
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
