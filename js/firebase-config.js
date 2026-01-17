// js/firebase-config.js

// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// 🔥 Firestore Tools
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,        // 👈 YE MISSING THA (Ab add kar diya)
    updateDoc, 
    increment, 
    onSnapshot,
    addDoc, 
    arrayUnion,
    collection, 
    query, 
    orderBy, 
    limit, 
    where, 
    getCountFromServer 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 Auth Tools
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 2. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyC3OGH6qJxtFivJak8NJHskEhiZTv3DI4Y",
  authDomain: "acdemic-1b743.firebaseapp.com",
  projectId: "acdemic-1b743",
  storageBucket: "acdemic-1b743.firebasestorage.app",
  messagingSenderId: "359047470724",
  appId: "1:359047470724:web:66be1eabb4082c55332cd1",
  measurementId: "G-WWPLLH74LN"
};

// 3. INITIALIZE SERVICES
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); 
const auth = getAuth(app);    
const provider = new GoogleAuthProvider(); 

console.log("🔥 SYSTEM ONLINE: Database, Auth & Guild Protocols Ready");

// 4. EXPORTS
export { 
    app, db, auth, provider,
    // Database Functions
    doc, setDoc, getDoc, getDocs, updateDoc, increment, onSnapshot, // 👈 getDocs yahan bhi add kiya
    addDoc, arrayUnion,
    collection, query, orderBy, limit, where, getCountFromServer,
    // Auth Functions
    onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider
};