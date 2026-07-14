// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLOa2endiRKtEB3uN--LtrgQjRtVsHz_A",
  authDomain: "abel-study-planner.firebaseapp.com",
  projectId: "abel-study-planner",
  storageBucket: "abel-study-planner.appspot.com",
  messagingSenderId: "75345755224",
  appId: "1:75345755224:web:061e4e1ea46b30a0375e2d",
  measurementId: "G-24NMFF3R5F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
