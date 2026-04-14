import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, role } = useAuth();
  
  const userRole = role || (user ? 'user' : null);
  const isAdmin = userRole === 'admin';
  const isTreasurer = userRole === 'treasurer';
  const isUser = userRole === 'user';

  // Admin items - only Home and Groups
  const adminItems = [
    {
      label: 'Home',
      route: '/admin',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: 'Groups',
      route: '/browse-groups',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ];

  // Treasurer items
  const treasurerItems = [
    {
      label: 'Home',
      route: '/treasurer',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: 'Groups',
      route: '/browse-groups',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ];

  // User items
  const userItems = [
    {
      label: 'Home',
      route: '/dashboard',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: 'Groups',
      route: '/browse-groups',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
  ];

  // Choose which items to show based on role
  let items = [];
  if (isAdmin) {
    items = adminItems;
  } else if (isTreasurer) {
    items = treasurerItems;
  } else if (isUser) {
    items = userItems;
  }

  // Don't show bottom nav if not logged in
  if (!user) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <div
          key={item.label}
          className={`nav-item${pathname === item.route ? ' active' : ''}`}
          onClick={() => navigate(item.route)}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </nav>
  );
}

export default BottomNav;