import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

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