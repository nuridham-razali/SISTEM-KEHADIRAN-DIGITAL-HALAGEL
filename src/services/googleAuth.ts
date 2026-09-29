import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const OAUTH_TOKEN_KEY = 'halagel_google_access_token_v1';

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = (typeof window !== 'undefined') ? localStorage.getItem(OAUTH_TOKEN_KEY) : null;

/**
 * Initializes Google OAuth state listener.
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (!cachedAccessToken && typeof window !== 'undefined') {
        cachedAccessToken = localStorage.getItem(OAUTH_TOKEN_KEY);
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(OAUTH_TOKEN_KEY);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Triggers Google Sign In popup and caches OAuth Access Token in memory and localStorage.
 */
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Sheets daripada pengesahan');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem(OAUTH_TOKEN_KEY, cachedAccessToken);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Ralat log masuk Google:', error);
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain Vercel anda';
      throw new Error(`Domain '${currentHost}' belum didaftarkan di Firebase. Sila tambah '${currentHost}' dalam Authorized Domains di Firebase Console.`);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieves cached OAuth Access Token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(OAUTH_TOKEN_KEY);
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  }
  return null;
};

/**
 * Logs out and clears token.
 */
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(OAUTH_TOKEN_KEY);
  }
};
