import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot,updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0eNSksXs1eeod2LRpHWuTfEIMGnP7_IQ",
  authDomain: "musicplayer-ec3de.firebaseapp.com",
  projectId: "musicplayer-ec3de",
  storageBucket: "musicplayer-ec3de.appspot.com",
  messagingSenderId: "732372698759",
  appId: "1:732372698759:web:50e9f004143f10a8679a22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, doc, setDoc,updateDoc, onSnapshot };
