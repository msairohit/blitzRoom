import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDesZCae4Vvo94KmogHzdrjPJjnc9hjXTU",
  authDomain: "blitzroom-859c1.firebaseapp.com",
  projectId: "blitzroom-859c1",
  storageBucket: "blitzroom-859c1.firebasestorage.app",
  messagingSenderId: "25519471303",
  appId: "1:25519471303:web:a37cfb2d29fbe765a15ce2",
  measurementId: "G-0VWDTLB4E5",
  databaseURL: "https://blitzroom-859c1-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let firebaseAuth;
if (Platform.OS === 'web') {
  firebaseAuth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} else {
  // Dynamically require from the main entry point to avoid resolving errors in Metro and Web
  const { getReactNativePersistence } = require('firebase/auth');
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export const auth = firebaseAuth;
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export default app;
