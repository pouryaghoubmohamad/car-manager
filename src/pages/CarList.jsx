import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import Modal from "../Modal";
import SellCarModal from "./SellCarModal";
import CarForm from "./CarForm";

const CarList = ({ user, onBack }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [expenses, setExpenses] = useState({});
  const [toast, setToast] = useState(null);
  
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [carToDelete, setCarToDelete] = useState(null);
  
  // مودال تأیید حذف هزینه
  const [openConfirmExpenseModal, setOpenConfirmExpenseModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  
  const [openExpenseModal, setOpenExpenseModal] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  const [openEditExpenseModal, setOpenEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseCategory, setEditExpenseCategory] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseDescription, setEditExpenseDescription] = useState("");
  
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedCarForSale, setSelectedCarForSale] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);

  const expenseCategories = [
    { value: "mechanic", label: "مکانیکی", icon: "🔧" },
    { value: "oilChange", label: "تعویض روغن", icon: "🛢️" },
    { value: "battery", label: "باطری‌سازی", icon: "🔋" },
    { value: "bodywork", label: "صافکاری", icon: "🔨" },
    { value: "painting", label: "نقاشی", icon: "🎨" },
    { value: "electrical", label: "رودی", icon: "⚡" },
    { value: "parts", label: "هزینه وسایل", icon: "🔧" },
    { value: "other", label: "سایر", icon: "📦" },
  ];

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) return;
    const carsRef = ref(db, `users/${user.uid}/cars`);
    const unsubscribe = onValue(carsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.entries(data)
          .filter(([_, value]) => !value.sold)
          .map(([id, value]) => ({
            id: id,
            ...value,
            expenses: []
          })).reverse();
        setCars(carsArray);
      } else {
        setCars([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const expensesRef = ref(db, `users/${user.uid}/expenses`);
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setExpenses(data);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleDeleteClick = (car) => {
    setCarToDelete(car);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!carToDelete) return;
    try {
      await remove(ref(db, `users/${user.uid}/cars/${carToDelete.id}`));
      showToast(`✅ خودرو "${carToDelete.carName}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف خودرو", "error");
    } finally {
      setOpenConfirmModal(false);
      setCarToDelete(null);
    }
  };

  // حذف هزینه با مودال
  const handleDeleteExpenseClick = (expense) => {
    setExpenseToDelete(expense);
    setOpenConfirmExpenseModal(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await remove(ref(db, `users/${user.uid}/expenses/${expenseToDelete.id}`));
      showToast(`✅ هزینه "${expenseToDelete.categoryLabel}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف هزینه", "error");
    } finally {
      setOpenConfirmExpenseModal(false);
      setExpenseToDelete(null);
    }
  };

  const handleEditCar = (car) => {
    setEditingCar(car);
    setShowEditModal(true);
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
      const expenseRef = ref(db, `users/${user.uid}/expenses/${editingExpense.id}`);
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
      setEditExpenseCategory("");
      setEditExpenseAmount("");
      setEditExpenseDescription("");
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

  const handleEditExpenseAmountChange = (e) => {
    let rawValue = e.target.value.replace(/,/g, "");
    rawValue = rawValue.replace(/\./g, "");
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setEditExpenseAmount(rawValue);
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

      const expensesRef = ref(db, `users/${user.uid}/expenses/${expenseData.id}`);
      await set(expensesRef, expenseData);

      showToast(`✅ هزینه ${expenseCategories.find(c => c.value === expenseCategory)?.label} با موفقیت ثبت شد`, "success");
      
      setOpenExpenseModal(false);
      setExpenseCategory("");
      setExpenseAmount("");
      setExpenseDescription("");
      
    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ثبت هزینه", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const formatPrice = (price) => price?.toLocaleString() || "0";
  
  const safeConvertToPersianDate = (dateValue) => {
    if (!dateValue) return "-";
    try {
      if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date);
      }
      if (typeof dateValue === 'string') {
        if (dateValue.includes('T')) {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return "-";
          return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(date);
        }
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          const parts = dateValue.split('-');
          if (parts.length >= 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (isNaN(date.getTime())) return "-";
            return new Intl.DateTimeFormat('fa-IR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(date);
          }
        }
        if (dateValue.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)) {
          return dateValue;
        }
      }
      if (dateValue instanceof Date) {
        if (isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date);
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

  const filteredCars = cars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (car.carName && car.carName.toLowerCase().includes(searchLower)) ||
      (car.buyerName && car.buyerName.toLowerCase().includes(searchLower))
    );
  });

  const totalCarCount = filteredCars.length;
  const totalCarsExpenses = filteredCars.reduce((sum, car) => {
    const carExpenses = expenses ? Object.entries(expenses).filter(([_, exp]) => exp.carId === car.id).reduce((s, e) => s + (Number(e[1].amount) || 0), 0) : 0;
    return sum + carExpenses;
  }, 0);

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

  const rightBoxStyle = (type) => {
    switch(type) {
      case 'buyer':
        return { backgroundColor: "#e0f2fe", borderRadius: "12px", padding: "6px 10px", textAlign: "left", fontWeight: "bold", color: "#0284c7", fontSize: "12px" };
      case 'datePurchase':
        return { backgroundColor: "#dcfce7", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#16a34a", fontWeight: "500", fontSize: "12px" };
      case 'dateInsurance':
        return { backgroundColor: "#fef3c7", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#d97706", fontWeight: "500", fontSize: "12px" };
      case 'dateAttorney':
        return { backgroundColor: "#e0e7ff", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#4338ca", fontWeight: "500", fontSize: "12px" };
      case 'dateInspection':
        return { backgroundColor: "#fce7f3", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#db2777", fontWeight: "500", fontSize: "12px" };
      case 'purchase':
        return { backgroundColor: "#f1f5f9", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      case 'expense':
        return { backgroundColor: "#fef3c7", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      default:
        return { backgroundColor: "#f8fafc", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
    }
  };

  const threeColumnsStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "12px"
  };

  const columnCardStyle = {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "8px",
    textAlign: "center"
  };

  const columnTitleStyle = {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: "6px",
    paddingBottom: "4px",
    borderBottom: "2px solid #f59e0b"
  };

  const wordsStyle = { fontSize: "9px", color: "#64748b", marginTop: "3px", textAlign: "left" };
  const tinyWordsStyle = { fontSize: "8px", color: "#94a3b8", marginTop: "2px", textAlign: "left" };

  const infoSectionStyle = { 
    marginBottom: "12px", 
    padding: "10px", 
    background: "#f8fafc", 
    borderRadius: "12px" 
  };

  const sectionTitleStyle = { 
    fontSize: "13px", 
    fontWeight: "bold", 
    color: "#1e293b", 
    marginBottom: "10px", 
    paddingBottom: "6px", 
    borderBottom: "2px solid #e2e8f0" 
  };

  const infoRowStyle = { 
    display: "flex", 
    justifyContent: "space-between", 
    marginBottom: "8px", 
    fontSize: "12px", 
    alignItems: "flex-start", 
    flexWrap: "wrap", 
    gap: "6px" 
  };

  const expenseSectionStyle = { 
    marginBottom: "12px", 
    padding: "10px", 
    background: "#fef3c7", 
    borderRadius: "12px" 
  };

  const expenseListStyle = { 
    display: "flex", 
    flexDirection: "column", 
    gap: "8px" 
  };

  const expenseItemStyle = { 
    background: "#fff", 
    padding: "8px", 
    borderRadius: "8px", 
    marginBottom: "6px", 
    border: "1px solid #e2e8f0" 
  };

  const expenseItemHeader = { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: "4px",
    fontSize: "11px"
  };

  const expenseActionsStyle = {
    display: "flex",
    gap: "6px",
    marginTop: "6px",
    justifyContent: "flex-end"
  };

  const expenseEditBtnStyle = {
    background: "#8b5cf6",
    color: "#fff",
    border: "none",
    padding: "4px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "10px"
  };

  const expenseDeleteBtnStyle = {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "4px 8px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "10px"
  };

  const moreExpenseStyle = { 
    fontSize: "10px", 
    color: "#f59e0b", 
    textAlign: "center", 
    marginTop: "6px" 
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap"
  };

  const getHeaderColor = (carName) => {
    const colors = [
      { bg: "#eef2ff", text: "#4338ca" },
      { bg: "#ecfdf5", text: "#065f46" },
      { bg: "#fef3c7", text: "#92400e" },
      { bg: "#fce7f3", text: "#9d174d" },
      { bg: "#e0e7ff", text: "#3730a3" },
      { bg: "#ffedd5", text: "#9a3412" },
    ];
    const index = carName.length % colors.length;
    return colors[index];
  };

  if (loading) {
    return <div style={loadingStyle}>در حال بارگذاری...</div>;
  }

  return (
    <div>
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

      <div style={headerButtonsStyle}>
        <button onClick={onBack} style={backBtnStyle}>← بازگشت</button>
        <button onClick={() => setShowAddModal(true)} style={addNewBtnStyle}>➕ ثبت خودرو جدید</button>
      </div>

      <div style={statsContainerStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🚗</div>
          <div>
            <div style={statValueStyle}>{totalCarCount}</div>
            <div style={statLabelStyle}>تعداد خودروها</div>
          </div>
        </div>
        <div style={statCardStyle2}>
          <div style={statIconStyle}>💰</div>
          <div>
            <div style={statValueStyle}>{totalCarsExpenses.toLocaleString()}</div>
            <div style={statLabelStyle}>مجموع هزینه‌ها (تومان)</div>
            <div style={statWordsSmall}>{numberToWords(totalCarsExpenses)} تومان</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" }}>
        <label style={{...labelStyle, maxWidth: "700px", margin: "0 auto 6px auto" }}>🔍 جستجو</label>
        <input
          type="text"
          placeholder="جستجو در نام خودرو یا خریدار..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{...inputStyle(999, focusedIndex), maxWidth: "700px", margin: "0 auto", display: "block"}}
          onFocus={() => setFocusedIndex(999)}
          onBlur={() => setFocusedIndex(null)}
        />
      </div>

      {filteredCars.length === 0 ? (
        <div style={emptyStyle}>
          <p>🚗 هیچ خودرویی ثبت نشده است</p>
          <button onClick={() => setShowAddModal(true)} style={emptyAddBtnStyle}>➕ ثبت خودرو جدید</button>
        </div>
      ) : (
        <div style={carsGridStyle}>
          {filteredCars.map((car) => {
            const carExpenses = expenses ? Object.entries(expenses).filter(([_, exp]) => exp.carId === car.id).map(([id, val]) => ({ id, ...val })) : [];
            const totalExpense = carExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
            const totalWithCar = (Number(car.price) || 0) + totalExpense;
            const headerColor = getHeaderColor(car.carName);
            
            return (
              <div key={car.id} style={carCardStyle}>
                <div style={{...carHeaderStyle, backgroundColor: headerColor.bg}}>
                  <div style={carTitleStyle}>
                    <span style={carIconStyle}>🚗</span>
                    <h3 style={{...carNameStyle, color: headerColor.text}}>{car.carName}</h3>
                  </div>
                </div>

                <div style={cardContentStyle}>
                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📋 اطلاعات خریدار</h4>
                    <div style={infoRowStyle}>
                      <span>نام خریدار:</span>
                      <div style={rightBoxStyle('buyer')}>{car.buyerName}</div>
                    </div>
                    {car.description && (
                      <div style={infoRowStyle}>
                        <span>توضیحات:</span>
                        <div style={rightBoxStyle('buyer')}>{car.description}</div>
                      </div>
                    )}
                  </div>

                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📅 تاریخ‌های مهم</h4>
                    <div style={infoRowStyle}>
                      <span>📅 تاریخ خرید :</span>
                      <div style={rightBoxStyle('datePurchase')}>{safeConvertToPersianDate(car.purchaseDate)}</div>
                    </div>
                    <div style={infoRowStyle}>
                      <span>🛡️ بیمه :</span>
                      <div style={rightBoxStyle('dateInsurance')}>{safeConvertToPersianDate(car.insuranceExpiry)}</div>
                    </div>
                    <div style={infoRowStyle}>
                      <span>📜 وکالت :</span>
                      <div style={rightBoxStyle('dateAttorney')}>{safeConvertToPersianDate(car.attorneyExpiry)}</div>
                    </div>
                    <div style={infoRowStyle}>
                      <span>🔧 معاینه فنی :</span>
                      <div style={rightBoxStyle('dateInspection')}>{safeConvertToPersianDate(car.technicalInspectionDate)}</div>
                    </div>
                  </div>

                  {carExpenses.length > 0 && (
                    <div style={expenseSectionStyle}>
                      <h4 style={sectionTitleStyle}>🔧 هزینه‌های ثبت شده</h4>
                      <div style={expenseListStyle}>
                        {carExpenses.slice(0, 3).map((exp) => (
                          <div key={exp.id} style={expenseItemStyle}>
                            <div style={expenseItemHeader}>
                              <span>{exp.categoryIcon} {exp.categoryLabel}</span>
                              <span style={expenseAmountStyle}>{formatPrice(exp.amount)} تومان</span>
                            </div>
                            {exp.description && <div style={expenseDescStyle}>{exp.description}</div>}
                            <div style={tinyWordsStyle}>{numberToWords(exp.amount)} تومان</div>
                            <div style={expenseActionsStyle}>
                              <button onClick={() => handleEditExpense(exp)} style={expenseEditBtnStyle}>
                                ✏️ ویرایش
                              </button>
                              <button onClick={() => handleDeleteExpenseClick(exp)} style={expenseDeleteBtnStyle}>
                                🗑️ حذف
                              </button>
                            </div>
                          </div>
                        ))}
                        {carExpenses.length > 3 && (
                          <div style={moreExpenseStyle}>+ {carExpenses.length - 3} هزینه دیگر</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={threeColumnsStyle}>
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle}>💰 مبلغ خرید</div>
                      <div style={rightBoxStyle('purchase')}>
                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>{formatPrice(car.price)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(car.price)} تومان</div>
                      </div>
                    </div>
                    
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle}>🔧 مجموع هزینه‌ها</div>
                      <div style={rightBoxStyle('expense')}>
                        <div style={{ fontWeight: "bold", color: "#f59e0b", fontSize: "14px" }}>{formatPrice(totalExpense)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(totalExpense)} تومان</div>
                      </div>
                    </div>
                    
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle}>💰 جمع کل (خرید + هزینه)</div>
                      <div style={rightBoxStyle('purchase')}>
                        <div style={{ fontWeight: "bold", color: "#7c3aed", fontSize: "14px" }}>{formatPrice(totalWithCar)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(totalWithCar)} تومان</div>
                      </div>
                    </div>
                  </div>

                  <div style={buttonContainerStyle}>
                    <button onClick={() => {
                      setSelectedCarForSale(car);
                      setSellModalOpen(true);
                    }} style={sellBtnStyle}>
                      💰 فروش رفت
                    </button>
                    <button onClick={() => {
                      setSelectedCar(car);
                      setOpenExpenseModal(true);
                    }} style={addExpenseBtnStyle}>
                      ➕ ثبت هزینه
                    </button>
                    <button onClick={() => handleEditCar(car)} style={editBtnStyle}>
                      ✏️ ویرایش
                    </button>
                    <button onClick={() => handleDeleteClick(car)} style={deleteBtnStyle}>
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال فروش */}
      <SellCarModal 
        isOpen={sellModalOpen} 
        onClose={() => setSellModalOpen(false)} 
        car={selectedCarForSale} 
        user={user} 
        onSold={() => {
          setSellModalOpen(false);
          const carsRef = ref(db, `users/${user.uid}/cars`);
          onValue(carsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              const carsArray = Object.entries(data)
                .filter(([_, value]) => !value.sold)
                .map(([id, value]) => ({ id, ...value }))
                .reverse();
              setCars(carsArray);
            }
          }, { onlyOnce: true });
        }} 
      />

      {/* مودال تأیید حذف خودرو */}
      <Modal 
        isOpen={openConfirmModal} 
        onClose={() => setOpenConfirmModal(false)} 
        title="🗑️ تأیید حذف خودرو"
        color="#ef4444"
        size="sm"
      >
        <div style={confirmModalStyle}>
          <p style={confirmTextStyle}>
            آیا از حذف خودرو <strong>"{carToDelete?.carName}"</strong> مطمئن هستید؟
          </p>
          <p style={confirmWarningStyle}>این عمل غیرقابل بازگشت است.</p>
          <div style={confirmBtnContainer}>
            <button onClick={() => setOpenConfirmModal(false)} style={confirmCancelBtn}>انصراف</button>
            <button onClick={confirmDelete} style={confirmDeleteBtn}>حذف خودرو</button>
          </div>
        </div>
      </Modal>

      {/* مودال تأیید حذف هزینه */}
      <Modal 
        isOpen={openConfirmExpenseModal} 
        onClose={() => setOpenConfirmExpenseModal(false)} 
        title="🗑️ تأیید حذف هزینه"
        color="#ef4444"
        size="sm"
      >
        <div style={confirmModalStyle}>
          <p style={confirmTextStyle}>
            آیا از حذف هزینه <strong>"{expenseToDelete?.categoryLabel}"</strong> مطمئن هستید؟
          </p>
          <p style={confirmWarningStyle}>این عمل غیرقابل بازگشت است.</p>
          <div style={confirmBtnContainer}>
            <button onClick={() => setOpenConfirmExpenseModal(false)} style={confirmCancelBtn}>انصراف</button>
            <button onClick={confirmDeleteExpense} style={confirmDeleteBtn}>حذف هزینه</button>
          </div>
        </div>
      </Modal>

      {/* مودال ثبت هزینه */}
      <Modal 
        isOpen={openExpenseModal} 
        onClose={() => setOpenExpenseModal(false)} 
        title={`💰 ثبت هزینه جدید برای ${selectedCar?.carName}`}
        color="#16a34a"
        size="md"
      >
        <div style={modalFormStyle}>
          <label style={labelStyle}>📂 دسته‌بندی هزینه</label>
          <select
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            style={inputStyle(0, focusedIndex)}
            onFocus={() => setFocusedIndex(0)}
            onBlur={() => setFocusedIndex(null)}
          >
            <option value="" disabled>انتخاب کنید</option>
            {expenseCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          <label style={labelStyle}>💰 مبلغ (تومان)</label>
          <input
            type="text"
            value={expenseAmount ? Number(expenseAmount).toLocaleString() : ""}
            onChange={handleExpenseAmountChange}
            style={{...inputStyle(1, focusedIndex), textAlign: "left", direction: "ltr"}}
            onFocus={() => setFocusedIndex(1)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="مثال: 500,000"
          />
          {expenseAmount && expenseAmount !== "0" && (
            <div style={priceHintStyle}>{numberToWords(Number(expenseAmount))} تومان</div>
          )}

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={expenseDescription}
            onChange={(e) => setExpenseDescription(e.target.value)}
            style={textareaStyle(2, focusedIndex)}
            onFocus={() => setFocusedIndex(2)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="توضیحات مربوط به هزینه..."
            rows="3"
          />

          <div style={modalBtnContainer}>
            <button onClick={() => setOpenExpenseModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleAddExpense} disabled={isAdding} style={submitBtnStyle}>
              {isAdding ? "در حال ثبت..." : "ثبت هزینه"}
            </button>
          </div>
        </div>
      </Modal>

      {/* مودال ویرایش هزینه */}
      <Modal 
        isOpen={openEditExpenseModal} 
        onClose={() => {
          setOpenEditExpenseModal(false);
          setEditingExpense(null);
        }} 
        title="✏️ ویرایش هزینه"
        color="#8b5cf6"
        size="md"
      >
        <div style={modalFormStyle}>
          <label style={labelStyle}>📂 دسته‌بندی هزینه</label>
          <select
            value={editExpenseCategory}
            onChange={(e) => setEditExpenseCategory(e.target.value)}
            style={inputStyle(10, focusedIndex)}
            onFocus={() => setFocusedIndex(10)}
            onBlur={() => setFocusedIndex(null)}
          >
            <option value="" disabled>انتخاب کنید</option>
            {expenseCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          <label style={labelStyle}>💰 مبلغ (تومان)</label>
          <input
            type="text"
            value={editExpenseAmount ? Number(editExpenseAmount).toLocaleString() : ""}
            onChange={handleEditExpenseAmountChange}
            style={{...inputStyle(11, focusedIndex), textAlign: "left", direction: "ltr"}}
            onFocus={() => setFocusedIndex(11)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="مثال: 500,000"
          />
          {editExpenseAmount && editExpenseAmount !== "0" && (
            <div style={priceHintStyle}>{numberToWords(Number(editExpenseAmount))} تومان</div>
          )}

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={editExpenseDescription}
            onChange={(e) => setEditExpenseDescription(e.target.value)}
            style={textareaStyle(12, focusedIndex)}
            onFocus={() => setFocusedIndex(12)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="توضیحات مربوط به هزینه..."
            rows="3"
          />

          <div style={modalBtnContainer}>
            <button onClick={() => setOpenEditExpenseModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleUpdateExpense} style={submitBtnStyle}>
              ویرایش هزینه
            </button>
          </div>
        </div>
      </Modal>

      {/* مودال ثبت خودرو جدید */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="➕ ثبت خودرو جدید"
        color="#16a34a"
        size="md"
      >
        <CarForm 
          user={user}
          onSaved={() => {
            setShowAddModal(false);
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* مودال ویرایش خودرو */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => {
          setShowEditModal(false);
          setEditingCar(null);
        }} 
        title="✏️ ویرایش خودرو"
        color="#8b5cf6"
        size="md"
      >
        <CarForm 
          user={user}
          editingCar={editingCar}
          onSaved={() => {
            setShowEditModal(false);
            setEditingCar(null);
          }}
          onCancel={() => {
            setShowEditModal(false);
            setEditingCar(null);
          }}
        />
      </Modal>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// استایل‌ها (همان استایل‌های قبلی)
const toastStyle = {
  position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "12px", color: "#fff", fontSize: "14px", fontWeight: "500", zIndex: 10000, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "10px"
};
const loadingStyle = { textAlign: "center", padding: "40px" };
const emptyStyle = { textAlign: "center", padding: "60px", background: "#fff", borderRadius: "12px" };

const headerButtonsStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  gap: "10px",
  flexWrap: "wrap"
};

const backBtnStyle = {
  background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px"
};

const addNewBtnStyle = {
  background: "#16a34a", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold"
};

const emptyAddBtnStyle = {
  background: "#16a34a", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", marginTop: "20px"
};

const statsContainerStyle = { 
  display: "grid", 
  gridTemplateColumns: "repeat(2, 1fr)", 
  gap: "16px", 
  marginBottom: "24px", 
  maxWidth: "700px", 
  margin: "0 auto 24px auto" 
};

const statCardStyle = { 
  background: "linear-gradient(135deg, #3b82f6, #2563eb)", 
  padding: "16px 20px", 
  borderRadius: "16px", 
  color: "#fff", 
  display: "flex", 
  alignItems: "center", 
  gap: "15px", 
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)" 
};

const statCardStyle2 = { 
  background: "linear-gradient(135deg, #ef4444, #dc2626)", 
  padding: "16px 20px", 
  borderRadius: "16px", 
  color: "#fff", 
  display: "flex", 
  alignItems: "center", 
  gap: "15px", 
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)" 
};

const statIconStyle = { fontSize: "32px" };
const statValueStyle = { fontSize: "24px", fontWeight: "bold" };
const statLabelStyle = { fontSize: "12px", opacity: 0.9 };
const statWordsSmall = { fontSize: "10px", opacity: 0.8, marginTop: "5px" };

const carsGridStyle = { 
  display: "flex", 
  flexDirection: "column", 
  gap: "20px",
  alignItems: "center"
};

const carCardStyle = { 
  background: "#fff", 
  borderRadius: "16px", 
  overflow: "hidden", 
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)", 
  transition: "all 0.3s",
  maxWidth: "700px",
  width: "100%"
};

const carHeaderStyle = { padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const carTitleStyle = { display: "flex", alignItems: "center", gap: "8px" };
const carIconStyle = { fontSize: "20px" };
const carNameStyle = { margin: 0, fontSize: "16px", fontWeight: "bold" };
const cardContentStyle = { padding: "16px" };

const sellBtnStyle = {
  flex: 1,
  padding: "8px",
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold"
};

const addExpenseBtnStyle = { 
  flex: 1,
  padding: "8px",
  background: "#3b82f6", 
  color: "#fff", 
  border: "none", 
  borderRadius: "10px", 
  cursor: "pointer", 
  fontSize: "12px",
  fontWeight: "bold"
};

const editBtnStyle = {
  flex: 1,
  padding: "8px",
  background: "#8b5cf6",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "bold"
};

const deleteBtnStyle = { 
  flex: 1,
  padding: "8px",
  background: "#ef4444", 
  border: "none", 
  borderRadius: "10px", 
  cursor: "pointer", 
  fontSize: "12px",
  fontWeight: "bold"
};

const expenseAmountStyle = { 
  fontSize: "12px", 
  fontWeight: "bold", 
  color: "#ef4444" 
};

const expenseDescStyle = { 
  fontSize: "10px", 
  color: "#64748b", 
  marginTop: "4px" 
};

const modalFormStyle = { display: "flex", flexDirection: "column", gap: "12px" };
const textareaStyle = (index, focusedIndex) => ({ 
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
  fontFamily: "inherit", 
  resize: "vertical", 
  minHeight: "60px" 
});
const priceHintStyle = { fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px", paddingRight: "4px" };
const modalBtnContainer = { display: "flex", gap: "10px", marginTop: "10px" };
const cancelBtnStyle = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const submitBtnStyle = { flex: 1, padding: "10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmModalStyle = { textAlign: "center", padding: "10px" };
const confirmTextStyle = { fontSize: "16px", marginBottom: "12px" };
const confirmWarningStyle = { fontSize: "12px", color: "#ef4444", marginBottom: "20px" };
const confirmBtnContainer = { display: "flex", gap: "12px", marginTop: "10px" };
const confirmCancelBtn = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmDeleteBtn = { flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

export default CarList;