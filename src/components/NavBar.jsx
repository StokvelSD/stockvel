import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';
import Dashboard from '../pages/Dashboard';
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setIsOpen(false); };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={() => setIsOpen(false)}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect width="26" height="26" rx="5" fill="white" fillOpacity="0.15"/>
          <path d="M13 5v16M9 9.5h5a3 3 0 0 1 0 6H9M9 9.5v6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="navbar-logo-text">StokvelHub</span>
      </Link>

      <button className={`hamburger${isOpen ? ' active' : ''}`} onClick={() => setIsOpen(!isOpen)} aria-label="Toggle navigation">
        <span className="bar"/><span className="bar"/><span className="bar"/>
      </button>

      <div className={`nav-links${isOpen ? ' active' : ''}`}>
        <Link to="/" className="nav-link" onClick={() => setIsOpen(false)}>Home</Link>

        {user ? (
          <>
            <Link to="/contributions" className="nav-link" onClick={() => setIsOpen(false)}>Dashboard</Link>
            <Link to="/browse-groups" className="nav-link" onClick={() => setIsOpen(false)}>Browse Groups</Link>
            <Link to="/add-contribution" className="nav-link" onClick={() => setIsOpen(false)}>Add Contribution</Link>
            {user.role === 'admin' && <Link to="/admin" className="nav-link" onClick={() => setIsOpen(false)}>Admin Panel</Link>}
            {user.role === 'treasurer' && <Link to="/treasurer" className="nav-link" onClick={() => setIsOpen(false)}>Treasurer Panel</Link>}
            {(user.role === 'user' || user.role === 'general') && <Link to="/dashboard" className="nav-link" onClick={() => setIsOpen(false)}>My Dashboard</Link>}
            <span className="navbar-divider" aria-hidden="true"/>
            <span className="navbar-user-badge">
              {user.email.split('@')[0]}
              <span className="navbar-role-pill">{user.role}</span>
            </span>
            <button className="navbar-signout-btn" onClick={handleLogout}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link" onClick={() => setIsOpen(false)}>Sign in</Link>
            <Link to="/register" className="navbar-cta-btn" onClick={() => setIsOpen(false)}>Get started</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;