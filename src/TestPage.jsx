import React, { useState, useEffect } from "react";
import { db } from "./firebaseConfig";
import { ref, push, set, onValue } from "firebase/database";

const TestPage = () => {
  const [cars, setCars] = useState([]);
  const [carName, setCarName] = useState("");

  // دریافت خودروها
  useEffect(() => {
    const carsRef = ref(db, 'testCars');
    const unsubscribe = onValue(carsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value
        }));
        setCars(carsArray);
      } else {
        setCars([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // افزودن خودرو
  const addCar = async () => {
    if (!carName) return;
    const carsRef = ref(db, 'testCars');
    const newCarRef = push(carsRef);
    await set(newCarRef, { name: carName, time: new Date().toISOString() });
    setCarName("");
    alert("ثبت شد!");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>صفحه تست دیتابیس</h2>
      <input
        type="text"
        value={carName}
        onChange={(e) => setCarName(e.target.value)}
        placeholder="نام خودرو"
        style={{ padding: "8px", marginLeft: "10px" }}
      />
      <button onClick={addCar} style={{ padding: "8px 16px" }}>ثبت</button>
      
      <h3>لیست خودروها:</h3>
      {cars.length === 0 ? (
        <p>هیچ خودرویی ثبت نشده</p>
      ) : (
        cars.map((car) => (
          <div key={car.id}>
            {car.name} - {new Date(car.time).toLocaleTimeString()}
          </div>
        ))
      )}
    </div>
  );
};

export default TestPage;