import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC5V5n1qO55bbqc3a9Zdpj-iLeVtwycty4",
  authDomain: "love-774a6.firebaseapp.com",
  projectId: "love-774a6",
  storageBucket: "love-774a6.firebasestorage.app",
  messagingSenderId: "681936266064",
  appId: "1:681936266064:web:81aebe0071358000c8c255",
  measurementId: "G-STJ2Q4BNHZ",
  databaseURL: "https://love-774a6-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);