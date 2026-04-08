
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/NavBar';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import TreasurerDashboard from './components/TreasurerDashboard.jsx';
import UserDashboard from './components/UserDashboard';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRef } from 'react';
import { db, auth } from './Firebase-Config';
import { collection, addDoc } from 'firebase/firestore';
import AddContribution from './pages/AddContribution';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import NavBar from "./components/NavBar";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Register from "./components/Register";

import AdminDashboard from "./components/AdminDashboard";
import TreasurerDashboard from "./components/TreasurerDashboard.jsx";
import UserDashboard from "./components/UserDashboard";

import AdminPage from "./pages/AdminPage";
import CreateGroupPage from "./pages/CreateGroupPage";

import "./App.css";
import "./AdminMain.css";
import "./CreateGroup.css";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(role)) return <Navigate to="/unauthorized" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <NavBar />

        <Routes>
          {/* Public */}
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

          {/* Their dashboards */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/treasurer"
            el
              <TreasurerDashboard />
              <ProtectedRoute allowedRoles={["treasurer", "admin"]}>
               <TreasurerDashboard />
               </ProtectedRoute>
            }
          />


          <Route path="/add-contribution" element={
            <ProtectedRoute allowedRoles={['user', 'treasurer', 'admin']}>
              <AddContribution />
            </ProtectedRoute>
          } />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["user", "treasurer", "admin"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* 🔥 YOUR PAGES (integrated properly) */}
          <Route path="/" element={<Navigate to="/admin" />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/create-group" element={<CreateGroupPage />} />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<h2>Access Denied</h2>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
