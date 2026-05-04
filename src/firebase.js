import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnCZPqmHHFwe8BhvmH2X_cQJB7njxJN1Y",
  authDomain: "project-f48d5c78-8f0b-426e-8a1.firebaseapp.com",
  projectId: "project-f48d5c78-8f0b-426e-8a1",
  storageBucket: "project-f48d5c78-8f0b-426e-8a1.firebasestorage.app",
  messagingSenderId: "764768146434",
  appId: "1:764768146434:web:0ec3498e3008f5b7f8031b",
  measurementId: "G-D2TFXJPEW7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const logout = () => {
  return signOut(auth);
};