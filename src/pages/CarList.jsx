import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update, get } from "firebase/database";
import Modal from "../Modal";
import SellCarModal from "./SellCarModal";
import CarForm from "./CarForm";
import { getCarExpenses, getCarExpensesCount } from "../utils/calculations";

const CarList = ({ user, onBack, onAddCar, onEditCar, onSellCar }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [expenses, setExpenses] = useState({});
  const [toast, setToast] = useState(null);
  
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [carToDelete, setCarToDelete] = useState(null);
  const [openExpenseModal, setOpenExpenseModal] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedCarForSale, setSelectedCarForSale] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  
  const [openEditExpenseModal, setOpenEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseCategory, setEditExpenseCategory] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseDescription, setEditExpenseDescription] = useState("");
  
  const [openConfirmExpenseModal, setOpenConfirmExpenseModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [openAllExpensesModal, setOpenAllExpensesModal] = useState(false);
  const [selectedCarExpenses, setSelectedCarExpenses] = useState([]);
  const [selectedCarName, setSelectedCarName] = useState("");

  const emailKey = user?.email?.replace(/\./g, '_').replace(/@/g, '_at_') || "";

  const expenseCategories = [
    { value: "mechanic", label: "مکانیکی", icon: "🔧", color: "#ef4444" },
    { value: "oilChange", label: "تعویض روغن", icon: "🛢️", color: "#f59e0b" },
    { value: "battery", label: "باطری‌سازی", icon: "🔋", color: "#10b981" },
    { value: "bodywork", label: "صافکاری", icon: "🔨", color: "#8b5cf6" },
    { value: "painting", label: "نقاشی", icon: "🎨", color: "#ec4899" },
    { value: "electrical", label: "رودی (برق)", icon: "⚡", color: "#06b6d4" },
    { value: "parts", label: "هزینه وسایل", icon: "🔧", color: "#84cc16" },
    { value: "polish", label: "پولیش", icon: "✨", color: "#06b6d4" },
    { value: "colorExpert", label: "کارشناسی رنگ", icon: "🎨", color: "#ec4899" },
    { value: "other", label: "سایر هزینه‌ها", icon: "📦", color: "#64748b" },
  ];

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user || !emailKey) {
      setLoading(false);
      return;
    }
    const carsRef = ref(db, `users_emails/${emailKey}/cars`);
    const unsubscribe = onValue(carsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.entries(data)
          .filter(([_, car]) => !car.sold)
          .map(([id, car]) => ({ id, ...car }))
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          });
        setCars(carsArray);
      } else {
        setCars([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  useEffect(() => {
    if (!user || !emailKey) return;
    const expensesRef = ref(db, `users_emails/${emailKey}/expenses`);
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setExpenses(data);
      } else {
        setExpenses({});
      }
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  const handleEditCar = (car) => {
    setEditingCar(car);
    setShowEditModal(true);
  };

  const handleDeleteExpenseClick = (expense) => {
    setExpenseToDelete(expense);
    setOpenConfirmExpenseModal(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await remove(ref(db, `users_emails/${emailKey}/expenses/${expenseToDelete.id}`));
      showToast(`✅ هزینه با موفقیت حذف شد`, "success");
      const expensesRef = ref(db, `users_emails/${emailKey}/expenses`);
      const snapshot = await get(expensesRef);
      if (snapshot.exists()) {
        setExpenses(snapshot.val());
      } else {
        setExpenses({});
      }
    } catch (error) {
      showToast("❌ خطا در حذف هزینه", "error");
    } finally {
      setOpenConfirmExpenseModal(false);
      setExpenseToDelete(null);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setEditExpenseCategory(expense.category);
    setEditExpenseAmount(expense.amount.toString());
    setEditExpenseDescription(expense.description || "");
    setOpenEditExpenseModal(true);
  };

  const handleUpdateExpense = async () => {
    if (!editExpenseCategory) {
      showToast("❌ لطفاً دسته‌بندی هزینه را انتخاب کنید", "error");
      return;
    }
    if (!editExpenseAmount || editExpenseAmount === "0") {
      showToast("❌ لطفاً مبلغ هزینه را وارد کنید", "error");
      return;
    }

    try {
      const expenseRef = ref(db, `users_emails/${emailKey}/expenses/${editingExpense.id}`);
      await update(expenseRef, {
        category: editExpenseCategory,
        categoryLabel: expenseCategories.find(c => c.value === editExpenseCategory)?.label,
        categoryIcon: expenseCategories.find(c => c.value === editExpenseCategory)?.icon,
        amount: Number(editExpenseAmount),
        description: editExpenseDescription || "",
        updatedAt: new Date().toISOString()
      });
      showToast(`✅ هزینه با موفقیت ویرایش شد`, "success");
      setOpenEditExpenseModal(false);
      setEditingExpense(null);
      const expensesRef = ref(db, `users_emails/${emailKey}/expenses`);
      const snapshot = await get(expensesRef);
      if (snapshot.exists()) {
        setExpenses(snapshot.val());
      } else {
        setExpenses({});
      }
    } catch (error) {
      showToast("❌ خطا در ویرایش هزینه", "error");
    }
  };

  const handleExpenseAmountChange = (e) => {
    let rawValue = e.target.value.replace(/,/g, "");
    rawValue = rawValue.replace(/\./g, "");
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setExpenseAmount(rawValue);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseCategory) {
      showToast("❌ لطفاً دسته‌بندی هزینه را انتخاب کنید", "error");
      return;
    }
    if (!expenseAmount || expenseAmount === "0") {
      showToast("❌ لطفاً مبلغ هزینه را وارد کنید", "error");
      return;
    }

    setIsAdding(true);

    try {
      const expenseData = {
        id: Date.now().toString(),
        carId: selectedCar.id,
        carName: selectedCar.carName,
        category: expenseCategory,
        categoryLabel: expenseCategories.find(c => c.value === expenseCategory)?.label,
        categoryIcon: expenseCategories.find(c => c.value === expenseCategory)?.icon,
        amount: Number(expenseAmount),
        description: expenseDescription || "",
        createdAt: new Date().toISOString(),
      };

      const expensesRef = ref(db, `users_emails/${emailKey}/expenses/${expenseData.id}`);
      await set(expensesRef, expenseData);

      showToast(`✅ هزینه با موفقیت ثبت شد`, "success");
      
      setOpenExpenseModal(false);
      setExpenseCategory("");
      setExpenseAmount("");
      setExpenseDescription("");
      
      const allExpensesRef = ref(db, `users_emails/${emailKey}/expenses`);
      const snapshot = await get(allExpensesRef);
      if (snapshot.exists()) {
        setExpenses(snapshot.val());
      }
      
    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ثبت هزینه", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const showAllExpenses = (car) => {
    const carExpenses = expenses ? Object.entries(expenses)
      .filter(([_, exp]) => exp.carId === car.id)
      .map(([id, val]) => ({ id, ...val })) : [];
    setSelectedCarExpenses(carExpenses);
    setSelectedCarName(car.carName);
    setOpenAllExpensesModal(true);
  };

  const formatPrice = (price) => price?.toLocaleString() || "0";
  
  const safeConvertToPersianDate = (dateValue) => {
    if (!dateValue) return "-";
    try {
      if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(date);
      }
      if (typeof dateValue === 'string') {
        if (dateValue.includes('T')) {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return "-";
          return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric', month: '2-digit', day: '2-digit'
          }).format(date);
        }
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          const parts = dateValue.split('-');
          if (parts.length >= 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (isNaN(date.getTime())) return "-";
            return new Intl.DateTimeFormat('fa-IR', {
              year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(date);
          }
        }
        if (dateValue.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)) {
          return dateValue;
        }
      }
      return "-";
    } catch (error) {
      return "-";
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

  const filteredCars = cars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (car.carName && car.carName.toLowerCase().includes(searchLower)) ||
      (car.buyerName && car.buyerName.toLowerCase().includes(searchLower))
    );
  });

  const totalCarCount = filteredCars.length;
  
  // ===== استفاده از تابع جدید برای محاسبه مجموع هزینه‌ها =====
  const totalCarsExpenses = filteredCars.reduce((sum, car) => {
    const carExpenses = getCarExpenses(car.id, Object.values(expenses || {}));
    return sum + carExpenses;
  }, 0);

  const getHeaderColor = (carName) => {
    const colors = [
      { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", text: "#fff" },
      { bg: "linear-gradient(135deg, #10b981, #059669)", text: "#fff" },
      { bg: "linear-gradient(135deg, #f59e0b, #d97706)", text: "#fff" },
      { bg: "linear-gradient(135deg, #8b5cf6, #7c3aed)", text: "#fff" },
      { bg: "linear-gradient(135deg, #ec4899, #db2777)", text: "#fff" },
      { bg: "linear-gradient(135deg, #06b6d4, #0891b2)", text: "#fff" },
    ];
    const index = carName.length % colors.length;
    return colors[index];
  };

  const inputStyle = (index, focusedIndex) => ({
    padding: "8px 12px",
    borderRadius: "10px",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    color: "#000000",
    border: focusedIndex === index ? "2px solid #f59e0b" : "1px solid #e2e8f0",
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

  const loadingStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
    flexDirection: "column",
    gap: "16px"
  };

  const loadingSpinner = {
    width: "50px",
    height: "50px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #f59e0b",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={loadingSpinner}></div>
        <p style={{ fontSize: "14px", color: "#64748b" }}>در حال بارگذاری...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f1f5f9", minHeight: "80vh", borderRadius: "16px" }}>
      {toast && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" }}>
          ← بازگشت
        </button>
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "bold", color: "#1e293b" }}>🚗 مدیریت خودروها</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowAddModal(true)} style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
            ➕ ثبت خودرو جدید
          </button>
        </div>
      </div>

      <div className="responsive-grid-2" style={{ marginBottom: "24px" }}>
        <div style={{ background: "linear-gradient(135deg, #64748b, #475569)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <span style={{ fontSize: "32px" }}>🚗</span>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalCarCount}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>تعداد خودروها</div>
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <span style={{ fontSize: "32px" }}>💰</span>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalCarsExpenses.toLocaleString()}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>مجموع هزینه‌ها (تومان)</div>
            <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "5px" }}>{numberToWords(totalCarsExpenses)} تومان</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div style={{ position: "relative", maxWidth: "350px" }}>
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8" }}>🔍</span>
          <input
            type="text"
            placeholder="جستجو در نام خودرو یا خریدار..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 35px 10px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#1e293b" }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "14px", cursor: "pointer", color: "#94a3b8" }}>✕</button>
          )}
        </div>
      </div>

      {filteredCars.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "16px" }}>
          <span style={{ fontSize: "64px", display: "block", marginBottom: "16px" }}>🚗</span>
          <p style={{ fontSize: "16px", color: "#64748b" }}>هیچ خودرویی ثبت نشده است</p>
          <button onClick={() => setShowAddModal(true)} style={{ marginTop: "20px", background: "#10b981", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
            ➕ ثبت خودرو جدید
          </button>
        </div>
      ) : (
        <div className="responsive-grid-2">
          {filteredCars.map((car) => {
            // ===== استفاده از تابع جدید برای هزینه‌های هر خودرو =====
            const totalExpense = getCarExpenses(car.id, Object.values(expenses || {}));
            const carExpenses = Object.values(expenses || {}).filter(exp => exp.carId === car.id);
            
            const totalWithCar = (Number(car.price) || 0) + totalExpense;
            const headerColor = getHeaderColor(car.carName);
            
            return (
              <div key={car.id} style={{
                background: "#fff",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                transition: "all 0.3s ease",
                borderTop: `4px solid ${headerColor.bg.split(',')[1] || '#3b82f6'}`,
              }}>
                <div style={{
                  padding: "14px 20px",
                  background: headerColor.bg,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <h3 className="card-title-mobile" style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#fff" }}>🚗 {car.carName}</h3>
                  <span style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "4px 12px",
                    borderRadius: "30px",
                    fontSize: "11px",
                    color: "#fff",
                    fontWeight: "bold"
                  }}>فعال</span>
                </div>

                <div style={{ padding: "20px" }}>
                  <div style={{ marginBottom: "16px", padding: "12px", background: "#f8fafc", borderRadius: "14px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "10px", paddingBottom: "6px", borderBottom: "2px solid #e2e8f0" }}>📋 اطلاعات خریدار</h4>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
                      <span style={{ color: "#64748b" }}>نام خریدار:</span>
                      <span style={{ fontWeight: "500", color: "#1e293b" }}>{car.buyerName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
                      <span style={{ color: "#64748b" }}>تاریخ خرید:</span>
                      <span style={{ fontWeight: "500", color: "#1e293b" }}>{safeConvertToPersianDate(car.purchaseDate)}</span>
                    </div>
                    {car.description && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#64748b" }}>توضیحات:</span>
                        <span style={{ fontWeight: "500", color: "#1e293b" }}>{car.description}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: "16px", padding: "12px", background: "#deedd4", borderRadius: "14px", borderRight: "2px solid #deedd4" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#166534", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid #bbf7d0" }}>🚘 مشخصات خودرو</h4>
                    <div className="responsive-grid-2" style={{ gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px", background: "#fff", borderRadius: "8px" }}>
                        <span style={{ color: "#64748b" }}>سال تولید:</span>
                        <span style={{ fontWeight: "500", color: "#1e293b" }}>{car.productionYear || "-"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px", background: "#fff", borderRadius: "8px" }}>
                        <span style={{ color: "#64748b" }}>رنگ:</span>
                        <span style={{ fontWeight: "500", color: "#1e293b" }}>{car.color || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px", padding: "12px", background: "#fef3c7", borderRadius: "14px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#92400e", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid #fde68a" }}>📅 تاریخ‌های مهم</h4>
                    <div className="responsive-grid-3" style={{ gap: "8px", textAlign: "center" }}>
                      <div style={{ background: "#fff", padding: "6px", borderRadius: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#f59e0b", marginBottom: "3px" }}>🛡️ بیمه</div>
                        <div style={{ fontSize: "11px", fontWeight: "500" }}>{safeConvertToPersianDate(car.insuranceExpiry) || "-"}</div>
                      </div>
                      <div style={{ background: "#fff", padding: "6px", borderRadius: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#f59e0b", marginBottom: "3px" }}>📜 وکالت</div>
                        <div style={{ fontSize: "11px", fontWeight: "500" }}>{safeConvertToPersianDate(car.attorneyExpiry) || "-"}</div>
                      </div>
                      <div style={{ background: "#fff", padding: "6px", borderRadius: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#f59e0b", marginBottom: "3px" }}>🔧 معاینه فنی</div>
                        <div style={{ fontSize: "11px", fontWeight: "500" }}>{safeConvertToPersianDate(car.technicalInspectionDate) || "-"}</div>
                      </div>
                    </div>
                  </div>

                  {carExpenses.length > 0 && (
                    <div style={{ marginBottom: "16px", padding: "12px", background: "#fef3c7", borderRadius: "14px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#92400e", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid #fde68a" }}>🔧 هزینه‌های ثبت شده ({carExpenses.length} مورد)</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {carExpenses.slice(0, 3).map((exp) => {
                          const catInfo = expenseCategories.find(c => c.value === exp.category) || { icon: "📦", label: "سایر", color: "#64748b" };
                          return (
                            <div key={exp.id} style={{ background: "#fff", padding: "8px 12px", borderRadius: "10px", borderRight: `3px solid ${catInfo.color}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                <span style={{ fontSize: "16px" }}>{catInfo.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: "12px", fontWeight: "500" }}>{catInfo.label}</span>
                                  {exp.description && (
                                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                                      📝 {exp.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontWeight: "bold", fontSize: "13px", color: "#ef4444" }}>{formatPrice(exp.amount)} تومان</div>
                                  <div style={{ fontSize: "9px", color: "#94a3b8" }}>{numberToWords(exp.amount)}</div>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button className="table-action-btn" onClick={() => handleEditExpense(exp)} style={{ background: "#e0e7ff", border: "none", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>✏️</button>
                                  <button className="table-action-btn" onClick={() => handleDeleteExpenseClick(exp)} style={{ background: "#fee2e2", border: "none", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>🗑️</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {carExpenses.length > 3 && (
                          <button onClick={() => showAllExpenses(car)} style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "8px", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                            + مشاهده {carExpenses.length - 3} هزینه دیگر
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="responsive-grid-3" style={{ gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "#e0f1ee", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>💰 مبلغ خرید</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{formatPrice(car.price)}</div>
                      <div style={{ fontSize: "9px", color: "#10b981" }}>{numberToWords(car.price)}</div>
                    </div>
                    <div style={{ background: "#fef3c7", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#d97706", marginBottom: "4px" }}>🔧 جمع هزینه‌ها</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#d97706" }}>{formatPrice(totalExpense)}</div>
                      <div style={{ fontSize: "9px", color: "#f59e0b" }}>{numberToWords(totalExpense)}</div>
                    </div>
                    <div style={{ background: "#ede9fe", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#7c3aed", marginBottom: "4px" }}>💰 هزینه کل</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#7c3aed" }}>{formatPrice(totalWithCar)}</div>
                      <div style={{ fontSize: "9px", color: "#8b5cf6" }}>{numberToWords(totalWithCar)}</div>
                    </div>
                  </div>

                  <div className="stack-on-mobile" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button onClick={() => {
                      setSelectedCarForSale(car);
                      setSellModalOpen(true);
                    }} style={{ flex: 1, padding: "8px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                      💰 فروش
                    </button>
                    <button onClick={() => {
                      setSelectedCar(car);
                      setOpenExpenseModal(true);
                    }} style={{ flex: 1, padding: "8px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                      🔧 ثبت هزینه
                    </button>
                    <button onClick={() => handleEditCar(car)} style={{ flex: 1, padding: "8px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                      ✏️ ویرایش
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SellCarModal isOpen={sellModalOpen} onClose={() => setSellModalOpen(false)} car={selectedCarForSale} user={user} onSold={() => {
        setSellModalOpen(false);
        window.location.reload();
      }} />

      <Modal isOpen={openExpenseModal} onClose={() => setOpenExpenseModal(false)} title={`💰 ثبت هزینه جدید برای ${selectedCar?.carName}`} color="#3b82f6" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>📂 دسته‌بندی هزینه</label>
          <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} style={inputStyle(0, focusedIndex)}>
            <option value="" disabled>انتخاب کنید</option>
            {expenseCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>

          <label style={labelStyle}>💰 مبلغ (تومان)</label>
          <input type="text" value={expenseAmount ? Number(expenseAmount).toLocaleString() : ""} onChange={handleExpenseAmountChange} style={{...inputStyle(1, focusedIndex), textAlign: "left", direction: "ltr"}} placeholder="مثال: 500,000" />
          {expenseAmount && expenseAmount !== "0" && (
            <div style={{ fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" }}>{numberToWords(Number(expenseAmount))} تومان</div>
          )}

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} style={{...inputStyle(2, focusedIndex), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات مربوط به هزینه..." rows="3" />

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setOpenExpenseModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={handleAddExpense} disabled={isAdding} style={{ flex: 1, padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>{isAdding ? "در حال ثبت..." : "ثبت هزینه"}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ ثبت خودرو جدید" color="#10b981" size="md">
        <CarForm user={user} onSaved={() => { setShowAddModal(false); window.location.reload(); }} onCancel={() => setShowAddModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ ویرایش خودرو" color="#8b5cf6" size="md">
        <CarForm user={user} editingCar={editingCar} onSaved={() => { setShowEditModal(false); window.location.reload(); }} onCancel={() => setShowEditModal(false)} />
      </Modal>

      <Modal isOpen={openEditExpenseModal} onClose={() => setOpenEditExpenseModal(false)} title="✏️ ویرایش هزینه" color="#8b5cf6" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>📂 دسته‌بندی هزینه</label>
          <select value={editExpenseCategory} onChange={(e) => setEditExpenseCategory(e.target.value)} style={inputStyle(10, focusedIndex)}>
            <option value="" disabled>انتخاب کنید</option>
            {expenseCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>

          <label style={labelStyle}>💰 مبلغ (تومان)</label>
          <input type="text" value={editExpenseAmount ? Number(editExpenseAmount).toLocaleString() : ""} onChange={(e) => {
            let raw = e.target.value.replace(/,/g, "");
            if (raw === "" || /^\d+$/.test(raw)) setEditExpenseAmount(raw);
          }} style={{...inputStyle(11, focusedIndex), textAlign: "left", direction: "ltr"}} placeholder="مبلغ هزینه" />

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={editExpenseDescription} onChange={(e) => setEditExpenseDescription(e.target.value)} style={{...inputStyle(12, focusedIndex), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات" />

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setOpenEditExpenseModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={handleUpdateExpense} style={{ flex: 1, padding: "10px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>✏️ ویرایش هزینه</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={openConfirmExpenseModal} onClose={() => setOpenConfirmExpenseModal(false)} title="🗑️ حذف هزینه" color="#ef4444" size="sm">
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <p style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px", color: "#1e293b" }}>آیا از حذف این هزینه مطمئن هستید؟</p>
          <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "24px" }}>مبلغ: {formatPrice(expenseToDelete?.amount)} تومان</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => setOpenConfirmExpenseModal(false)} style={{ padding: "10px 24px", background: "#64748b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer" }}>انصراف</button>
            <button onClick={confirmDeleteExpense} style={{ padding: "10px 24px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>حذف</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={openAllExpensesModal} onClose={() => setOpenAllExpensesModal(false)} title={`🔧 لیست هزینه‌های خودرو ${selectedCarName}`} color="#f59e0b" size="lg">
        <div style={{ maxHeight: "500px", overflowY: "auto" }}>
          {selectedCarExpenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <span style={{ fontSize: "48px" }}>🔧</span>
              <p>هیچ هزینه‌ای ثبت نشده است</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedCarExpenses.map((exp) => {
                const catInfo = expenseCategories.find(c => c.value === exp.category) || { icon: "📦", label: "سایر", color: "#64748b" };
                return (
                  <div key={exp.id} style={{ background: "#f8fafc", borderRadius: "12px", padding: "12px", borderRight: `3px solid ${catInfo.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "20px" }}>{catInfo.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: "bold", fontSize: "13px" }}>{catInfo.label}</div>
                        {exp.description && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            📝 {exp.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#ef4444" }}>{formatPrice(exp.amount)} تومان</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{numberToWords(exp.amount)}</div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="table-action-btn" onClick={() => {
                          setOpenAllExpensesModal(false);
                          handleEditExpense(exp);
                        }} style={{ background: "#e0e7ff", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>✏️</button>
                        <button className="table-action-btn" onClick={() => {
                          setOpenAllExpensesModal(false);
                          handleDeleteExpenseClick(exp);
                        }} style={{ background: "#fee2e2", border: "none", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CarList;