import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isFirstAdminSetupAvailable: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerFirstAdmin: (email: string, pass: string, name: string, phone: string) => Promise<void>;
  registerStaffMember: (email: string, pass: string, name: string, phone: string, role: UserRole) => Promise<string | void>;
  deleteStaffUser: (uid: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get an isolated secondary Auth instance so admin is never logged out
function getSecondaryAuth(): ReturnType<typeof getAuth> {
  const secondaryAppName = 'SecondaryStaffRegistrationApp';
  let secondaryApp: FirebaseApp;
  const existing = getApps().find((a) => a.name === secondaryAppName);
  if (existing) {
    secondaryApp = existing;
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  return getAuth(secondaryApp);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstAdminSetupAvailable, setIsFirstAdminSetupAvailable] = useState(false);

  // Check if any admin exists in the database
  const checkFirstAdminNeeded = async () => {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(5)));
      if (usersSnap.empty) {
        setIsFirstAdminSetupAvailable(true);
      } else {
        const hasAdmin = usersSnap.docs.some(d => d.data().role === 'admin');
        setIsFirstAdminSetupAvailable(!hasAdmin);
      }
    } catch {
      // In case rules block unauthenticated listing, first admin setup stays available if no user profile
      setIsFirstAdminSetupAvailable(true);
    }
  };

  const fetchProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setUserProfile(data);
        return data;
      } else {
        // If profile doesn't exist by UID, check if a staff/admin record was pre-registered by email
        if (firebaseUser.email) {
          try {
            const emailQuery = query(
              collection(db, 'users'),
              where('email', '==', firebaseUser.email.toLowerCase()),
              limit(1)
            );
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              const matchedDoc = emailSnap.docs[0];
              const matchedData = matchedDoc.data() as UserProfile;
              const syncedProfile: UserProfile = {
                ...matchedData,
                uid: firebaseUser.uid,
                updatedAt: new Date().toISOString(),
              };
              await setDoc(userRef, syncedProfile);
              if (matchedDoc.id !== firebaseUser.uid) {
                await deleteDoc(doc(db, 'users', matchedDoc.id)).catch(() => {});
              }
              setUserProfile(syncedProfile);
              setIsFirstAdminSetupAvailable(false);
              return syncedProfile;
            }
          } catch (queryErr) {
            console.warn("Could not query user by email:", queryErr);
          }
        }

        // If logged in via Google or first user, create profile if bootstrap email or empty db
        const isBootstrapEmail =
          firebaseUser.email === 'yoyo.kingdev.yoyo@gmail.com' ||
          (firebaseUser.email && firebaseUser.email.toLowerCase().includes('admin'));

        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Administrator',
          role: isBootstrapEmail ? 'admin' : 'staff',
          isActive: true,
          createdAt: new Date().toISOString(),
          permissions: ['all'],
        };

        try {
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
          setIsFirstAdminSetupAvailable(false);
          return newProfile;
        } catch {
          // If Firestore write fails, fallback to local memory representation
          setUserProfile(newProfile);
          return newProfile;
        }
      }
    } catch (err) {
      console.warn("Could not fetch user profile:", err);
      return null;
    }
  };

  useEffect(() => {
    checkFirstAdminNeeded();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const registerFirstAdmin = async (email: string, pass: string, name: string, phone: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
      const adminProfile: UserProfile = {
        uid: cred.user.uid,
        email: email.trim(),
        displayName: name,
        role: 'admin',
        phone,
        isActive: true,
        permissions: ['all'],
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), adminProfile);
      setUserProfile(adminProfile);
      setIsFirstAdminSetupAvailable(false);
    }
  };

  const registerStaffMember = async (
    email: string,
    pass: string,
    name: string,
    phone: string,
    role: UserRole
  ) => {
    const isUserAdmin =
      isAdmin ||
      userProfile?.role === 'admin' ||
      currentUser?.email === 'yoyo.kingdev.yoyo@gmail.com';

    if (!isUserAdmin) {
      throw new Error('Only institute administrators have permission to register staff accounts.');
    }

    const trimmedEmail = email.trim().toLowerCase();
    let targetUid = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let authNote = '';

    // Check if user already exists in Firestore
    const existingUsers = await getDocs(
      query(collection(db, 'users'), where('email', '==', trimmedEmail), limit(1))
    );
    if (!existingUsers.empty) {
      throw new Error(`A staff profile for "${trimmedEmail}" is already registered in the system.`);
    }

    try {
      // Use isolated secondary Firebase App instance so the current Admin session is never signed out
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, pass);
      targetUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: name });
      // Immediately sign out secondary auth so its state is cleared
      await signOut(secondaryAuth);
    } catch (authError: any) {
      const code = authError?.code || '';
      console.warn('Secondary auth notice:', code, authError?.message);
      if (code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please provide a password of at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        throw new Error('The email address format is invalid.');
      } else if (code === 'auth/email-already-in-use') {
        authNote = 'Email is already registered in Firebase Authentication; staff profile linked in database.';
      } else if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        authNote = `Staff member "${name}" registered in database! (Staff can sign in with Google using this email, or enable Email/Password under Firebase Console > Authentication).`;
      } else {
        authNote = `Staff member "${name}" created in database.`;
      }
    }

    const profile: UserProfile = {
      uid: targetUid,
      email: trimmedEmail,
      displayName: name,
      role,
      phone: phone ? phone.trim() : '',
      isActive: true,
      permissions: role === 'admin' ? ['all'] : ['attendance', 'fees', 'students', 'seats'],
      createdAt: new Date().toISOString(),
    };
    // Primary admin writes to Firestore
    await setDoc(doc(db, 'users', targetUid), profile);

    return authNote || `Staff account created successfully for ${name}!`;
  };

  const deleteStaffUser = async (uid: string) => {
    const isUserAdmin =
      isAdmin ||
      userProfile?.role === 'admin' ||
      currentUser?.email === 'yoyo.kingdev.yoyo@gmail.com';

    if (!isUserAdmin) {
      throw new Error('Only administrators can remove staff members.');
    }
    if (uid === currentUser?.uid) {
      throw new Error('You cannot delete your own logged-in administrator account.');
    }
    await deleteDoc(doc(db, 'users', uid));
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  const isAdmin = userProfile?.role === 'admin' || currentUser?.email === 'yoyo.kingdev.yoyo@gmail.com';
  const isStaff = userProfile?.role === 'staff' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isStaff,
        isFirstAdminSetupAvailable,
        signInWithEmail,
        registerFirstAdmin,
        registerStaffMember,
        deleteStaffUser,
        signInWithGoogle,
        logout,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
