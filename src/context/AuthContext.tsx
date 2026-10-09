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
  onSnapshot,
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
  updateStaffRole: (uid: string, newRole: UserRole) => Promise<void>;
  updateStaffPassword: (uid: string, newPass: string) => Promise<void>;
  deleteStaffUser: (uid: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const STAFF_SESSION_STORAGE_KEY = 'tv_staff_session_uid';

function createSessionUserFromProfile(profile: UserProfile): User {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'staff-session-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({ uid: profile.uid, email: profile.email, displayName: profile.displayName }),
    phoneNumber: profile.phone || null,
    photoURL: null,
    providerId: 'password',
  } as unknown as User;
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

        // If logged in via Google or first user, create profile if bootstrap email
        const isBootstrapEmail = firebaseUser.email === 'yoyo.kingdev.yoyo@gmail.com';

        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || (isBootstrapEmail ? 'Administrator' : 'Staff Member'),
          role: isBootstrapEmail ? 'admin' : 'staff',
          isActive: true,
          createdAt: new Date().toISOString(),
          permissions: isBootstrapEmail
            ? ['all']
            : ['attendance', 'fees', 'students', 'seats', 'enquiries'],
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
      if (user) {
        localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
        setCurrentUser(user);
        await fetchProfile(user);
        setLoading(false);
        return;
      }

      // Check if a staff/admin user is signed in via the built-in Email/Password session
      const savedStaffUid = localStorage.getItem(STAFF_SESSION_STORAGE_KEY);
      if (savedStaffUid) {
        try {
          const staffSnap = await getDoc(doc(db, 'users', savedStaffUid));
          if (staffSnap.exists()) {
            const staffData = staffSnap.data() as UserProfile;
            if (staffData.isActive !== false) {
              const normalizedProfile: UserProfile = {
                ...staffData,
                uid: staffData.uid || savedStaffUid,
                role: staffData.role === 'admin' ? 'admin' : 'staff',
              };
              setUserProfile(normalizedProfile);
              setCurrentUser(createSessionUserFromProfile(normalizedProfile));
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Could not restore staff session:', err);
        }
        localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
      }

      setCurrentUser(null);
      setUserProfile(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener on active user's Firestore profile so role permission changes apply immediately
  useEffect(() => {
    const activeUid = userProfile?.uid || currentUser?.uid;
    if (!activeUid) return;

    const unsubProfile = onSnapshot(
      doc(db, 'users', activeUid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          if (data.isActive === false) {
            // Account was suspended
            localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
            signOut(auth).catch(() => {});
            setCurrentUser(null);
            setUserProfile(null);
            return;
          }
          setUserProfile({
            ...data,
            uid: data.uid || snap.id,
            role: data.role === 'admin' ? 'admin' : 'staff',
          });
        }
      },
      () => {}
    );

    return () => unsubProfile();
  }, [currentUser?.uid, userProfile?.uid]);

  const signInWithEmail = async (email: string, pass: string) => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check Firestore `users` collection for registered Staff or Admin account
    const usersSnap = await getDocs(collection(db, 'users'));
    const matchingDocs = usersSnap.docs.filter(
      (d) => (d.data().email || '').trim().toLowerCase() === trimmedEmail
    );

    if (matchingDocs.length > 0) {
      // Sort by updatedAt descending so the latest role/password update wins
      matchingDocs.sort((a, b) => {
        const aTime = a.data().updatedAt || a.data().createdAt || '';
        const bTime = b.data().updatedAt || b.data().createdAt || '';
        return bTime.localeCompare(aTime);
      });
      const matchedDoc = matchingDocs[0];
      const matchedData = matchedDoc.data() as UserProfile;
      const docUid = matchedData.uid || matchedDoc.id;

      if (matchedData.isActive === false) {
        throw new Error('This staff account has been suspended by the administrator.');
      }

      // Verify password if stored; if account was created before password storage, bind this password on first login
      if (matchedData.staffPassword) {
        if (matchedData.staffPassword !== pass) {
          throw new Error('Incorrect password. Please enter the password set by your Administrator.');
        }
      } else {
        if (pass.length < 4) {
          throw new Error('Password must be at least 4 characters.');
        }
        await setDoc(
          doc(db, 'users', matchedDoc.id),
          { staffPassword: pass, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }

      const normalizedRole: UserRole = matchedData.role === 'admin' ? 'admin' : 'staff';
      const activeProfile: UserProfile = {
        ...matchedData,
        uid: docUid,
        role: normalizedRole,
        permissions:
          normalizedRole === 'admin'
            ? ['all']
            : ['attendance', 'fees', 'students', 'seats', 'enquiries'],
        staffPassword: matchedData.staffPassword || pass,
      };

      // Sign out any lingering Firebase Auth session so it doesn't override the staff session
      await signOut(auth).catch(() => {});
      localStorage.setItem(STAFF_SESSION_STORAGE_KEY, matchedDoc.id);
      setUserProfile(activeProfile);
      setCurrentUser(createSessionUserFromProfile(activeProfile));
      return;
    }

    // 2. Fallback to Firebase Auth if not in Firestore users yet
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, pass);
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential'
      ) {
        throw new Error(
          `No staff account found for "${trimmedEmail}". Please ask the Administrator to add this email & password in the Staff Management tab.`
        );
      }
      throw err;
    }
  };

  const registerFirstAdmin = async (email: string, pass: string, name: string, phone: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    let targetUid = `admin_${Date.now()}`;

    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
      if (cred.user) {
        targetUid = cred.user.uid;
        await updateProfile(cred.user, { displayName: name });
      }
    } catch {
      // Fallback to Firestore-backed admin session if Email/Password provider is disabled in Firebase Console
    }

    const adminProfile: UserProfile = {
      uid: targetUid,
      email: trimmedEmail,
      displayName: name.trim(),
      role: 'admin',
      phone: phone.trim(),
      staffPassword: pass,
      isActive: true,
      permissions: ['all'],
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', targetUid), adminProfile);
    localStorage.setItem(STAFF_SESSION_STORAGE_KEY, targetUid);
    setUserProfile(adminProfile);
    setCurrentUser(createSessionUserFromProfile(adminProfile));
    setIsFirstAdminSetupAvailable(false);
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
    const normalizedRole: UserRole = role === 'admin' ? 'admin' : 'staff';
    let targetUid = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Check if user already exists in Firestore (case-insensitive)
    const allUsersSnap = await getDocs(collection(db, 'users'));
    const matchingDocs = allUsersSnap.docs.filter(
      (d) => (d.data().email || '').trim().toLowerCase() === trimmedEmail
    );
    const existingDoc = matchingDocs[0];

    if (existingDoc) {
      targetUid = existingDoc.id;
      // Clean up any duplicate user docs with the same email so old roles cannot conflict
      for (let i = 1; i < matchingDocs.length; i++) {
        await deleteDoc(doc(db, 'users', matchingDocs[i].id)).catch(() => {});
      }
    } else {
      try {
        const secondaryAuth = getSecondaryAuth();
        const cred = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, pass);
        targetUid = cred.user.uid;
        await updateProfile(cred.user, { displayName: name });
        await signOut(secondaryAuth);
      } catch (authError: any) {
        const code = authError?.code || '';
        if (code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please provide a password of at least 6 characters.');
        } else if (code === 'auth/invalid-email') {
          throw new Error('The email address format is invalid.');
        }
      }
    }

    const profile: UserProfile = {
      uid: targetUid,
      email: trimmedEmail,
      displayName: name.trim(),
      role: normalizedRole,
      phone: phone ? phone.trim() : '',
      staffPassword: pass,
      isActive: true,
      permissions:
        normalizedRole === 'admin'
          ? ['all']
          : ['attendance', 'fees', 'students', 'seats', 'enquiries'],
      createdAt: existingDoc ? (existingDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', targetUid), profile, { merge: true });

    return existingDoc
      ? `Updated "${name}" (${trimmedEmail}) with role "${normalizedRole.toUpperCase()}".`
      : `Staff account created for "${name}" (${trimmedEmail}) with role "${normalizedRole.toUpperCase()}"!`;
  };

  const updateStaffRole = async (uid: string, newRole: UserRole) => {
    const isUserAdmin =
      isAdmin ||
      userProfile?.role === 'admin' ||
      currentUser?.email === 'yoyo.kingdev.yoyo@gmail.com';

    if (!isUserAdmin) {
      throw new Error('Only administrators can change role permissions.');
    }

    const normalizedRole: UserRole = newRole === 'admin' ? 'admin' : 'staff';
    const permissions =
      normalizedRole === 'admin'
        ? ['all']
        : ['attendance', 'fees', 'students', 'seats', 'enquiries'];

    const targetRef = doc(db, 'users', uid);
    const targetSnap = await getDoc(targetRef);
    const targetEmail = targetSnap.exists()
      ? (targetSnap.data().email || '').trim().toLowerCase()
      : '';

    await setDoc(
      targetRef,
      {
        role: normalizedRole,
        permissions,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Also sync any other user document sharing the same email address
    if (targetEmail) {
      const allUsersSnap = await getDocs(collection(db, 'users'));
      for (const d of allUsersSnap.docs) {
        if (d.id !== uid && (d.data().email || '').trim().toLowerCase() === targetEmail) {
          await setDoc(
            doc(db, 'users', d.id),
            {
              role: normalizedRole,
              permissions,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }
    }
  };

  const updateStaffPassword = async (uid: string, newPass: string) => {
    if (!newPass || newPass.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }
    await setDoc(
      doc(db, 'users', uid),
      { staffPassword: newPass, updatedAt: new Date().toISOString() },
      { merge: true }
    );
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
    localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    setUserProfile(null);
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  const isAdmin = userProfile
    ? userProfile.role === 'admin' && userProfile.isActive !== false
    : currentUser?.email === 'yoyo.kingdev.yoyo@gmail.com';
  const isStaff = Boolean(userProfile?.role === 'staff' || isAdmin);

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
        updateStaffRole,
        updateStaffPassword,
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
