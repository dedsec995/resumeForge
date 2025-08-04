import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase-config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import apiClient from '../utils/apiClient';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  getAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string, displayName?: string) => {
    try {
      // Create user with Firebase Auth on frontend
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get ID token and create user document in Firestore via backend
      const idToken = await user.getIdToken();
      
      await apiClient.post('/auth/create-user', {
        idToken,
        displayName: displayName || email.split('@')[0]
      });
      
      console.log('User created successfully');
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Sign in with Firebase Auth on frontend
      // The auth state listener will automatically handle user document creation
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Sign out from Firebase Auth
      await signOut(auth);
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    if (currentUser) {
      try {
        return await currentUser.getIdToken();
      } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // User is signed in, ensure they have a Firestore document
          const idToken = await user.getIdToken();
          await apiClient.post('/auth/ensure-user', { idToken });
          console.log('User document verified/created');
        } catch (error) {
          console.error('Error ensuring user document:', error);
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    signup,
    logout,
    loading,
    getAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};