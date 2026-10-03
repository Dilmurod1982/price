
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAfTp0Ep6ZRqYAubjZZ0TDm_7ffHP_5rGg",
  authDomain: "craud-c6861.firebaseapp.com",
  projectId: "craud-c6861",
  storageBucket: "craud-c6861.firebasestorage.app",
  messagingSenderId: "237758815572",
  appId: "1:237758815572:web:74d3a4e40735571042bcc1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();