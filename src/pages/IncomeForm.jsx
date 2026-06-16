import React, { useState } from "react";

const IncomeForm = ({ onSubmit, onCancel }) => {
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("deposit"); // deposit: واریزی, withdrawal: دریافتی
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const getTodayPersianDate = () => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const numberToWords = (num) => {
    if (!num || num === 0) return "صفر";
    const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
    const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
    const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
    const hundreds = ["", "یکصد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
    const thousands = ["", "هزار", "میلیون", "میلیارد"];
    
    const convertChunk = (n) => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " و " + ones[n % 10] : "");
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("❌ لطفاً عنوان را وارد کنید");
      return;
    }
    if (!amount || amount === "0") {
      alert("❌ لطفاً مبلغ را وارد کنید");
      return;
    }

    setLoading(true);
    await onSubmit({
      title,
      amount: Number(amount),
      type,
      date: date || getTodayPersianDate(),
      description
    });
    setLoading(false);
    
    // ریست فرم
    setTitle("");
    setAmount("");
    setType("deposit");
    setDate("");
    setDescription("");
  };

  const inputStyle = (index, focusedIndex) => ({
    padding: "10px 12px",
    borderRadius: "10px",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "14px",
    backgroundColor: "#ffffff",
    color: "#000000",
    border: focusedIndex === index ? "2px solid #10b981" : "1px solid #e2e8f0",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    marginBottom: "16px",
    fontFamily: "inherit"
  });

  const labelStyle = {
    fontSize: "13px",
    color: "#475569",
    marginBottom: "8px",
    display: "block",
    fontWeight: "500"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* نوع پرداخت - dropdown */}
      <label style={labelStyle}>📂 نوع پرداخت *</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{
          ...inputStyle(0, focusedIndex),
          backgroundColor: type === "deposit" ? "#f0fdf4" : "#fef2f2",
          color: type === "deposit" ? "#16a34a" : "#dc2626",
          fontWeight: "bold",
          cursor: "pointer"
        }}
        onFocus={() => setFocusedIndex(0)}
        onBlur={() => setFocusedIndex(null)}
      >
        <option value="deposit" style={{ color: "#16a34a", background: "#f0fdf4" }}>💰 واریزی (پرداخت به دیگران)</option>
        <option value="withdrawal" style={{ color: "#dc2626", background: "#fef2f2" }}>💵 دریافتی (دریافت از دیگران)</option>
      </select>

      {/* عنوان */}
      <label style={labelStyle}>📌 عنوان *</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle(1, focusedIndex)}
        onFocus={() => setFocusedIndex(1)}
        onBlur={() => setFocusedIndex(null)}
        placeholder="مثال: قسط وام، حقوق، فروش خودرو..."
      />

      {/* مبلغ */}
      <label style={labelStyle}>💰 مبلغ (تومان) *</label>
      <input
        type="text"
        value={amount ? Number(amount).toLocaleString() : ""}
        onChange={(e) => {
          let raw = e.target.value.replace(/,/g, "");
          if (raw === "" || /^\d+$/.test(raw)) setAmount(raw);
        }}
        style={{...inputStyle(2, focusedIndex), textAlign: "left", direction: "ltr"}}
        onFocus={() => setFocusedIndex(2)}
        onBlur={() => setFocusedIndex(null)}
        placeholder="مثال: 5,000,000"
      />
      {amount && amount !== "0" && (
        <div style={{ fontSize: "11px", color: "#10b981", marginTop: "-12px", marginBottom: "12px" }}>
          {numberToWords(Number(amount))} تومان
        </div>
      )}

      {/* تاریخ */}
      <label style={labelStyle}>📅 تاریخ (شمسی)</label>
      <input
        type="text"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={inputStyle(3, focusedIndex)}
        onFocus={() => setFocusedIndex(3)}
        onBlur={() => setFocusedIndex(null)}
        placeholder="مثال: 1404/01/15 (اختیاری - خالی بماند = تاریخ امروز)"
      />

      {/* توضیحات */}
      <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{...inputStyle(4, focusedIndex), minHeight: "70px", resize: "vertical"}}
        onFocus={() => setFocusedIndex(4)}
        onBlur={() => setFocusedIndex(null)}
        placeholder="توضیحات اضافی..."
        rows="3"
      />

      {/* دکمه‌ها */}
      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "10px",
            background: "#64748b",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px"
          }}
          disabled={loading}
        >
          ✕ انصراف
        </button>
        <button
          onClick={handleSubmit}
          style={{
            flex: 1,
            padding: "10px",
            background: type === "deposit" ? "#10b981" : "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
            transition: "all 0.2s"
          }}
          disabled={loading}
        >
          {loading ? "⏳ در حال ثبت..." : type === "deposit" ? "✓ ثبت واریزی" : "✓ ثبت دریافتی"}
        </button>
      </div>
    </div>
  );
};

export default IncomeForm;