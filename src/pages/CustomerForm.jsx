import React, { useState } from "react";
import { db } from "../firebaseConfig";
import { ref, push, set } from "firebase/database";

const CustomerForm = ({ user, onSaved, onCancel }) => {
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length <= 11) {
      setPhone(value);
    }
  };

  const getTodayDate = () => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      showToast("❌ لطفاً نام مشتری را وارد کنید", "error");
      return;
    }
    if (!phone.trim()) {
      showToast("❌ لطفاً شماره تماس مشتری را وارد کنید", "error");
      return;
    }
    if (phone.length < 10) {
      showToast("❌ شماره تماس معتبر نیست", "error");
      return;
    }

    setLoading(true);

    try {
      const formData = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim() || "",
        description: description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: getTodayDate()
      };

      const customersRef = ref(db, `users/${user.uid}/customers`);
      const newCustomerRef = push(customersRef);
      await set(newCustomerRef, formData);

      showToast("✅ مشتری با موفقیت ثبت شد!", "success");

      setTimeout(() => {
        setCustomerName("");
        setPhone("");
        setAddress("");
        setDescription("");
        setLoading(false);
        if (onSaved) onSaved();
      }, 2000);

    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ثبت مشتری! لطفاً دوباره تلاش کنید", "error");
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

  const rowStyle = { display: "flex", gap: "15px", marginBottom: "5px" };
  const containerStyle = { display: "flex", flexDirection: "column", height: "100%" };
  const scrollableAreaStyle = { flex: 1, overflowY: "auto", paddingRight: "5px" };
  const buttonContainerStyle = { display: "flex", gap: "10px", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e2e8f0" };
  const textareaStyle = (index, focusedIndex) => ({ ...inputStyle(index, focusedIndex), resize: "vertical", minHeight: "60px" });
  const btnStyle = { flex: 1, padding: "10px 12px", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", transition: "all 0.2s" };

  return (
    <div style={containerStyle}>
      {/* Toast Notification */}
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
        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>👤 نام مشتری</label>
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={inputStyle(0, focusedIndex)} 
              onFocus={() => setFocusedIndex(0)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="مثال: علی محمدی"
              disabled={loading}
            />
          </div>
          
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>📞 شماره تماس</label>
            <input 
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              style={inputStyle(1, focusedIndex)} 
              onFocus={() => setFocusedIndex(1)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="مثال: 09123456789"
              disabled={loading}
            />
          </div>
        </div>

        <label style={labelStyle}>🏠 آدرس (اختیاری)</label>
        <input 
          type="text" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={inputStyle(2, focusedIndex)} 
          onFocus={() => setFocusedIndex(2)} 
          onBlur={() => setFocusedIndex(null)} 
          placeholder="مثال: تهران، خیابان آزادی..."
          disabled={loading}
        />

        <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={textareaStyle(3, focusedIndex)}
          onFocus={() => setFocusedIndex(3)}
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
        <button 
          onClick={onCancel} 
          style={{...btnStyle, backgroundColor: "#64748b"}}
          disabled={loading}
        >
          ✕ انصراف
        </button>
        <button 
          onClick={handleSubmit} 
          style={{...btnStyle, backgroundColor: "#7c3aed"}}
          disabled={loading}
        >
          {loading ? "⏳ در حال ثبت..." : "✓ ثبت مشتری"}
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
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

export default CustomerForm;