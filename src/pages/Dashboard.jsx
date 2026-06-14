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

  // تبدیل ایمیل به کلید دیتابیس
  const emailKey = user?.email ? user.email.replace(/\./g, '_').replace(/@/g, '_at_') : "";

  // دریافت خودروهای فعال
  useEffect(() => {
    if (!user || !emailKey) {
      setLoading(false);
      return;
    }
    const carsRef = ref(db, `users_emails/${emailKey}/cars`);
    const unsubscribe = onValue(carsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.values(data).filter(car => !car.sold);
        setCars(carsArray);
      } else {
        setCars([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  // دریافت هزینه‌های خودرو
  useEffect(() => {
    if (!user || !emailKey) return;
    const expensesRef = ref(db, `users_emails/${emailKey}/expenses`);
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setExpenses(Object.values(data));
      } else {
        setExpenses([]);
      }
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  // دریافت هزینه‌های دفتری
  useEffect(() => {
    if (!user || !emailKey) return;
    const officeExpensesRef = ref(db, `users_emails/${emailKey}/officeExpenses`);
    const unsubscribe = onValue(officeExpensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setOfficeExpenses(Object.values(data));
      } else {
        setOfficeExpenses([]);
      }
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  // دریافت درآمدها
  useEffect(() => {
    if (!user || !emailKey) return;
    const incomesRef = ref(db, `users_emails/${emailKey}/incomes`);
    const unsubscribe = onValue(incomesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIncomes(Object.values(data));
      } else {
        setIncomes([]);
      }
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  // دریافت نمایندگی‌ها
  useEffect(() => {
    if (!user || !emailKey) return;
    const dealershipsRef = ref(db, `users_emails/${emailKey}/dealerships`);
    const unsubscribe = onValue(dealershipsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDealerships(Object.values(data));
      } else {
        setDealerships([]);
      }
    });
    return () => unsubscribe();
  }, [user, emailKey]);

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

  // استایل باکس‌ها
  const statsContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "30px"
  };

  const statCardStyle = (bgColor) => ({
    background: bgColor,
    padding: "24px 20px",
    borderRadius: "20px",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: "transform 0.2s, box-shadow 0.2s",
    textAlign: "center",
    cursor: "pointer",
    ":hover": {
      transform: "translateY(-5px)",
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
    }
  });

  const statIconStyle = { fontSize: "40px", marginBottom: "12px" };
  const statLabelStyle = { fontSize: "13px", opacity: 0.9, marginBottom: "8px", fontWeight: "500" };
  const statValueStyle = { fontSize: "24px", fontWeight: "bold", marginBottom: "6px" };
  const statWordsStyle = { fontSize: "10px", opacity: 0.8, marginTop: "6px" };

  // استایل بارگذاری
  const loadingStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
    flexDirection: "column",
    gap: "20px"
  };

  const loadingSpinner = {
    width: "50px",
    height: "50px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #f59e0b",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  };

  const loadingText = {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "500"
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={loadingSpinner}></div>
        <p style={loadingText}>در حال بارگذاری...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
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

      <h2 style={pageTitleStyle}>📊 داشبورد مدیریت</h2>
      <p style={pageSubtitleStyle}>خلاصه اطلاعات و آمار کلی سیستم</p>

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
  padding: "16px 24px",
  backgroundColor: "#fff",
  borderRadius: "20px",
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

const userIconStyle = { fontSize: "18px" };
const userNameStyle = { fontSize: "14px", fontWeight: "500", color: "#1e293b" };

const logoutBtnStyle = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "8px 24px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.2s",
  ":hover": { backgroundColor: "#dc2626", transform: "scale(1.02)" }
};

const pageTitleStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1e293b",
  margin: "0 0 8px 0"
};

const pageSubtitleStyle = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0 0 24px 0"
};

export default Dashboard;