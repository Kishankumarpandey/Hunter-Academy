// js/firebase-config.js

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; // New Import

const firebaseConfig = {
    apiKey: "AIzaSyC3OGH6qJxtFivJak8NJHskEhiZTv3DI4Y",
    authDomain: "acdemic-1b743.firebaseapp.com",
    projectId: "acdemic-1b743",
    storageBucket: "acdemic-1b743.firebasestorage.app",
    messagingSenderId: "359047470724",
    appId: "1:359047470724:web:66be1eabb4082c55332cd1",
    measurementId: "G-WWPLLH74LN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // Initialize Database

// Export Database (db) too
export { auth, provider, db };