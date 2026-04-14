import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '.import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/firebase';
import '../index.css';

const Navbar = () => {
  const { user, role, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Auto redirect to home if trying to access protected routes without login
  useEffect(() => {
    const protectedRoutes = ['/dashboard', '/admin', '/treasurer', '/contributions', '/add-contribution', '/browse-groups'];
    const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));
    
    // If no user is logged in and trying to access protected route, redirect to home
    if (!loading && !user && isProtectedRoute) {
      navigate('/');
    }
  }, [user, loading, location, navigate]);

  const handleLogout = async () => { 
    await logout(); 
    navigate('/'); 
    setIsOpen(false); 
  };

  // Determine user role from the context
  const userRole = role || (user ? 'user' : null);
  const isAdmin = userRole === 'admin';
  const isTreasurer = userRole === 'treasurer';
  const isRegularUser = userRole === 'user';

  // Don't render anything while checking auth state
  if (loading) {
    return null;
  }

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
            {/* Role-specific dashboards - only show the correct one */}
            {isAdmin && (
              <Link to="/admin" className="nav-link" onClick={() => setIsOpen(false)}>
                Admin Dashboard
              </Link>
            )}
            
            {isTreasurer && (
              <Link to="/treasurer" className="nav-link" onClick={() => setIsOpen(false)}>
                Treasurer Dashboard
              </Link>
            )}
            
            {isRegularUser && (
              <Link to="/dashboard" className="nav-link" onClick={() => setIsOpen(false)}>
                My Dashboard
              </Link>
            )}

            {/* Common links for all logged-in users */}
            <Link to="/browse-groups" className="nav-link" onClick={() => setIsOpen(false)}>
              Browse Groups
            </Link>
            
            <Link to="/contributions" className="nav-link" onClick={() => setIsOpen(false)}>
              Contributions
            </Link>
            
            <Link to="/add-contribution" className="nav-link" onClick={() => setIsOpen(false)}>
              Add Contribution
            </Link>

            {/* Treasurer-specific links */}
            {isTreasurer && (
              <Link to="/treasurer/manage" className="nav-link" onClick={() => setIsOpen(false)}>
                Manage Payments
              </Link>
            )}

            {/* Admin-specific links */}
            {isAdmin && (
              <>
                <Link to="/admin/users" className="nav-link" onClick={() => setIsOpen(false)}>
                  Manage Users
                </Link>
                <Link to="/admin/groups" className="nav-link" onClick={() => setIsOpen(false)}>
                  Manage Groups
                </Link>
              </>
            )}
            
            <span className="navbar-divider" aria-hidden="true"/>
            
            <span className="navbar-user-badge">
              {user.displayName || user.email?.split('@')[0]}
              <span className="navbar-role-pill" style={{
                background: isAdmin ? '#dc2626' : isTreasurer ? '#f59e0b' : '#10b981'
              }}>
                {userRole}
              </span>
            </span>
            
            <button className="navbar-signout-btn" onClick={handleLogout}>
              Sign out
            </button>
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

export default Navbar;./firebase/firebase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        setRole(docSnap.exists() ? docSnap.data().role : null);
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
    const userRole = docSnap.exists() ? docSnap.data().role : 'user';
    return userRole; // return role so Login can redirect
  };

  const register = async (name, email, password) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      name,
      email,
      role: 'user', // new users always get 'user'
      createdAt: new Date()
    });
    return 'user';
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};