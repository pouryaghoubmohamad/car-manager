import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, push, set, onValue } from "firebase/database";

const CarForm = ({ user, onSaved, onCancel, editingCar }) => {  // اضافه کردن editingCar
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [carName, setCarName] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [attorneyExpiry, setAttorneyExpiry] = useState("");
  const [technicalInspectionDate, setTechnicalInspectionDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState([]);
  
  const isEditing = !!editingCar;  // true اگر در حال ویرایش باشیم

  // بررسی وضعیت اینترنت
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("🔄 اینترنت متصل شد، همگام‌سازی در حال انجام...", "info");
      syncOfflineData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("📱 حالت آفلاین - داده‌ها محلی ذخیره می‌شوند", "offline");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadOfflineData();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // پر کردن فرم در حالت ویرایش
  useEffect(() => {
    if (editingCar) {
      setCarName(editingCar.carName || "");
      setBuyerName(editingCar.buyerName || "");
      setPrice(editingCar.price?.toString() || "");
      setDescription(editingCar.description || "");
      setPurchaseDate(editingCar.purchaseDate || "");
      setInsuranceExpiry(editingCar.insuranceExpiry || "");
      setAttorneyExpiry(editingCar.attorneyExpiry || "");
      setTechnicalInspectionDate(editingCar.technicalInspectionDate || "");
    }
  }, [editingCar]);

  const loadOfflineData = () => {
    const saved = localStorage.getItem(`offline_cars_${user?.uid}`);
    if (saved) {
      setOfflineData(JSON.parse(saved));
    }
  };

  const saveToLocalStorage = (carData) => {
    const existing = localStorage.getItem(`offline_cars_${user?.uid}`);
    const offlineCars = existing ? JSON.parse(existing) : [];
    offlineCars.push({
      ...carData,
      offlineId: Date.now(),
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(`offline_cars_${user?.uid}`, JSON.stringify(offlineCars));
    setOfflineData(offlineCars);
  };

  const syncOfflineData = async () => {
    const saved = localStorage.getItem(`offline_cars_${user?.uid}`);
    if (!saved) return;
    
    const offlineCars = JSON.parse(saved);
    if (offlineCars.length === 0) return;
    
    showToast(`🔄 همگام‌سازی ${offlineCars.length} مورد در حال انجام...`, "info");
    
    let synced = 0;
    for (const car of offlineCars) {
      try {
        const carsRef = ref(db, `users/${user.uid}/cars`);
        const newCarRef = push(carsRef);
        await set(newCarRef, {
          carName: car.carName,
          buyerName: car.buyerName,
          price: car.price,
          description: car.description || "",
          purchaseDate: car.purchaseDate || null,
          insuranceExpiry: car.insuranceExpiry || null,
          attorneyExpiry: car.attorneyExpiry || null,
          technicalInspectionDate: car.technicalInspectionDate || null,
          createdAt: new Date().toISOString(),
          syncedFromOffline: true
        });
        synced++;
      } catch (error) {
        console.error("خطا در همگام‌سازی:", error);
      }
    }
    
    localStorage.removeItem(`offline_cars_${user?.uid}`);
    setOfflineData([]);
    showToast(`✅ ${synced} خودرو با موفقیت همگام‌سازی شد!`, "success");
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePriceChange = (e) => {
    let rawValue = e.target.value.replace(/,/g, "");
    rawValue = rawValue.replace(/\./g, "");
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
      description: description.trim() || "",
      purchaseDate: purchaseDate || null,
      insuranceExpiry: insuranceExpiry || null,
      attorneyExpiry: attorneyExpiry || null,
      technicalInspectionDate: technicalInspectionDate || null,
      updatedAt: new Date().toISOString()
    };

    setLoading(true);

    try {
      // حالت ویرایش
      if (isEditing) {
        if (!isOnline) {
          showToast("📱 در حالت آفلاین امکان ویرایش وجود ندارد. لطفاً آنلاین شوید.", "error");
          setLoading(false);
          return;
        }
        
        const carRef = ref(db, `users/${user.uid}/cars/${editingCar.id}`);
        await set(carRef, {
          ...formData,
          sold: editingCar.sold || false,
          createdAt: editingCar.createdAt || new Date().toISOString()
        });
        
        showToast(`✅ خودرو "${carName}" با موفقیت ویرایش شد`, "success");
        
        setCarName("");
        setBuyerName("");
        setPrice("");
        setDescription("");
        setPurchaseDate("");
        setInsuranceExpiry("");
        setAttorneyExpiry("");
        setTechnicalInspectionDate("");
        setLoading(false);
        
        setTimeout(() => {
          if (onSaved) onSaved();
        }, 1500);
        return;
      }
      
      // حالت ثبت جدید
      if (!isOnline) {
        saveToLocalStorage(formData);
        showToast("📱 در حالت آفلاین ذخیره شد (به محض اتصال اینترنت، همگام‌سازی می‌شود)", "offline");
        
        setCarName("");
        setBuyerName("");
        setPrice("");
        setDescription("");
        setPurchaseDate("");
        setInsuranceExpiry("");
        setAttorneyExpiry("");
        setTechnicalInspectionDate("");
        setLoading(false);
        
        setTimeout(() => {
          if (onSaved) onSaved();
        }, 1500);
        return;
      }

      // حالت آنلاین - ثبت جدید
      const carsRef = ref(db, `users/${user.uid}/cars`);
      const newCarRef = push(carsRef);
      await set(newCarRef, {
        ...formData,
        createdAt: new Date().toISOString(),
        sold: false
      });
      
      showToast("✅ خودرو با موفقیت ثبت شد", "success");

      setCarName("");
      setBuyerName("");
      setPrice("");
      setDescription("");
      setPurchaseDate("");
      setInsuranceExpiry("");
      setAttorneyExpiry("");
      setTechnicalInspectionDate("");
      setLoading(false);

      setTimeout(() => {
        if (onSaved) onSaved();
      }, 1500);

    } catch (error) {
      console.error("خطا:", error);
      if (!isEditing) {
        saveToLocalStorage(formData);
        showToast("📱 خطا در اتصال به دیتابیس! داده در حالت آفلاین ذخیره شد", "offline");
      } else {
        showToast("❌ خطا در ویرایش خودرو", "error");
      }
      setLoading(false);
      
      if (!isEditing) {
        setTimeout(() => {
          setCarName("");
          setBuyerName("");
          setPrice("");
          setDescription("");
          setPurchaseDate("");
          setInsuranceExpiry("");
          setAttorneyExpiry("");
          setTechnicalInspectionDate("");
          if (onSaved) onSaved();
        }, 1500);
      }
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
  const priceInputStyle = (index, focusedIndex) => ({ ...inputStyle(index, focusedIndex), textAlign: "left", direction: "ltr", fontFamily: "monospace", fontSize: "14px", fontWeight: "normal" });
  const priceHintStyle = { fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px", fontFamily: "inherit", fontWeight: "normal", paddingRight: "4px" };
  const btnStyle = { flex: 1, padding: "10px 12px", border: "none", color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", transition: "all 0.2s" };

  return (
    <div style={containerStyle}>
      {/* نمایش وضعیت اینترنت */}
      <div style={{
        ...statusStyle,
        backgroundColor: isOnline ? "#dcfce7" : "#fee2e2",
        color: isOnline ? "#16a34a" : "#dc2626"
      }}>
        {isOnline ? "🟢 آنلاین - اتصال به دیتابیس برقرار است" : "🔴 آفلاین - داده‌ها محلی ذخیره می‌شوند"}
      </div>

      {/* نمایش تعداد داده‌های آفلاین */}
      {offlineData.length > 0 && isOnline && !isEditing && (
        <div style={{
          ...toastStyle,
          backgroundColor: "#f59e0b",
          position: "relative",
          marginBottom: "15px",
          animation: "none"
        }}>
          📦 {offlineData.length} خودرو در صف همگام‌سازی است...
          <button onClick={syncOfflineData} style={syncBtnStyle}>همگام‌سازی</button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          ...toastStyle,
          backgroundColor: toast.type === "success" ? "#10b981" : toast.type === "offline" ? "#f59e0b" : toast.type === "info" ? "#3b82f6" : "#ef4444",
          animation: "slideIn 0.3s ease-out"
        }}>
          <span>{toast.type === "success" ? "🎉" : toast.type === "offline" ? "📱" : toast.type === "info" ? "🔄" : "⚠️"}</span>
          {toast.message}
        </div>
      )}

      <div style={scrollableAreaStyle}>
        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>نام خودرو {!isEditing && "*"}</label>
            <input 
              type="text" 
              value={carName}
              onChange={(e) => setCarName(e.target.value)}
              style={inputStyle(0, focusedIndex)} 
              onFocus={() => setFocusedIndex(0)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="مثال: پراید 131"
              disabled={loading}
            />
          </div>
          
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>نام خریدار {!isEditing && "*"}</label>
            <input 
              type="text" 
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              style={inputStyle(1, focusedIndex)} 
              onFocus={() => setFocusedIndex(1)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="مثال: علی محمدی"
              disabled={loading}
            />
          </div>
        </div>

        <label style={labelStyle}>قیمت (تومان) {!isEditing && "*"}</label>
        <input 
          type="text" 
          value={price ? price.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""} 
          onChange={handlePriceChange} 
          style={priceInputStyle(2, focusedIndex)} 
          onFocus={() => setFocusedIndex(2)} 
          onBlur={() => setFocusedIndex(null)}
          dir="ltr"
          placeholder="مثال: 250000000"
          disabled={loading}
        />
        <div style={priceHintStyle}>
          {price ? numberToPersianWords(price) : "مبلغ را وارد کنید"}
        </div>

        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ خرید (مثال: 1403/01/15)</label>
            <input 
              type="text"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              style={inputStyle(3, focusedIndex)} 
              onFocus={() => setFocusedIndex(3)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="1403/01/15"
              disabled={loading}
            />
          </div>
          
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ انقضای بیمه (مثال: 1403/01/15)</label>
            <input 
              type="text"
              value={insuranceExpiry}
              onChange={(e) => setInsuranceExpiry(e.target.value)}
              style={inputStyle(4, focusedIndex)} 
              onFocus={() => setFocusedIndex(4)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="1403/01/15"
              disabled={loading}
            />
          </div>
        </div>
        
        <div style={rowStyle}>
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ انقضای وکالت (مثال: 1403/01/15)</label>
            <input 
              type="text"
              value={attorneyExpiry}
              onChange={(e) => setAttorneyExpiry(e.target.value)}
              style={inputStyle(5, focusedIndex)} 
              onFocus={() => setFocusedIndex(5)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="1403/01/15"
              disabled={loading}
            />
          </div>
          
          <div style={{ width: "100%" }}>
            <label style={labelStyle}>تاریخ معاینه فنی (مثال: 1403/01/15)</label>
            <input 
              type="text"
              value={technicalInspectionDate}
              onChange={(e) => setTechnicalInspectionDate(e.target.value)}
              style={inputStyle(6, focusedIndex)} 
              onFocus={() => setFocusedIndex(6)} 
              onBlur={() => setFocusedIndex(null)} 
              placeholder="1403/01/15"
              disabled={loading}
            />
          </div>
        </div>

        <label style={labelStyle}>توضیحات</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={textareaStyle(7, focusedIndex)}
          onFocus={() => setFocusedIndex(7)}
          onBlur={() => setFocusedIndex(null)}
          placeholder="توضیحات اضافی (اختیاری)"
          rows="3"
          disabled={loading}
        />
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
          style={{...btnStyle, backgroundColor: isEditing ? "#3b82f6" : "#16a34a"}}
          disabled={loading}
        >
          {loading ? "⏳ در حال ذخیره..." : (isEditing ? "✏️ ویرایش خودرو" : "✓ ثبت خودرو")}
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
  left: "20px",
  maxWidth: "400px",
  margin: "0 auto",
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

const statusStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "500",
  textAlign: "center",
  marginBottom: "15px"
};

const syncBtnStyle = {
  marginLeft: "auto",
  background: "rgba(255,255,255,0.2)",
  border: "none",
  color: "#fff",
  padding: "4px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px"
};

export default CarForm;