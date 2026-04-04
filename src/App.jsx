import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavBar from "./components/NavBar";
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import TreasurerDashboard from './components/TreasurerDashboard.jsx';
import UserDashboard from './components/UserDashboard';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(role)) return <Navigate to="/unauthorized" />;
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NavBar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/treasurer" element={
            <ProtectedRoute allowedRoles={['treasurer', 'admin']}>
              <TreasurerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['user', 'treasurer', 'admin']}>
              <UserDashboard />
            </ProtectedRoute>
          } />

          <Route path="/unauthorized" element={<h2>Access Denied</h2>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
