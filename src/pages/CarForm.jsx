import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, push, set, update } from "firebase/database";

const CarForm = ({ user, onBack, onSaved, editingCar }) => {
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [carName, setCarName] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [price, setPrice] = useState("");
  const [productionYear, setProductionYear] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [attorneyExpiry, setAttorneyExpiry] = useState("");
  const [technicalInspectionDate, setTechnicalInspectionDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const emailKey = user?.email ? user.email.replace(/\./g, '_').replace(/@/g, '_at_') : "";
  const isEditing = !!editingCar;

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (editingCar) {
      setCarName(editingCar.carName || "");
      setBuyerName(editingCar.buyerName || "");
      setPrice(editingCar.price?.toString() || "");
      setProductionYear(editingCar.productionYear || "");
      setColor(editingCar.color || "");
      setDescription(editingCar.description || "");
      setPurchaseDate(editingCar.purchaseDate || "");
      setInsuranceExpiry(editingCar.insuranceExpiry || "");
      setAttorneyExpiry(editingCar.attorneyExpiry || "");
      setTechnicalInspectionDate(editingCar.technicalInspectionDate || "");
    }
  }, [editingCar]);

  const handlePriceChange = (e) => {
    let rawValue = e.target.value.replace(/,/g, "");
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setPrice(rawValue);
    }
  };

  const numberToPersianWords = (num) => {
    if (!num || num === "0") return "صفر تومان";
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
    
    return words.join(" و ") + " تومان";
  };

  const handleSubmit = async () => {
    if (!carName.trim()) {
      showToast("❌ لطفاً نام خودرو را وارد کنید", "error");
      return;
    }
    if (!buyerName.trim()) {
      showToast("❌ لطفاً نام خریدار را وارد کنید", "error");
      return;
    }
    if (!price || price === "0") {
      showToast("❌ لطفاً قیمت خودرو را وارد کنید", "error");
      return;
    }

    const formData = {
      carName: carName.trim(),
      buyerName: buyerName.trim(),
      price: Number(price),
      productionYear: productionYear.trim() || "",
      color: color.trim() || "",
      description: description.trim() || "",
      purchaseDate: purchaseDate || null,
      insuranceExpiry: insuranceExpiry || null,
      attorneyExpiry: attorneyExpiry || null,
      technicalInspectionDate: technicalInspectionDate || null,
      createdAt: new Date().toISOString(),
      sold: false
    };

    setLoading(true);

    try {
      if (isEditing) {
        const carRef = ref(db, `users_emails/${emailKey}/cars/${editingCar.id}`);
        await update(carRef, { ...formData, updatedAt: new Date().toISOString() });
        showToast(`✅ خودرو "${carName}" با موفقیت ویرایش شد`, "success");
      } else {
        const carsRef = ref(db, `users_emails/${emailKey}/cars`);
        await push(carsRef, formData);
        showToast(`✅ خودرو "${carName}" با موفقیت ثبت شد`, "success");
      }
      
      setTimeout(() => {
        if (onBack) onBack();
        if (onSaved) onSaved();
      }, 1500);
    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ذخیره اطلاعات", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (index) => ({
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

  const rowStyle = { display: "flex", gap: "15px", marginBottom: "5px" };
  const containerStyle = { display: "flex", flexDirection: "column", height: "100%" };
  const scrollableAreaStyle = { flex: 1, overflowY: "auto", paddingRight: "5px" };
  const buttonContainerStyle = { display: "flex", gap: "10px", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e2e8f0" };
  const textareaStyle = (index) => ({ ...inputStyle(index), resize: "vertical", minHeight: "60px" });
  const priceInputStyle = (index) => ({ ...inputStyle(index), textAlign: "left", direction: "ltr", fontFamily: "monospace", fontSize: "14px", fontWeight: "normal" });
  const priceHintStyle = { fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" };
  const btnStyle = { flex: 1, padding: "10px 12px", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };

  return (
    <div style={containerStyle}>
      {toast && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          left: "20px",
          maxWidth: "400px",
          margin: "0 auto",
          padding: "12px 20px",
          borderRadius: "12px",
          color: "#fff",
          fontSize: "14px",
          fontWeight: "500",
          zIndex: 10000,
          backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
          animation: "slideIn 0.3s ease-out"
        }}>
          {toast.message}
        </div>
      )}

      <div style={scrollableAreaStyle}>
        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>نام خودرو {!isEditing && "*"}</label>
            <input type="text" value={carName} onChange={(e) => setCarName(e.target.value)} style={inputStyle(0)} onFocus={() => setFocusedIndex(0)} onBlur={() => setFocusedIndex(null)} placeholder="مثال: پراید 131" disabled={loading} />
          </div>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>نام خریدار {!isEditing && "*"}</label>
            <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} style={inputStyle(1)} onFocus={() => setFocusedIndex(1)} onBlur={() => setFocusedIndex(null)} placeholder="مثال: علی محمدی" disabled={loading} />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>قیمت (تومان) {!isEditing && "*"}</label>
            <input type="text" value={price ? price.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""} onChange={handlePriceChange} style={priceInputStyle(2)} onFocus={() => setFocusedIndex(2)} onBlur={() => setFocusedIndex(null)} dir="ltr" placeholder="مثال: 250000000" disabled={loading} />
            <div style={priceHintStyle}>{price ? numberToPersianWords(price) : "مبلغ را وارد کنید"}</div>
          </div>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>سال تولید</label>
            <input type="text" value={productionYear} onChange={(e) => setProductionYear(e.target.value)} style={inputStyle(3)} onFocus={() => setFocusedIndex(3)} onBlur={() => setFocusedIndex(null)} placeholder="مثال: 1400" disabled={loading} />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>رنگ خودرو</label>
            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} style={inputStyle(4)} onFocus={() => setFocusedIndex(4)} onBlur={() => setFocusedIndex(null)} placeholder="مثال: مشکی - سفید - نقره‌ای" disabled={loading} />
          </div>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ خرید (مثال: 1403/01/15)</label>
            <input type="text" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={inputStyle(5)} onFocus={() => setFocusedIndex(5)} onBlur={() => setFocusedIndex(null)} placeholder="1403/01/15" disabled={loading} />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ انقضای بیمه (مثال: 1403/01/15)</label>
            <input type="text" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} style={inputStyle(6)} onFocus={() => setFocusedIndex(6)} onBlur={() => setFocusedIndex(null)} placeholder="1403/01/15" disabled={loading} />
          </div>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ انقضای وکالت (مثال: 1403/01/15)</label>
            <input type="text" value={attorneyExpiry} onChange={(e) => setAttorneyExpiry(e.target.value)} style={inputStyle(7)} onFocus={() => setFocusedIndex(7)} onBlur={() => setFocusedIndex(null)} placeholder="1403/01/15" disabled={loading} />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ معاینه فنی (مثال: 1403/01/15)</label>
            <input type="text" value={technicalInspectionDate} onChange={(e) => setTechnicalInspectionDate(e.target.value)} style={inputStyle(8)} onFocus={() => setFocusedIndex(8)} onBlur={() => setFocusedIndex(null)} placeholder="1403/01/15" disabled={loading} />
          </div>
          <div style={{ width: "100%" }}></div>
        </div>

        <label style={labelStyle}>توضیحات</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={textareaStyle(9)} onFocus={() => setFocusedIndex(9)} onBlur={() => setFocusedIndex(null)} placeholder="توضیحات اضافی (اختیاری)" rows="3" disabled={loading} />
      </div>

      <div style={buttonContainerStyle}>
        <button onClick={onBack} style={{...btnStyle, backgroundColor: "#64748b"}} disabled={loading}>✕ انصراف</button>
        <button onClick={handleSubmit} style={{...btnStyle, backgroundColor: isEditing ? "#3b82f6" : "#16a34a"}} disabled={loading}>{loading ? "⏳ در حال ذخیره..." : (isEditing ? "✏️ ویرایش خودرو" : "✓ ثبت خودرو")}</button>
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

export default CarForm;