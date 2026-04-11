import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminDashboard from "./components/AdminDashboard";
import TreasurerDashboard from "./components/TreasurerDashboard.jsx";
import UserDashboard from "./components/UserDashboard";

import AdminPage from "./pages/AdminPage";

import CreateGroupPage from "./pages/CreateGroupPage";
import BrowseGroupsPage from "./pages/BrowseGroupsPage";
import ConfigureGroupPage from "./pages/ConfigureGroupPage";
import "./App.css";
import "./AdminMain.css";
import "./CreateGroup.css";
import "./Configure.css";
import "./ShowActiveGroup.css";

import { AuthProvider, useAuth } from "./contexts/AuthContext";

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/admin" element={<AdminPage />} />

          <Route
            path="/treasurer"
            element={
              <ProtectedRoute allowedRoles={["treasurer", "admin"]}>
                <TreasurerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["user", "treasurer", "admin"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/configure-group" element={<ConfigureGroupPage />} />
          <Route path="/create-group" element={<CreateGroupPage />} />
          <Route path="/browse-groups" element={<BrowseGroupsPage />} />

          <Route path="/unauthorized" element={<h2>Access Denied</h2>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
