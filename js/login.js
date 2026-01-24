import { auth, provider, db } from './firebase-config.js';
import { 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleBtn = document.getElementById('google-login');
    const loader = document.getElementById('loader');
    const loaderText = loader ? loader.querySelector('p') : null;

    // --- 1. SMART REDIRECT SYSTEM (UPDATED: DIRECT TO GAME MAP) ---
    async function checkUserProgressAndRedirect(user) {
        showLoader("ENTERING HUNTER WORLD..."); 
        
        try {
            // Hum sirf check kar rahe hain ki data hai ya nahi, par redirect seedha map par karenge
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                console.log("User Data Found. Redirecting to Game Map...");
            } else {
                console.log("No Data Found. Redirecting to Game Map...");
            }

            // 🔥 FORCE REDIRECT TO GAME MAP
            window.location.href = 'game-map.html';

        } catch (error) {
            console.error("Redirect Error:", error);
            hideLoader();
            // Error hone par bhi map par bhejo
            window.location.href = 'game-map.html';
        }
    }

    // --- 2. LOGIN LOGIC ---
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            showLoader("VERIFYING CREDENTIALS...");

            try {
                // Firebase Login
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                
                // Login Success -> Direct Map Redirect
                await checkUserProgressAndRedirect(userCredential.user);

            } catch (error) {
                hideLoader();
                alert("LOGIN FAILED: " + error.message);
            }
        });
    }

    // --- 3. GOOGLE LOGIN ---
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            showLoader("CONNECTING TO GOOGLE...");
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Check karo agar ye user database mein hai ya nahi
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    // Agar Naya User hai -> DB entry banao
                    await setDoc(docRef, {
                        displayName: user.displayName,
                        email: user.email,
                        currentLevel: 1,
                        xp: 0,
                        setupComplete: false 
                    });
                    
                    // 🔥 UPDATE: New Google User -> Direct Game Map
                    window.location.href = 'game-map.html';
                } else {
                    // Old user -> Direct Game Map
                    await checkUserProgressAndRedirect(user);
                }
            } catch (error) {
                hideLoader();
                alert("GOOGLE ERROR: " + error.message);
            }
        });
    }

    // --- 4. SIGN UP LOGIC ---
    if(signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            showLoader("CREATING NEW HUNTER...");

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });

                // Create Empty Profile in DB
                await setDoc(doc(db, "users", user.uid), {
                    displayName: name,
                    email: email,
                    currentLevel: 1,
                    xp: 0,
                    setupComplete: false
                });

                // 🔥 UPDATE: Signup Success -> Direct Game Map
                window.location.href = 'game-map.html';

            } catch (error) {
                hideLoader();
                alert("SIGNUP FAILED: " + error.message);
            }
        });
    }

    // --- 5. TAB SWITCHING UI ---
    if(tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            loginForm.classList.remove('hidden-form');
            loginForm.classList.add('active-form');
            signupForm.classList.add('hidden-form');
            signupForm.classList.remove('active-form');
        });

        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            signupForm.classList.remove('hidden-form');
            signupForm.classList.add('active-form');
            loginForm.classList.add('hidden-form');
            loginForm.classList.remove('active-form');
        });
    }

    function showLoader(msg) {
        if(loader) {
            loader.classList.remove('hidden');
            if(loaderText) loaderText.innerText = msg;
        }
    }
    function hideLoader() {
        if(loader) loader.classList.add('hidden');
    }
});