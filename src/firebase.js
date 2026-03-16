// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your actual Firebase Web Config
const firebaseConfig = {
    apiKey: "AIzaSyC2bVfJT1raK2NBCRwvY0YM0i3vdcTUUik",
    authDomain: "resturantapp-01.firebaseapp.com",
    projectId: "resturantapp-01",
    storageBucket: "resturantapp-01.firebasestorage.app",
    messagingSenderId: "908921648379",
    appId: "1:908921648379:web:9b6a3fb19d8f61e01b2c5e"
};

// 1. THIS IS WHAT WAS MISSING! Start the app and define 'db'
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 2. NOW we can enable offline redundancy using that 'db'
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Offline mode only works in one browser tab at a time.");
    } else if (err.code == 'unimplemented') {
        console.warn("Your browser doesn't support offline storage.");
    }
});