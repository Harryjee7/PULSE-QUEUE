import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyByUchF4aBXLQzXvVMRRtgNH3USTSBzyps",
  authDomain: "pulsequeue-fc760.firebaseapp.com",
  projectId: "pulsequeue-fc760",
  storageBucket: "pulsequeue-fc760.appspot.com",
  messagingSenderId: "130410316053",
  appId: "1:130410316053:web:1732d5bb5330223a06a91c",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;