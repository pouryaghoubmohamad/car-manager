import React, { useState } from "react";
import { db } from "../firebaseConfig";
import { ref, push, set } from "firebase/database";

const IncomeForm = ({ user, onSaved, onCancel }) => {
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAmountChange = (e) => {
    let rawValue = e.target.value.replace(/,/g, "");
    rawValue = rawValue.replace(/\./g, "");
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setAmount(rawValue);
    }
  };

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
    
    const numStr = num.toString();
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

  const getTodayDate = () => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast("❌ لطفاً عنوان درآمد را وارد کنید", "error");
      return;
    }
    if (!amount || amount === "0") {
      showToast("❌ لطفاً مبلغ درآمد را وارد کنید", "error");
      return;
    }

    setLoading(true);

    try {
      const formData = {
        title: title.trim(),
        amount: Number(amount),
        description: description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: getTodayDate()
      };

      const incomesRef = ref(db, `users/${user.uid}/incomes`);
      const newIncomeRef = push(incomesRef);
      await set(newIncomeRef, formData);

      showToast("✅ درآمد با موفقیت ثبت شد!", "success");

      setTimeout(() => {
        setTitle("");
        setAmount("");
        setDescription("");
        setLoading(false);
        if (onSaved) onSaved();
      }, 2000);

    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ثبت درآمد! لطفاً دوباره تلاش کنید", "error");
      setLoading(false);
    }
  };

  const inputStyle = (index, focusedIndex) => ({
    padding: "8px 10px",
    borderRadius: "8px",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    color: "#000000",
    border: focusedIndex === index ? "2px solid #3b82f6" : "1px solid #d1d5db",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    marginBottom: "12px",
    fontFamily: "inherit"
  });

  const labelStyle = {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "6px",
    display: "block",
    fontWeight: "500"
  };

  const containerStyle = { display: "flex", flexDirection: "column", height: "100%" };
  const scrollableAreaStyle = { flex: 1, overflowY: "auto", paddingRight: "5px" };
  const buttonContainerStyle = { display: "flex", gap: "10px", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e2e8f0" };
  const textareaStyle = (index, focusedIndex) => ({ ...inputStyle(index, focusedIndex), resize: "vertical", minHeight: "60px" });
  const priceHintStyle = { fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px", fontFamily: "inherit", fontWeight: "normal", paddingRight: "4px" };
  const btnStyle = { flex: 1, padding: "10px 12px", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", transition: "all 0.2s" };

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          ...toastStyle,
          backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
          animation: "slideIn 0.3s ease-out"
        }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          {toast.message}
        </div>
      )}

      <div style={scrollableAreaStyle}>
        <label style={labelStyle}>📋 عنوان درآمد</label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle(0, focusedIndex)} 
          onFocus={() => setFocusedIndex(0)} 
          onBlur={() => setFocusedIndex(null)} 
          placeholder="مثال: فروش خودرو"
          disabled={loading}
        />

        <label style={labelStyle}>💰 مبلغ (تومان)</label>
        <input 
          type="text" 
          value={amount ? Number(amount).toLocaleString() : ""} 
          onChange={handleAmountChange} 
          style={{...inputStyle(1, focusedIndex), textAlign: "left", direction: "ltr"}} 
          onFocus={() => setFocusedIndex(1)} 
          onBlur={() => setFocusedIndex(null)}
          placeholder="مثال: 50,000,000"
          disabled={loading}
        />
        {amount && amount !== "0" && (
          <div style={priceHintStyle}>
            {numberToWords(Number(amount))} تومان
          </div>
        )}

        <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={textareaStyle(2, focusedIndex)}
          onFocus={() => setFocusedIndex(2)}
          onBlur={() => setFocusedIndex(null)}
          placeholder="توضیحات اضافی..."
          rows="3"
          disabled={loading}
        />

        <div style={{ 
          fontSize: "11px", 
          color: "#94a3b8", 
          marginTop: "8px", 
          padding: "8px",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          📅 تاریخ ثبت: {getTodayDate()}
        </div>
      </div>

      <div style={buttonContainerStyle}>
        <button onClick={onCancel} style={{...btnStyle, backgroundColor: "#64748b"}} disabled={loading}>
          ✕ انصراف
        </button>
        <button onClick={handleSubmit} style={{...btnStyle, backgroundColor: "#10b981"}} disabled={loading}>
          {loading ? "⏳ در حال ثبت..." : "✓ ثبت درآمد"}
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const toastStyle = {
  position: "fixed",
  top: "20px",
  right: "20px",
  padding: "12px 20px",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "500",
  zIndex: 10000,
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  display: "flex",
  alignItems: "center",
  gap: "10px"
};

export default IncomeForm;