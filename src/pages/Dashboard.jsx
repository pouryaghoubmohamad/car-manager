// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../firebaseConfig";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";

const Dashboard = ({ user }) => {
  const [cars, setCars] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [officeExpenses, setOfficeExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [dealerships, setDealerships] = useState([]);
  const [loading, setLoading] = useState(true);

  // دریافت خودروهای فعال
  useEffect(() => {
    if (!user) return;
    const carsRef = ref(db, `users/${user.uid}/cars`);
    const unsubscribe = onValue(carsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.entries(data)
          .filter(([_, car]) => !car.sold)
          .map(([id, car]) => ({ id, ...car }));
        setCars(carsArray);
      } else {
        setCars([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // دریافت هزینه‌های خودرو
  useEffect(() => {
    if (!user) return;
    const expensesRef = ref(db, `users/${user.uid}/expenses`);
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const expensesArray = Object.entries(data).map(([id, exp]) => ({ id, ...exp }));
        setExpenses(expensesArray);
      } else {
        setExpenses([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // دریافت هزینه‌های دفتری
  useEffect(() => {
    if (!user) return;
    const officeExpensesRef = ref(db, `users/${user.uid}/officeExpenses`);
    const unsubscribe = onValue(officeExpensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const expensesArray = Object.values(data);
        setOfficeExpenses(expensesArray);
      } else {
        setOfficeExpenses([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // دریافت درآمدها
  useEffect(() => {
    if (!user) return;
    const incomesRef = ref(db, `users/${user.uid}/incomes`);
    const unsubscribe = onValue(incomesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const incomesArray = Object.values(data);
        setIncomes(incomesArray);
      } else {
        setIncomes([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // دریافت نمایندگی‌ها
  useEffect(() => {
    if (!user) return;
    const dealershipsRef = ref(db, `users/${user.uid}/dealerships`);
    const unsubscribe = onValue(dealershipsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const dealershipsArray = Object.values(data);
        setDealerships(dealershipsArray);
      } else {
        setDealerships([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => {
    auth.signOut();
  };

  const formatPrice = (price) => price?.toLocaleString() || "0";

  const numberToWords = (num) => {
    if (!num || num === 0) return "صفر";
    const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
    const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
    const hundreds = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
    const thousands = ["", "هزار", "میلیون", "میلیارد"];
    
    const convertChunk = (n) => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 100) {
        if (n < 20) {
          const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
          return teens[n - 10];
        }
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " و " + ones[n % 10] : "");
      }
      return hundreds[Math.floor(n / 100)] + (n % 100 !== 0 ? " و " + convertChunk(n % 100) : "");
    };
    
    const numStr = Math.abs(num).toString();
    let chunks = [];
    for (let i = numStr.length; i > 0; i -= 3) {
      chunks.unshift(parseInt(numStr.substring(Math.max(0, i - 3), i), 10));
    }
    
    let words = [];
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i] !== 0) {
        words.push(convertChunk(chunks[i]) + " " + thousands[chunks.length - 1 - i]);
      }
    }
    
    return words.join(" و ");
  };

  // محاسبه آمار
  const totalCarsCount = cars.length;
  const totalPurchasePrice = cars.reduce((sum, car) => sum + (Number(car.price) || 0), 0);
  
  let totalCarExpenses = 0;
  expenses.forEach(exp => {
    const carExists = cars.some(car => car.id === exp.carId);
    if (carExists) {
      totalCarExpenses += Number(exp.amount) || 0;
    }
  });
  
  const totalOfficeExpenses = officeExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalIncomes = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const uniqueCustomers = [...new Set(cars.map(car => car.buyerName))].length;
  const totalDealerships = dealerships.length;

  const statsContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "24px"
  };

  const statCardStyle = (bgColor) => ({
    background: bgColor,
    padding: "20px 16px",
    borderRadius: "20px",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.2s",
    textAlign: "center",
    cursor: "pointer",
    ":hover": {
      transform: "translateY(-4px)"
    }
  });

  const statIconStyle = { fontSize: "36px", marginBottom: "10px" };
  const statLabelStyle = { fontSize: "13px", opacity: 0.9, marginBottom: "6px", fontWeight: "500" };
  const statValueStyle = { fontSize: "22px", fontWeight: "bold", marginBottom: "6px" };
  const statWordsStyle = { fontSize: "10px", opacity: 0.8, marginTop: "4px" };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>در حال بارگذاری...</div>;
  }

  return (
    <div>
      {/* هدر با نام کاربر و دکمه خروج */}
      <div style={headerStyle}>
        <div style={userInfoStyle}>
          <span style={userIconStyle}>👤</span>
          <span style={userNameStyle}>{user?.email}</span>
        </div>
        <button onClick={handleLogout} style={logoutBtnStyle}>
          🚪 خروج
        </button>
      </div>

      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px", color: "#1e293b" }}>
        📊 داشبورد مدیریت
      </h2>

      <div style={statsContainerStyle}>
        {/* 1. مجموع خرید ماشین */}
        <div style={statCardStyle("linear-gradient(135deg, #3b82f6, #2563eb)")}>
          <div style={statIconStyle}>🚗</div>
          <div style={statLabelStyle}>مجموع خرید ماشین</div>
          <div style={statValueStyle}>{totalPurchasePrice.toLocaleString()} تومان</div>
          <div style={statWordsStyle}>{numberToWords(totalPurchasePrice)} تومان</div>
        </div>

        {/* 2. مجموع هزینه‌ها */}
        <div style={statCardStyle("linear-gradient(135deg, #f59e0b, #d97706)")}>
          <div style={statIconStyle}>🔧</div>
          <div style={statLabelStyle}>مجموع هزینه‌ها</div>
          <div style={statValueStyle}>{totalCarExpenses.toLocaleString()} تومان</div>
          <div style={statWordsStyle}>{numberToWords(totalCarExpenses)} تومان</div>
        </div>

        {/* 3. مجموع هزینه دفتر */}
        <div style={statCardStyle("linear-gradient(135deg, #ef4444, #dc2626)")}>
          <div style={statIconStyle}>💰</div>
          <div style={statLabelStyle}>مجموع هزینه دفتر</div>
          <div style={statValueStyle}>{totalOfficeExpenses.toLocaleString()} تومان</div>
          <div style={statWordsStyle}>{numberToWords(totalOfficeExpenses)} تومان</div>
        </div>

        {/* 4. مجموع درآمدها */}
        <div style={statCardStyle("linear-gradient(135deg, #10b981, #059669)")}>
          <div style={statIconStyle}>💵</div>
          <div style={statLabelStyle}>مجموع درآمدها</div>
          <div style={statValueStyle}>{totalIncomes.toLocaleString()} تومان</div>
          <div style={statWordsStyle}>{numberToWords(totalIncomes)} تومان</div>
        </div>

        {/* 5. تعداد خودروها */}
        <div style={statCardStyle("linear-gradient(135deg, #06b6d4, #0891b2)")}>
          <div style={statIconStyle}>🚙</div>
          <div style={statLabelStyle}>تعداد خودروها</div>
          <div style={statValueStyle}>{totalCarsCount} دستگاه</div>
        </div>

        {/* 6. تعداد مشتری */}
        <div style={statCardStyle("linear-gradient(135deg, #8b5cf6, #7c3aed)")}>
          <div style={statIconStyle}>👥</div>
          <div style={statLabelStyle}>تعداد مشتری</div>
          <div style={statValueStyle}>{uniqueCustomers} نفر</div>
        </div>

        {/* 7. تعداد نمایندگی */}
        <div style={statCardStyle("linear-gradient(135deg, #ec4899, #db2777)")}>
          <div style={statIconStyle}>🏢</div>
          <div style={statLabelStyle}>تعداد نمایندگی</div>
          <div style={statValueStyle}>{totalDealerships} عدد</div>
        </div>
      </div>
    </div>
  );
};

// استایل‌ها
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  padding: "12px 20px",
  backgroundColor: "#fff",
  borderRadius: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
};

const userInfoStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  backgroundColor: "#f1f5f9",
  padding: "8px 16px",
  borderRadius: "12px"
};

const userIconStyle = {
  fontSize: "18px"
};

const userNameStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#1e293b"
};

const logoutBtnStyle = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "8px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.2s",
  ":hover": {
    backgroundColor: "#dc2626"
  }
};

export default Dashboard;