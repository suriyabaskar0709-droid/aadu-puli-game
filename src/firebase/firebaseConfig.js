// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSibI6cLi6XAfBWaN0Am1eV7haeCsqXY0",
  authDomain: "aadu-puli-attam-4a9e6.firebaseapp.com",
  projectId: "aadu-puli-attam-4a9e6",
  storageBucket: "aadu-puli-attam-4a9e6.firebasestorage.app",
  messagingSenderId: "905990022723",
  appId: "1:905990022723:web:7cf5f80786144aeef096f6",
  measurementId: "G-BCCWPPY8QY",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
