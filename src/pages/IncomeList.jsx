import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, update } from "firebase/database";
import DataTable from "react-data-table-component";
import Modal from "../Modal";
import IncomeForm from "./IncomeForm";

const IncomeList = ({ user, onBack }) => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, deposit, withdrawal
  
  const [editIncome, setEditIncome] = useState({
    title: "",
    amount: "",
    type: "deposit",
    date: "",
    description: ""
  });

  const emailKey = user?.email?.replace(/\./g, '_').replace(/@/g, '_at_') || "";

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user || !emailKey) {
      setLoading(false);
      return;
    }
    const incomesRef = ref(db, `users_emails/${emailKey}/incomes`);
    const unsubscribe = onValue(incomesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const incomesArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value
        })).reverse();
        setIncomes(incomesArray);
      } else {
        setIncomes([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  const getTodayPersianDate = () => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const toPersianDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  const handleAddIncome = async (formData) => {
    try {
      const incomesRef = ref(db, `users_emails/${emailKey}/incomes`);
      const persianDate = getTodayPersianDate();
      
      await push(incomesRef, {
        title: formData.title.trim(),
        amount: Number(formData.amount),
        type: formData.type,
        date: formData.date || persianDate,
        description: formData.description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: persianDate
      });
      
      showToast(`✅ ${formData.type === "deposit" ? "واریزی" : "دریافتی"} "${formData.title}" با موفقیت ثبت شد`, "success");
      setShowAddModal(false);
    } catch (error) {
      showToast("❌ خطا در ثبت", "error");
    }
  };

  const handleEditClick = (income) => {
    setEditingIncome(income);
    setEditIncome({
      title: income.title,
      amount: income.amount.toString(),
      type: income.type || "deposit",
      date: income.date || income.createdAtPersian || "",
      description: income.description || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateIncome = async () => {
    if (!editIncome.title.trim()) {
      showToast("❌ لطفاً عنوان را وارد کنید", "error");
      return;
    }
    if (!editIncome.amount || editIncome.amount === "0") {
      showToast("❌ لطفاً مبلغ را وارد کنید", "error");
      return;
    }

    try {
      const incomeRef = ref(db, `users_emails/${emailKey}/incomes/${editingIncome.id}`);
      await update(incomeRef, {
        title: editIncome.title.trim(),
        amount: Number(editIncome.amount),
        type: editIncome.type,
        date: editIncome.date,
        description: editIncome.description.trim() || "",
        updatedAt: new Date().toISOString()
      });
      
      showToast(`✅ "${editIncome.title}" با موفقیت ویرایش شد`, "success");
      setShowEditModal(false);
      setEditingIncome(null);
    } catch (error) {
      showToast("❌ خطا در ویرایش", "error");
    }
  };

  const handleDeleteClick = (income) => {
    setIncomeToDelete(income);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!incomeToDelete) return;
    try {
      await remove(ref(db, `users_emails/${emailKey}/incomes/${incomeToDelete.id}`));
      showToast(`✅ "${incomeToDelete.title}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف", "error");
    } finally {
      setOpenConfirmModal(false);
      setIncomeToDelete(null);
    }
  };

  // تابع پرینت با قابلیت فیلتر
  const handlePrint = (type = "all") => {
    let filteredData = [...incomes];
    let title = "📊 گزارش کلی پرداختی‌ها";
    let subtitle = "همه موارد";
    
    if (type === "deposit") {
      filteredData = incomes.filter(inc => inc.type === "deposit");
      title = "💰 گزارش واریزی‌ها";
      subtitle = "فقط واریزی‌ها";
    } else if (type === "withdrawal") {
      filteredData = incomes.filter(inc => inc.type === "withdrawal");
      title = "💵 گزارش دریافتی‌ها";
      subtitle = "فقط دریافتی‌ها";
    }
    
    const totalAmount = filteredData.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
    const depositTotal = incomes.filter(inc => inc.type === "deposit").reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
    const withdrawalTotal = incomes.filter(inc => inc.type === "withdrawal").reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
    
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Vazirmatn', 'Vazir', 'IRANSans', Tahoma, sans-serif;
            direction: rtl;
            padding: 30px;
            background: #fff;
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; }
          .header h1 { font-size: 24px; color: #1e293b; margin-bottom: 8px; }
          .header p { font-size: 12px; color: #64748b; margin-top: 5px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
          .stat-card { padding: 20px; border-radius: 16px; color: #fff; text-align: center; }
          .stat-card .amount { font-size: 24px; font-weight: bold; margin: 8px 0; }
          .stat-card .words { font-size: 11px; opacity: 0.8; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 13px; }
          th { background: #f1f5f9; font-weight: bold; color: #475569; }
          .type-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
          .type-deposit { background: #dcfce7; color: #16a34a; }
          .type-withdrawal { background: #fee2e2; color: #dc2626; }
          .footer-buttons {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .print-btn, .close-btn {
            padding: 10px 32px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            font-family: inherit;
          }
          .print-btn { background: #10b981; color: white; }
          .close-btn { background: #64748b; color: white; }
          @media print { .footer-buttons { display: none; } body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>${subtitle} - تاریخ چاپ: ${getTodayPersianDate()}</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card" style="background: linear-gradient(135deg, #10b981, #059669)">
            <div>💰 مجموع واریزی‌ها</div>
            <div class="amount">${depositTotal.toLocaleString()} تومان</div>
            <div class="words">${numberToWords(depositTotal)} تومان</div>
          </div>
          <div class="stat-card" style="background: linear-gradient(135deg, #ef4444, #dc2626)">
            <div>💵 مجموع دریافتی‌ها</div>
            <div class="amount">${withdrawalTotal.toLocaleString()} تومان</div>
            <div class="words">${numberToWords(withdrawalTotal)} تومان</div>
          </div>
          <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed)">
            <div>📊 مجموع ${type === "deposit" ? "واریزی‌ها" : type === "withdrawal" ? "دریافتی‌ها" : "کل"}</div>
            <div class="amount">${totalAmount.toLocaleString()} تومان</div>
            <div class="words">${numberToWords(totalAmount)} تومان</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>عنوان</th>
              <th>نوع</th>
              <th>مبلغ (تومان)</th>
              <th>تاریخ</th>
              <th>توضیحات</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map((inc, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${inc.title}</td>
                <td><span class="type-badge ${inc.type === 'deposit' ? 'type-deposit' : 'type-withdrawal'}">${inc.type === 'deposit' ? '💰 واریزی' : '💵 دریافتی'}</span></td>
                <td>${Number(inc.amount).toLocaleString()}</td>
                <td>${inc.date || inc.createdAtPersian || toPersianDate(inc.createdAt)}</td>
                <td>${inc.description || "-"}</td>
              </tr>
            `).join('')}
            ${filteredData.length === 0 ? '<tr><td colspan="6" style="text-align:center">هیچ داده‌ای وجود ندارد</td>' : ''}
          </tbody>
        </table>
        
        <div class="footer-buttons">
          <button class="print-btn" onclick="window.print()">🖨️ چاپ گزارش</button>
          <button class="close-btn" onclick="window.close()">✖️ بستن</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatPrice = (price) => price?.toLocaleString() || "0";

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

  // فیلتر بر اساس نوع و جستجو
  const filteredData = incomes.filter(income => {
    const matchType = filterType === "all" || income.type === filterType;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (income.title && income.title.toLowerCase().includes(searchLower)) ||
                        (income.description && income.description.toLowerCase().includes(searchLower));
    return matchType && matchSearch;
  });

  const depositTotal = incomes.filter(inc => inc.type === "deposit").reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const withdrawalTotal = incomes.filter(inc => inc.type === "withdrawal").reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const filteredDepositTotal = filteredData.filter(inc => inc.type === "deposit").reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const filteredWithdrawalTotal = filteredData.filter(inc => inc.type === "withdrawal").reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalIncomes = filteredDepositTotal + filteredWithdrawalTotal;

  const columns = [
    { name: "ردیف", selector: (row, index) => index + 1, sortable: true, width: "60px", center: true },
    { name: "عنوان", selector: (row) => row.title, sortable: true, grow: 1, cell: (row) => <span style={{ fontWeight: "bold", color: "#1e293b" }}>{row.title}</span> },
    { 
      name: "نوع", 
      selector: (row) => row.type, 
      sortable: true, 
      width: "100px", 
      cell: (row) => (
        <span style={{
          background: row.type === "deposit" ? "#dcfce7" : "#fee2e2",
          color: row.type === "deposit" ? "#16a34a" : "#dc2626",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "bold",
          display: "inline-block"
        }}>
          {row.type === "deposit" ? "💰 واریزی" : "💵 دریافتی"}
        </span>
      )
    },
    { 
      name: "مبلغ (تومان)", 
      selector: (row) => row.amount, 
      sortable: true, 
      width: "200px", 
      cell: (row) => (
        <div>
          <span style={{
            background: row.type === "deposit" ? "#dcfce7" : "#fee2e2",
            padding: "4px 10px",
            borderRadius: "16px",
            fontSize: "12px",
            fontWeight: "bold",
            color: row.type === "deposit" ? "#16a34a" : "#dc2626",
            display: "inline-block"
          }}>
            {formatPrice(row.amount)} تومان
          </span>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
            {numberToWords(row.amount)} تومان
          </div>
        </div>
      )
    },
    { name: "تاریخ", selector: (row) => row.date || row.createdAtPersian || toPersianDate(row.createdAt), sortable: true, width: "100px", cell: (row) => (<span style={{ background: "#dbeafe", padding: "4px 10px", borderRadius: "16px", fontSize: "12px", color: "#1e40af", display: "inline-block", whiteSpace: "nowrap" }}>{row.date || row.createdAtPersian || toPersianDate(row.createdAt)}</span>) },
    { name: "توضیحات", selector: (row) => row.description, sortable: true, grow: 1, cell: (row) => row.description ? (<span style={{ background: "#e0e7ff", padding: "4px 10px", borderRadius: "16px", fontSize: "12px", color: "#4338ca", display: "inline-block", whiteSpace: "nowrap" }}>📝 {row.description.length > 30 ? row.description.substring(0, 30) + "..." : row.description}</span>) : "-" },
    { name: "عملیات", width: "100px", center: true, cell: (row) => (<div className="stack-on-mobile" style={{ display: "flex", gap: "6px", justifyContent: "center" }}><button className="table-action-btn" onClick={() => handleEditClick(row)} style={{ background: "#e0e7ff", border: "none", padding: "5px 8px", borderRadius: "6px", cursor: "pointer" }} title="ویرایش">✏️</button><button className="table-action-btn" onClick={() => handleDeleteClick(row)} style={{ background: "#fee2e2", border: "none", padding: "5px 8px", borderRadius: "6px", cursor: "pointer" }} title="حذف">🗑️</button></div>) }
  ];

  const customStyles = {
    table: { style: { borderRadius: "16px", overflow: "hidden" } },
    headRow: { style: { backgroundColor: "#f1f5f9", borderBottom: "1px solid #e2e8f0" } },
    headCells: { style: { fontSize: "13px", fontWeight: "bold", color: "#475569", padding: "12px 16px" } },
    rows: { style: { fontSize: "13px", color: "#334155", borderBottom: "1px solid #e2e8f0" } },
    cells: { style: { padding: "12px 16px" } },
    pagination: { style: { borderTop: "1px solid #e2e8f0", padding: "12px 16px" } }
  };

  const inputStyle = (index, focusedIndex) => ({
    padding: "8px 10px",
    borderRadius: "8px",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    border: focusedIndex === index ? "2px solid #3b82f6" : "1px solid #d1d5db",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    marginBottom: "12px"
  });

  const labelStyle = { fontSize: "12px", color: "#64748b", marginBottom: "6px", display: "block", fontWeight: "500" };

  const loadingStyle = { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", flexDirection: "column", gap: "16px" };
  const loadingSpinner = { width: "50px", height: "50px", border: "4px solid #e2e8f0", borderTop: "4px solid #f59e0b", borderRadius: "50%", animation: "spin 1s linear infinite" };

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={loadingSpinner}></div>
        <p>در حال بارگذاری...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f1f5f9", minHeight: "80vh", borderRadius: "16px" }}>
      {toast && (
        <div style={{ position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "12px", color: "#fff", fontSize: "14px", fontWeight: "500", zIndex: 10000, backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444", animation: "slideIn 0.3s ease-out" }}>
          {toast.message}
        </div>
      )}

      {/* هدر */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" }}>← بازگشت</button>
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "bold", color: "#1e293b" }}>💰 پرداختی‌ها</h2>
        <button onClick={() => setShowAddModal(true)} style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>➕ ثبت جدید</button>
      </div>

      {/* آمار - 3 کارت */}
      <div className="responsive-grid-3" style={{ marginBottom: "30px" }}>
        <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "20px", borderRadius: "20px", color: "#fff", textAlign: "center" }}>
          <span style={{ fontSize: "32px" }}>💰</span>
          <div style={{ fontSize: "14px", marginTop: "8px", opacity: 0.9 }}>مجموع واریزی‌ها</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", marginTop: "8px" }}>{filteredDepositTotal.toLocaleString()} تومان</div>
          <div style={{ fontSize: "11px", marginTop: "8px", opacity: 0.8 }}>{numberToWords(filteredDepositTotal)} تومان</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", padding: "20px", borderRadius: "20px", color: "#fff", textAlign: "center" }}>
          <span style={{ fontSize: "32px" }}>💵</span>
          <div style={{ fontSize: "14px", marginTop: "8px", opacity: 0.9 }}>مجموع دریافتی‌ها</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", marginTop: "8px" }}>{filteredWithdrawalTotal.toLocaleString()} تومان</div>
          <div style={{ fontSize: "11px", marginTop: "8px", opacity: 0.8 }}>{numberToWords(filteredWithdrawalTotal)} تومان</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", padding: "20px", borderRadius: "20px", color: "#fff", textAlign: "center" }}>
          <span style={{ fontSize: "32px" }}>📊</span>
          <div style={{ fontSize: "14px", marginTop: "8px", opacity: 0.9 }}>مجموع کل</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", marginTop: "8px" }}>{totalIncomes.toLocaleString()} تومان</div>
          <div style={{ fontSize: "11px", marginTop: "8px", opacity: 0.8 }}>{numberToWords(totalIncomes)} تومان</div>
        </div>
      </div>

      {/* ===== جستجو اول ===== */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8" }}>🔍</span>
          <input 
            type="text" 
            placeholder="جستجو در عنوان یا توضیحات..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ 
              width: "100%", 
              padding: "10px 35px 10px 15px", 
              borderRadius: "10px", 
              border: "2px solid #e2e8f0", 
              fontSize: "13px", 
              outline: "none", 
              backgroundColor: "#383737", 
              color: "#fff",
              transition: "all 0.3s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#383737"}
            onBlur={(e) => e.target.style.borderColor = "#383737"}
          />
          {searchTerm && <button onClick={() => setSearchTerm("")} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "14px", cursor: "pointer", color: "#94a3b8" }}>✕</button>}
        </div>
      </div>

      {/* ===== فیلترها و پرینت‌ها با هم ===== */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "24px", 
        flexWrap: "wrap", 
        gap: "12px",
        padding: "12px 16px",
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #e2e8f0"
      }}>
        {/* دکمه‌های فیلتر */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            onClick={() => setFilterType("all")} 
            style={{ 
              padding: "6px 16px", 
              borderRadius: "8px", 
              border: "none", 
              background: filterType === "all" ? "#8b5cf6" : "#f1f5f9", 
              color: filterType === "all" ? "#fff" : "#64748b", 
              cursor: "pointer", 
              fontWeight: "bold",
              transition: "all 0.2s"
            }}
          >
            همه
          </button>
          <button 
            onClick={() => setFilterType("deposit")} 
            style={{ 
              padding: "6px 16px", 
              borderRadius: "8px", 
              border: "none", 
              background: filterType === "deposit" ? "#10b981" : "#f1f5f9", 
              color: filterType === "deposit" ? "#fff" : "#64748b", 
              cursor: "pointer", 
              fontWeight: "bold",
              transition: "all 0.2s"
            }}
          >
            💰 واریزی
          </button>
          <button 
            onClick={() => setFilterType("withdrawal")} 
            style={{ 
              padding: "6px 16px", 
              borderRadius: "8px", 
              border: "none", 
              background: filterType === "withdrawal" ? "#ef4444" : "#f1f5f9", 
              color: filterType === "withdrawal" ? "#fff" : "#64748b", 
              cursor: "pointer", 
              fontWeight: "bold",
              transition: "all 0.2s"
            }}
          >
            💵 دریافتی
          </button>
        </div>

        {/* دکمه‌های پرینت */}
        <div className="print-btn-desktop-only" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button 
            onClick={() => handlePrint("all")} 
            style={{ 
              background: "#8b5cf6", 
              color: "#fff", 
              border: "none", 
              padding: "6px 14px", 
              borderRadius: "8px", 
              cursor: "pointer", 
              fontWeight: "bold",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#7c3aed"}
            onMouseLeave={(e) => e.target.style.background = "#8b5cf6"}
          >
            🖨️ همه
          </button>
          <button 
            onClick={() => handlePrint("deposit")} 
            style={{ 
              background: "#10b981", 
              color: "#fff", 
              border: "none", 
              padding: "6px 14px", 
              borderRadius: "8px", 
              cursor: "pointer", 
              fontWeight: "bold",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#059669"}
            onMouseLeave={(e) => e.target.style.background = "#10b981"}
          >
            🖨️ واریزی
          </button>
          <button 
            onClick={() => handlePrint("withdrawal")} 
            style={{ 
              background: "#ef4444", 
              color: "#fff", 
              border: "none", 
              padding: "6px 14px", 
              borderRadius: "8px", 
              cursor: "pointer", 
              fontWeight: "bold",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#dc2626"}
            onMouseLeave={(e) => e.target.style.background = "#ef4444"}
          >
            🖨️ دریافتی
          </button>
        </div>
      </div>

      {/* جدول */}
      <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
        <DataTable
          columns={columns}
          data={filteredData}
          customStyles={customStyles}
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[5, 10, 25, 50]}
          responsive
          highlightOnHover
          striped
          noDataComponent={
            <div style={{ textAlign: "center", padding: "40px" }}>
              <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>💰</span>
              <p>هیچ موردی ثبت نشده است</p>
              <button onClick={() => setShowAddModal(true)} style={{ marginTop: "16px", padding: "8px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>➕ ثبت جدید</button>
            </div>
          }
        />
      </div>

      {/* مودال ثبت */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ ثبت جدید" color="#10b981" size="md">
        <IncomeForm
          onSubmit={handleAddIncome}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* مودال ویرایش */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ ویرایش" color="#f59e0b" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>📌 عنوان *</label>
          <input type="text" value={editIncome.title} onChange={(e) => setEditIncome({...editIncome, title: e.target.value})} style={inputStyle(0, null)} />
          
          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input type="text" value={editIncome.amount ? Number(editIncome.amount).toLocaleString() : ""} onChange={(e) => { let raw = e.target.value.replace(/,/g, ""); if (raw === "" || /^\d+$/.test(raw)) setEditIncome({...editIncome, amount: raw}); }} style={{...inputStyle(1, null), textAlign: "left", direction: "ltr"}} />
          {editIncome.amount && editIncome.amount !== "0" && (
            <div style={{ fontSize: "11px", color: "#10b981", marginBottom: "8px", marginTop: "-8px" }}>
              {numberToWords(Number(editIncome.amount))} تومان
            </div>
          )}
          
          <label style={labelStyle}>📂 نوع</label>
          <select value={editIncome.type} onChange={(e) => setEditIncome({...editIncome, type: e.target.value})} style={inputStyle(2, null)}>
            <option value="deposit">💰 واریزی</option>
            <option value="withdrawal">💵 دریافتی</option>
          </select>
          
          <label style={labelStyle}>📅 تاریخ (شمسی)</label>
          <input type="text" placeholder="مثال: 1404/01/15" value={editIncome.date} onChange={(e) => setEditIncome({...editIncome, date: e.target.value})} style={inputStyle(3, null)} />
          
          <label style={labelStyle}>📝 توضیحات</label>
          <textarea value={editIncome.description} onChange={(e) => setEditIncome({...editIncome, description: e.target.value})} style={{...inputStyle(4, null), minHeight: "60px", resize: "vertical"}} rows="3" />
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={handleUpdateIncome} style={{ flex: 1, padding: "10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>✏️ ویرایش</button>
          </div>
        </div>
      </Modal>

      {/* مودال حذف */}
      <Modal isOpen={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title="🗑️ تأیید حذف" color="#ef4444" size="sm">
        <div style={{ textAlign: "center", padding: "10px" }}>
          <p style={{ fontSize: "16px", marginBottom: "12px" }}>آیا از حذف <strong>"{incomeToDelete?.title}"</strong> مطمئن هستید؟</p>
          <p style={{ fontSize: "12px", color: "#ef4444", marginBottom: "20px" }}>این عمل غیرقابل بازگشت است.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button onClick={() => setOpenConfirmModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={confirmDelete} style={{ flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>🗑️ حذف</button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default IncomeList;