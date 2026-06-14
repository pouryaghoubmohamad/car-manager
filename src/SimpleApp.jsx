import React, { useState, useEffect } from "react";
import { db } from "./firebaseConfig";
import { ref, push, set, onValue } from "firebase/database";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth();
const provider = new GoogleAuthProvider();

function SimpleApp() {
  const [user, setUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [carName, setCarName] = useState("");
  const [message, setMessage] = useState("");

  // ورود و خروج
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setMessage(`✅ وارد شدی با: ${currentUser.email}`);
      } else {
        setMessage("❗ خارج شدی");
      }
    });
    return () => unsubscribe();
  }, []);

  // خواندن خودروها
  useEffect(() => {
    if (!user) return;
    const carsRef = ref(db, `users/${user.uid}/cars`);
    const unsubscribe = onValue(carsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        setCars(carsArray);
        setMessage(prev => `${prev}\n📚 ${carsArray.length} خودرو پیدا شد`);
      } else {
        setCars([]);
        setMessage(prev => `${prev}\n📭 هیچ خودرویی نیست`);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // ثبت خودرو
  const addCar = async () => {
    if (!carName) {
      alert("نام خودرو را وارد کن");
      return;
    }
    const carsRef = ref(db, `users/${user.uid}/cars`);
    const newCarRef = push(carsRef);
    await set(newCarRef, { name: carName, time: Date.now() });
    setCarName("");
    setMessage(prev => `${prev}\n✏️ خودرو "${carName}" ثبت شد`);
    alert("ثبت شد!");
  };

  if (!user) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <h2>🚗 اپلیکیشن مدیریت خودرو</h2>
        <p>وارد شوید</p>
        <button onClick={() => signInWithPopup(auth, provider)} style={{ padding: 10, fontSize: 16 }}>
          ورود با گوگل
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <strong>{user.email}</strong>
          <div style={{ fontSize: 12, color: "gray" }}>ID: {user.uid}</div>
        </div>
        <button onClick={() => signOut(auth)}>خروج</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          value={carName}
          onChange={(e) => setCarName(e.target.value)}
          placeholder="نام خودرو"
          style={{ padding: 8, marginLeft: 10, width: 200 }}
        />
        <button onClick={addCar} style={{ padding: 8 }}>ثبت خودرو</button>
      </div>

      <div style={{ marginBottom: 20, padding: 10, background: "#e2e8f0", borderRadius: 5, whiteSpace: "pre-wrap", fontSize: 12 }}>
        {message}
      </div>

      <h3>لیست خودروها:</h3>
      {cars.length === 0 ? (
        <p>هیچ خودرویی ثبت نشده</p>
      ) : (
        cars.map((car, idx) => (
          <div key={car.id} style={{ padding: 8, borderBottom: "1px solid #ccc" }}>
            {idx + 1}. {car.name}
          </div>
        ))
      )}
    </div>
  );
}

export default SimpleApp;