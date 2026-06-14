import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, push, set, update, get } from "firebase/database";
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

  // دریافت هزینه‌های خودرو از دیتابیس
  useEffect(() => {
    if (!car || !user) return;
    const fetchExpenses = async () => {
      const expensesRef = ref(db, `users/${user.uid}/expenses`);
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
  }, [car, user]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalExpense = carExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const purchasePrice = Number(car?.price) || 0;
  const totalCost = purchasePrice + totalExpense;
  const profit = Number(sellingPrice) - totalCost;

  const handleConfirmSell = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      // تبدیل هزینه‌ها به فرمت مناسب برای ذخیره
      const expensesObject = {};
      carExpenses.forEach(exp => {
        expensesObject[exp.id] = {
          amount: exp.amount,
          category: exp.category,
          categoryLabel: exp.categoryLabel,
          categoryIcon: exp.categoryIcon,
          description: exp.description,
          createdAt: exp.createdAt
        };
      });

      const soldData = {
        originalCar: {
          id: car.id,
          carName: car.carName,
          buyerName: car.buyerName,
          price: car.price,
          purchaseDate: car.purchaseDate,
          insuranceExpiry: car.insuranceExpiry,
          attorneyExpiry: car.attorneyExpiry,
          technicalInspectionDate: car.technicalInspectionDate,
          description: car.description,
        },
        sellingPrice: Number(sellingPrice),
        newBuyerName: buyerName.trim(),
        sellDate: sellDate || new Date().toISOString(),
        description: description.trim() || "",
        totalExpense: totalExpense,
        purchasePrice: purchasePrice,
        totalCost: totalCost,
        profit: profit,
        soldAt: new Date().toISOString(),
        expenses: expensesObject  // ← ذخیره هزینه‌ها
      };

      const archiveRef = ref(db, `users/${user.uid}/archivedCars`);
      const newArchiveRef = push(archiveRef);
      await set(newArchiveRef, soldData);

      await update(ref(db, `users/${user.uid}/cars/${car.id}`), { 
        sold: true, 
        soldAt: new Date().toISOString(),
        sellingPrice: Number(sellingPrice),
        newBuyerName: buyerName.trim()
      });

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

  const handleSubmit = () => {
    if (!sellingPrice || sellingPrice === "0") {
      showToast("❌ لطفاً قیمت فروش را وارد کنید", "error");
      return;
    }
    if (!buyerName.trim()) {
      showToast("❌ لطفاً نام خریدار جدید را وارد کنید", "error");
      return;
    }
    setShowConfirmModal(true);
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

  // گروه‌بندی هزینه‌ها برای نمایش
  const getCategoryLabel = (category) => {
    const categories = {
      mechanic: { label: "مکانیکی", icon: "🔧", color: "#ef4444" },
      oilChange: { label: "تعویض روغن", icon: "🛢️", color: "#f59e0b" },
      battery: { label: "باطری‌سازی", icon: "🔋", color: "#10b981" },
      bodywork: { label: "صافکاری", icon: "🔨", color: "#8b5cf6" },
      painting: { label: "نقاشی", icon: "🎨", color: "#ec4899" },
      electrical: { label: "رودی (برق)", icon: "⚡", color: "#06b6d4" },
      parts: { label: "هزینه وسایل", icon: "🔧", color: "#84cc16" },
      other: { label: "سایر هزینه‌ها", icon: "📦", color: "#64748b" },
    };
    return categories[category] || { label: "سایر", icon: "📦", color: "#64748b" };
  };

  // گروه‌بندی هزینه‌ها
  const groupedExpenses = {};
  carExpenses.forEach(exp => {
    const cat = exp.category || 'other';
    if (!groupedExpenses[cat]) {
      groupedExpenses[cat] = [];
    }
    groupedExpenses[cat].push(exp);
  });

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`💰 فروش خودرو ${car?.carName}`} color="#f59e0b" size="md">
        <div>
          {toast && (
            <div style={{
              ...toastStyle,
              backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
              animation: "slideIn 0.3s ease-out"
            }}>
              {toast.message}
            </div>
          )}


        
  
          <label style={labelStyle}>💰 قیمت فروش (تومان)</label>
          <input
            type="text"
            value={sellingPrice ? Number(sellingPrice).toLocaleString() : ""}
            onChange={(e) => {
              let raw = e.target.value.replace(/,/g, "");
              if (raw === "" || /^\d+$/.test(raw)) setSellingPrice(raw);
            }}
            style={{...inputStyle(0, focusedIndex), textAlign: "left", direction: "ltr"}}
            onFocus={() => setFocusedIndex(0)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="مثال: 350,000,000"
          />
          {sellingPrice && (
            <div style={priceHintStyle}>{numberToWords(Number(sellingPrice))} تومان</div>
          )}

          <label style={labelStyle}>👤 نام خریدار جدید</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            style={inputStyle(1, focusedIndex)}
            onFocus={() => setFocusedIndex(1)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="نام خریدار جدید"
          />

          <label style={labelStyle}>📅 تاریخ فروش</label>
          <input
            type="text"
            value={sellDate || getTodayDate()}
            onChange={(e) => setSellDate(e.target.value)}
            style={inputStyle(2, focusedIndex)}
            onFocus={() => setFocusedIndex(2)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="مثال: 1403/01/15"
          />

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{...inputStyle(3, focusedIndex), resize: "vertical", minHeight: "60px"}}
            onFocus={() => setFocusedIndex(3)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="توضیحات مربوط به فروش..."
            rows="3"
          />

          {sellingPrice && (
            <div style={profitBoxStyle}>
              <div style={profitLabelStyle}>💎 سود خالص</div>
              <div style={{...profitValueStyle, color: profit >= 0 ? "#10b981" : "#ef4444"}}>
                {formatPrice(Math.abs(profit))} تومان {profit < 0 ? "(زیان)" : ""}
              </div>
              <div style={wordsStyle}>{numberToWords(Math.abs(profit))} تومان</div>
            </div>
          )}

          <div style={btnContainerStyle}>
            <button onClick={onClose} style={cancelBtnStyle} disabled={loading}>انصراف</button>
            <button onClick={handleSubmit} style={submitBtnStyle} disabled={loading}>
              {loading ? "در حال ثبت..." : "✓ تایید فروش"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showConfirmModal} 
        onClose={() => setShowConfirmModal(false)} 
        title="⚠️ تأیید نهایی فروش"
        color="#f59e0b"
        size="sm"
      >
        <div style={confirmModalStyle}>
          <div style={confirmIconStyle}>💰</div>
          <p style={confirmTextStyle}>
            آیا از فروش خودرو <strong>"{car?.carName}"</strong> مطمئن هستید؟
          </p>
          <p style={confirmWarningStyle}>
            پس از تأیید، خودرو به بایگانی منتقل شده و از لیست خودروهای فعال حذف می‌شود.
          </p>
          
          <div style={confirmInfoBox}>
            <div style={confirmInfoRow}>
              <span>قیمت فروش:</span>
              <div>
                <strong>{formatPrice(Number(sellingPrice))} تومان</strong>
                <div style={confirmSmallWords}>{numberToWords(Number(sellingPrice))} تومان</div>
              </div>
            </div>
            <div style={confirmInfoRow}>
              <span>خریدار جدید:</span>
              <strong>{buyerName}</strong>
            </div>
            <div style={{...confirmInfoRow, color: profit >= 0 ? "#10b981" : "#ef4444"}}>
              <span>سود خالص:</span>
              <div>
                <strong>{formatPrice(Math.abs(profit))} تومان {profit < 0 ? "(زیان)" : ""}</strong>
                <div style={confirmSmallWords}>{numberToWords(Math.abs(profit))} تومان</div>
              </div>
            </div>
          </div>

          <div style={confirmBtnContainer}>
            <button onClick={() => setShowConfirmModal(false)} style={confirmCancelBtn}>انصراف</button>
            <button onClick={handleConfirmSell} style={confirmDeleteBtn}>تأیید فروش</button>
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

const toastStyle = {
  position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "12px", color: "#fff", fontSize: "14px", zIndex: 10000, display: "flex", alignItems: "center", gap: "10px"
};

const infoBoxStyle = { background: "#f8fafc", padding: "12px", borderRadius: "12px", marginBottom: "16px" };
const infoTitleStyle = { margin: "0 0 12px 0", fontSize: "14px", fontWeight: "bold" };
const infoRowStyle = { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", alignItems: "center", flexWrap: "wrap", gap: "8px" };
const smallWordsStyle = { fontSize: "10px", color: "#64748b", marginTop: "2px" };

const expensesPreviewBox = { background: "#fef3c7", padding: "12px", borderRadius: "12px", marginBottom: "16px" };
const expensePreviewItem = { background: "#fff", padding: "8px 12px", borderRadius: "8px", marginBottom: "8px" };
const expensePreviewHeader = { display: "flex", justifyContent: "space-between", fontSize: "12px" };

const profitBoxStyle = { background: "#ecfdf5", padding: "12px", borderRadius: "12px", textAlign: "center", marginTop: "16px" };
const profitLabelStyle = { fontSize: "13px", fontWeight: "bold", marginBottom: "4px" };
const profitValueStyle = { fontSize: "20px", fontWeight: "bold" };
const wordsStyle = { fontSize: "11px", color: "#64748b", marginTop: "4px" };
const priceHintStyle = { fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" };

const btnContainerStyle = { display: "flex", gap: "10px", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e2e8f0" };
const cancelBtnStyle = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const submitBtnStyle = { flex: 1, padding: "10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

const confirmModalStyle = { textAlign: "center", padding: "10px" };
const confirmIconStyle = { fontSize: "48px", marginBottom: "16px" };
const confirmTextStyle = { fontSize: "16px", marginBottom: "12px" };
const confirmWarningStyle = { fontSize: "12px", color: "#f59e0b", marginBottom: "20px" };
const confirmInfoBox = { background: "#f8fafc", padding: "12px", borderRadius: "12px", marginBottom: "20px", textAlign: "right" };
const confirmInfoRow = { display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px", alignItems: "center", flexWrap: "wrap", gap: "8px" };
const confirmSmallWords = { fontSize: "9px", color: "#94a3b8", marginTop: "2px" };
const confirmBtnContainer = { display: "flex", gap: "12px", marginTop: "10px" };
const confirmCancelBtn = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmDeleteBtn = { flex: 1, padding: "10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

export default SellCarModal;