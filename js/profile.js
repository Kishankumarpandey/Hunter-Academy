import { auth, db } from './firebase-config.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const setupForm = document.getElementById('setup-form');
    const degreeSelect = document.getElementById('degree');
    const branchSection = document.getElementById('branch-section');
    const submitBtn = setupForm ? setupForm.querySelector('button') : null;

    let currentUserUID = null;

    // --- 1. AUTH & AUTO-REDIRECT CHECK ---
    console.log("Checking Auth State...");
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User Detected:", user.email);
            currentUserUID = user.uid;
            
            // [IMPORTANT] Ab hum turant check karenge ki data pehle se hai kya?
            await checkExistingProfile(user.uid);

        } else {
            console.log("No User. Redirecting to Login.");
            window.location.href = 'login.html';
        }
    });

    // --- Function: Check agar banda pehle se setup kar chuka hai ---
    async function checkExistingProfile(uid) {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Found Existing Data:", data);

                // Case 1: Agar sab kuch set hai -> Game Map
                if (data.setupComplete === true && data.role) {
                    console.log("Redirecting to Game Map...");
                    window.location.href = 'game-map.html';
                }
                // Case 2: Agar Branch set hai par Role nahi -> Role Select
                else if (data.branch) {
                    console.log("Redirecting to Role Select...");
                    window.location.href = 'role-select.html';
                }
                // Case 3: Agar Branch nahi hai -> Yahi Ruko (Profile bharega)
                else {
                    console.log("Profile incomplete. Please fill the form.");
                }
            }
        } catch (error) {
            console.error("Auto-Check Error:", error);
        }
    }

    // --- 2. BRANCH REVEAL LOGIC ---
    if(degreeSelect && branchSection) {
        degreeSelect.addEventListener('change', function() {
            if (this.value) {
                branchSection.classList.remove('hidden-section');
                branchSection.classList.add('reveal');
            }
        });
    }

    // --- 3. SAVE DATA LOGIC ---
    if (setupForm) {
        setupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUserUID) {
                alert("Session Error. Please Login Again.");
                return;
            }

            const studentType = document.getElementById('student-type').value;
            const degree = document.getElementById('degree').value;
            const branch = document.getElementById('branch').value;

            if (!studentType || !degree || !branch) {
                alert("Please fill all fields!");
                return;
            }

            if(submitBtn) submitBtn.innerHTML = "SAVING...";

            try {
                await setDoc(doc(db, "users", currentUserUID), {
                    studentType: studentType,
                    degree: degree,
                    branch: branch,
                    setupComplete: false,
                    lastUpdated: new Date()
                }, { merge: true });

                console.log("Success! Redirecting...");
                window.location.href = 'role-select.html';

            } catch (error) {
                console.error("Save Error:", error);
                alert("Database Error: " + error.message);
                if(submitBtn) submitBtn.innerHTML = "TRY AGAIN";
            }
        });
    }
});