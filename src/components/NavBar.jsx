import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <span>💰</span>
        <span>StokvelHub</span>
      </div>

      <div className={`hamburger ${isOpen ? 'active' : ''}`} onClick={toggleMenu}>
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </div>

      <div className={`nav-links ${isOpen ? 'active' : ''}`}>
        <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
        {user ? (
          <>
            <Link to="/add-contribution">Add Contribution</Link>
            <span className="user-welcome">Welcome, {user.email} ({user.role})</span>
            <Link to="/browse-groups" onClick={() => setIsOpen(false)}>Browse Groups</Link>
            {user.role === 'admin' && <Link to="/admin" onClick={() => setIsOpen(false)}>Admin Panel</Link>}
            {user.role === 'treasurer' && <Link to="/treasurer" onClick={() => setIsOpen(false)}>Treasurer Panel</Link>}
            {(user.role === 'user' || user.role === 'general') && <Link to="/dashboard" onClick={() => setIsOpen(false)}>My Dashboard</Link>}
            <button onClick={() => { handleLogout(); setIsOpen(false); }} className="logout-btn">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setIsOpen(false)}>Login</Link>
            <Link to="/register" onClick={() => setIsOpen(false)}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;