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
    const loaderText = loader.querySelector('p');

    // --- 1. SMART REDIRECT SYSTEM (The Traffic Police) ---
    async function checkUserProgressAndRedirect(user) {
        showLoader("CHECKING HUNTER DATA...");
        
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("User Data Found:", data);

                // STEP 1: Agar Setup Complete hai (Role Selected) -> Map
                if (data.setupComplete === true && data.role) {
                    console.log("Redirect -> Game Map");
                    window.location.href = 'game-map.html';
                }
                // STEP 2: Agar Branch hai par Role nahi -> Role Select
                else if (data.branch) {
                    console.log("Redirect -> Role Select");
                    window.location.href = 'role-select.html';
                }
                // STEP 3: Agar Branch bhi nahi hai -> Profile Setup
                else {
                    console.log("Redirect -> Profile Setup");
                    window.location.href = 'profile.html';
                }
            } else {
                // Agar DB entry nahi hai (Rare error), Profile bhejo
                window.location.href = 'profile.html';
            }
        } catch (error) {
            console.error("Redirect Error:", error);
            hideLoader();
            alert("System Error: Could not verify profile.");
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
                
                // Login Success -> Ab Check karo kahan bhejna hai
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
                    // New user -> Profile Setup
                    window.location.href = 'profile.html';
                } else {
                    // Old user -> Check Progress
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

                // Signup ke baad Profile page par jana zaroori hai
                window.location.href = 'profile.html';

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