import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const envConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
const hasRealConfig = requiredKeys.every((key) => Boolean(envConfig[key]));

if (!hasRealConfig && process.env.NODE_ENV !== "test") {
  // eslint-disable-next-line no-console
  console.warn(
    "Firebase config is missing. Set REACT_APP_FIREBASE_* env vars to enable login."
  );
}

const firebaseConfig = hasRealConfig
  ? envConfig
  : {
      apiKey: "demo",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo",
      appId: "demo",
    };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const analytics = (() => {
  if (!firebaseConfig.measurementId) return null;
  if (typeof window === "undefined") return null;

  try {
    return getAnalytics(app);
  } catch {
    return null;
  }
})();

export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  return signInWithPopup(auth, provider);
};

export const logout = async () => {
  return signOut(auth);
};
