import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBqDOHS26jW-usathWSFkRPp5mYgqKGdgo",
  authDomain: "carmanager-c3fec.firebaseapp.com",
  databaseURL: "https://carmanager-c3fec-default-rtdb.firebaseio.com",
  projectId: "carmanager-c3fec",
  storageBucket: "carmanager-c3fec.firebasestorage.app",
  messagingSenderId: "605175684830",
  appId: "1:605175684830:web:04bb985f9ca48a6b296c4f"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export { app };
export default app;