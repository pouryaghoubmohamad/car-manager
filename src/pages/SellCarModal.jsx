import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, update, push, set, get, remove } from "firebase/database";
import Modal from "../Modal";

const SellCarModal = ({ isOpen, onClose, car, user, onSold }) => {
  const [sellingPrice, setSellingPrice] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [sellDate, setSellDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [toast, setToast] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [carExpenses, setCarExpenses] = useState([]);

  const emailKey = user?.email?.replace(/\./g, '_').replace(/@/g, '_at_') || "";

  useEffect(() => {
    if (!car || !user || !emailKey) return;
    const fetchExpenses = async () => {
      const expensesRef = ref(db, `users_emails/${emailKey}/expenses`);
      const snapshot = await get(expensesRef);
      const data = snapshot.val();
      if (data) {
        const expensesArray = Object.entries(data)
          .filter(([_, exp]) => exp.carId === car.id)
          .map(([id, value]) => ({ id, ...value }));
        setCarExpenses(expensesArray);
      }
    };
    fetchExpenses();
  }, [car, user, emailKey]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalExpense = carExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const purchasePrice = Number(car?.price) || 0;
  const totalCost = purchasePrice + totalExpense;

  const handleConfirmSell = async () => {
    if (!sellingPrice || sellingPrice === "0") {
      showToast("❌ لطفاً قیمت فروش را وارد کنید", "error");
      return;
    }
    if (!buyerName.trim()) {
      showToast("❌ لطفاً نام خریدار جدید را وارد کنید", "error");
      return;
    }

    setLoading(true);
    setShowConfirmModal(false);

    try {
      const expensesObject = {};
      carExpenses.forEach(exp => {
        expensesObject[exp.id] = {
          amount: exp.amount,
          category: exp.category,
          categoryLabel: exp.categoryLabel,
          categoryIcon: exp.categoryIcon,
          description: exp.description || "",
          createdAt: exp.createdAt || new Date().toISOString()
        };
      });

      const soldData = {
        originalCar: {
          id: car.id || "",
          carName: car.carName || "",
          buyerName: car.buyerName || "",
          price: car.price || 0,
          productionYear: car.productionYear || "",
          color: car.color || "",
          description: car.description || "",
          purchaseDate: car.purchaseDate || null,
          insuranceExpiry: car.insuranceExpiry || null,
          attorneyExpiry: car.attorneyExpiry || null,
          technicalInspectionDate: car.technicalInspectionDate || null,
        },
        sellingPrice: Number(sellingPrice),
        newBuyerName: buyerName.trim(),
        sellDate: sellDate || new Date().toISOString(),
        description: description.trim() || "",
        totalExpense: totalExpense,
        purchasePrice: purchasePrice,
        totalCost: totalCost,
        profit: Number(sellingPrice) - totalCost,
        soldAt: new Date().toISOString(),
        expenses: expensesObject
      };

      const archiveRef = ref(db, `users_emails/${emailKey}/archivedCars`);
      const newArchiveRef = push(archiveRef);
      await set(newArchiveRef, soldData);

      await update(ref(db, `users_emails/${emailKey}/cars/${car.id}`), { 
        sold: true, 
        soldAt: new Date().toISOString(),
        sellingPrice: Number(sellingPrice),
        newBuyerName: buyerName.trim()
      });

      for (const exp of carExpenses) {
        await remove(ref(db, `users_emails/${emailKey}/expenses/${exp.id}`));
      }

      showToast("✅ خودرو با موفقیت فروخته شد و به بایگانی منتقل گردید", "success");

      setTimeout(() => {
        if (onSold) onSold();
        onClose();
      }, 2000);

    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ثبت فروش", "error");
    } finally {
      setLoading(false);
    }
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

  const getTodayDate = () => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
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

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`💰 فروش خودرو ${car?.carName}`} color="#f59e0b" size="md">
        <div>
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
              zIndex: 10001,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
              animation: "slideIn 0.3s ease-out"
            }}>
              {toast.message}
            </div>
          )}

          <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "5px" }}>
            <label style={labelStyle}>🚗 نام خودرو</label>
            <input
              type="text"
              value={car?.carName || ""}
              style={{...inputStyle(0, focusedIndex), backgroundColor: "#f8fafc", color: "#1e293b", fontWeight: "bold", cursor: "default"}}
              readOnly
            />

            <label style={labelStyle}>💰 قیمت فروش (تومان) *</label>
            <input
              type="text"
              value={sellingPrice ? Number(sellingPrice).toLocaleString() : ""}
              onChange={(e) => {
                let raw = e.target.value.replace(/,/g, "");
                if (raw === "" || /^\d+$/.test(raw)) setSellingPrice(raw);
              }}
              style={{...inputStyle(1, focusedIndex), textAlign: "left", direction: "ltr", fontSize: "14px", fontWeight: "normal"}}
              onFocus={() => setFocusedIndex(1)}
              onBlur={() => setFocusedIndex(null)}
              placeholder="مثال: 350,000,000"
            />
            {sellingPrice && sellingPrice !== "0" && (
              <div style={{ fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" }}>
                {numberToWords(Number(sellingPrice))} تومان
              </div>
            )}

            <label style={labelStyle}>👤 نام خریدار جدید *</label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              style={inputStyle(2, focusedIndex)}
              onFocus={() => setFocusedIndex(2)}
              onBlur={() => setFocusedIndex(null)}
              placeholder="نام خریدار جدید"
            />

            <label style={labelStyle}>📅 تاریخ فروش</label>
            <input
              type="text"
              value={sellDate || getTodayDate()}
              onChange={(e) => setSellDate(e.target.value)}
              style={inputStyle(3, focusedIndex)}
              onFocus={() => setFocusedIndex(3)}
              onBlur={() => setFocusedIndex(null)}
              placeholder="مثال: 1403/01/15"
            />

            <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{...inputStyle(4, focusedIndex), resize: "vertical", minHeight: "60px"}}
              onFocus={() => setFocusedIndex(4)}
              onBlur={() => setFocusedIndex(null)}
              placeholder="توضیحات اضافی..."
              rows="3"
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e2e8f0" }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                انصراف
              </button>
              <button 
                onClick={() => setShowConfirmModal(true)} 
                disabled={loading} 
                style={{ flex: 1, padding: "10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                {loading ? "در حال ثبت..." : "💰 ثبت فروش"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showConfirmModal} 
        onClose={() => setShowConfirmModal(false)} 
        title="⚠️ تأیید فروش خودرو"
        color="#ef4444"
        size="sm"
      >
        <div style={{ textAlign: "center", padding: "10px" }}>
          <div style={{ fontSize: "18px", marginBottom: "16px" }}>
            🤔 آیا از فروش خودرو <strong style={{ color: "#f59e0b" }}>"{car?.carName}"</strong> مطمئن هستید؟
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", lineHeight: "1.5" }}>
            پس از تأیید، خودرو به بایگانی منتقل شده و از لیست خودروهای فعال حذف می‌شود.
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button 
              onClick={() => setShowConfirmModal(false)} 
              style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              انصراف
            </button>
            <button 
              onClick={handleConfirmSell} 
              style={{ flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              💰 بله، فروش انجام شود
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default SellCarModal;