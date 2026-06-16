import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update, get } from "firebase/database";
import DataTable from "react-data-table-component";
import Modal from "../Modal";

const ProfitManager = ({ user, onBack }) => {
  const [profits, setProfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [profitToDelete, setProfitToDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfit, setEditingProfit] = useState(null);
  const [selectedYear, setSelectedYear] = useState(1405);
  
  const [newProfit, setNewProfit] = useState({
    title: "سود جدید",
    amount: "",
    category: "car",
    date: "",
    description: ""
  });
  
  const [editProfit, setEditProfit] = useState({
    title: "",
    amount: "",
    category: "car",
    date: "",
    description: ""
  });

  const emailKey = user?.email?.replace(/\./g, '_').replace(/@/g, '_at_') || "";

  const profitCategories = [
    { value: "car", label: "خودرو", icon: "🚗", color: "#10b981", bg: "#dcfce7" },
    { value: "transport", label: "ایاب ذهاب", icon: "🚕", color: "#3b82f6", bg: "#dbeafe" },
    { value: "other", label: "سایر", icon: "📦", color: "#64748b", bg: "#f1f5f9" },
  ];

  const persianMonths = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ];

  // ========== توابع تبدیل اعداد فارسی به لاتین ==========
  const persianToLatin = (str) => {
    if (!str) return str;
    const map = { 
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', 
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' 
    };
    return str.replace(/[۰-۹]/g, ch => map[ch]);
  };

  const normalizePersianDate = (date) => {
    if (!date) return "";
    const latinDate = persianToLatin(date);
    if (latinDate.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      return latinDate;
    }
    return "";
  };

  // ========== توابع تاریخ شمسی ==========
  const getTodayPersianDate = () => {
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    let year = '', month = '', day = '';
    for (let part of parts) {
      if (part.type === 'year') year = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
    }
    return `${persianToLatin(year)}/${persianToLatin(month)}/${persianToLatin(day)}`;
  };

  const getCurrentPersianYear = () => {
    const persianDate = getTodayPersianDate();
    return parseInt(persianDate.split('/')[0], 10);
  };

  const getCurrentPersianMonth = () => {
    const persianDate = getTodayPersianDate();
    return parseInt(persianDate.split('/')[1], 10);
  };

  const toPersianDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const formatter = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const parts = formatter.formatToParts(date);
      let year = '', month = '', day = '';
      for (let part of parts) {
        if (part.type === 'year') year = part.value;
        if (part.type === 'month') month = part.value;
        if (part.type === 'day') day = part.value;
      }
      return `${persianToLatin(year)}/${persianToLatin(month)}/${persianToLatin(day)}`;
    } catch {
      return "";
    }
  };

  const convertPersianToGregorian = (persianDate) => {
    if (!persianDate || !persianDate.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      return new Date().toISOString();
    }
    try {
      const parts = persianDate.split('/');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const gregorianDate = new Date(year - 621, month - 1, day);
      if (isNaN(gregorianDate.getTime())) {
        return new Date().toISOString();
      }
      return gregorianDate.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  };

  const getDateParts = (datePersian) => {
    if (!datePersian) return null;
    const normalized = normalizePersianDate(datePersian);
    if (!normalized) return null;
    const parts = normalized.split('/');
    if (parts.length !== 3) return null;
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10)
    };
  };

  // ========== تابع تبدیل عدد به حروف ==========
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
      if (n < 100) {
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
    const result = words.join(" و ");
    return result.replace(/\s+/g, ' ').trim();
  };

  const formatPrice = (price) => price?.toLocaleString() || "0";

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========== بارگذاری سودها ==========
  useEffect(() => {
    if (!user || !emailKey) {
      setLoading(false);
      return;
    }
    const profitsRef = ref(db, `users_emails/${emailKey}/profits`);
    const unsubscribe = onValue(profitsRef, async (snapshot) => {
      const data = snapshot.val();
      let profitsArray = [];
      if (data) {
        profitsArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value
        }));
        
        for (let profit of profitsArray) {
          if (profit.datePersian && /[۰-۹]/.test(profit.datePersian)) {
            const newDatePersian = normalizePersianDate(profit.datePersian);
            if (newDatePersian && newDatePersian !== profit.datePersian) {
              const profitRef = ref(db, `users_emails/${emailKey}/profits/${profit.id}`);
              await update(profitRef, { datePersian: newDatePersian });
              profit.datePersian = newDatePersian;
            }
          }
        }
        
        profitsArray = profitsArray.reverse();
        setProfits(profitsArray);
      } else {
        setProfits([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  // ========== توابع محاسبه سود ==========
  const getTotalProfit = () => {
    return profits.reduce((sum, profit) => sum + (Number(profit.amount) || 0), 0);
  };

  const getCurrentYearProfit = () => {
    const currentYear = getCurrentPersianYear();
    let total = 0;
    profits.forEach(profit => {
      const parts = getDateParts(profit.datePersian);
      if (parts && parts.year === currentYear) {
        total += Number(profit.amount) || 0;
      }
    });
    return total;
  };

  const getCurrentMonthProfit = () => {
    const currentYear = getCurrentPersianYear();
    const currentMonth = getCurrentPersianMonth();
    let total = 0;
    profits.forEach(profit => {
      const parts = getDateParts(profit.datePersian);
      if (parts && parts.year === currentYear && parts.month === currentMonth) {
        total += Number(profit.amount) || 0;
      }
    });
    return total;
  };

  const getCategoryTotal = (category) => {
    return profits.reduce((sum, profit) => {
      if (profit.category === category) {
        return sum + (Number(profit.amount) || 0);
      }
      return sum;
    }, 0);
  };

  const getSelectedYearProfit = () => {
    let total = 0;
    profits.forEach(profit => {
      const parts = getDateParts(profit.datePersian);
      if (parts && parts.year === selectedYear) {
        total += Number(profit.amount) || 0;
      }
    });
    return total;
  };

  const getMonthlyData = () => {
    const monthlyData = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = 0;
    }
    profits.forEach(profit => {
      const parts = getDateParts(profit.datePersian);
      if (parts && parts.year === selectedYear && parts.month >= 1 && parts.month <= 12) {
        monthlyData[parts.month] += Number(profit.amount) || 0;
      }
    });
    return monthlyData;
  };

  const getYearlyData = () => {
    const yearlyData = {};
    profits.forEach(profit => {
      const parts = getDateParts(profit.datePersian);
      if (parts && parts.year) {
        yearlyData[parts.year] = (yearlyData[parts.year] || 0) + (Number(profit.amount) || 0);
      }
    });
    return yearlyData;
  };

  const getDisplayDate = (profit) => {
    if (profit.datePersian) return normalizePersianDate(profit.datePersian);
    if (profit.date) return toPersianDate(profit.date);
    return "-";
  };

  // ========== ثبت سود جدید ==========
  const handleAddProfit = async () => {
    if (!newProfit.amount || newProfit.amount === "0") {
      showToast("❌ لطفاً مبلغ سود را وارد کنید", "error");
      return;
    }

    try {
      const profitsRef = ref(db, `users_emails/${emailKey}/profits`);
      const todayPersianDate = getTodayPersianDate();
      
      let profitDate = new Date().toISOString();
      let profitDatePersian = todayPersianDate;
      
      if (newProfit.date && newProfit.date.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
        const normalizedDate = normalizePersianDate(newProfit.date);
        profitDate = convertPersianToGregorian(normalizedDate);
        profitDatePersian = normalizedDate;
      }
      
      await push(profitsRef, {
        title: "سود جدید",
        amount: Number(newProfit.amount),
        category: newProfit.category,
        categoryLabel: profitCategories.find(c => c.value === newProfit.category)?.label,
        categoryIcon: profitCategories.find(c => c.value === newProfit.category)?.icon,
        date: profitDate,
        datePersian: profitDatePersian,
        description: newProfit.description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: todayPersianDate
      });
      
      showToast(`✅ سود جدید با مبلغ ${Number(newProfit.amount).toLocaleString()} تومان ثبت شد`, "success");
      setShowAddModal(false);
      setNewProfit({
        title: "سود جدید",
        amount: "",
        category: "car",
        date: "",
        description: ""
      });
    } catch (error) {
      console.error("Error adding profit:", error);
      showToast("❌ خطا در ثبت سود", "error");
    }
  };

  const handleEditClick = (profit) => {
    setEditingProfit(profit);
    setEditProfit({
      title: profit.title,
      amount: profit.amount.toString(),
      category: profit.category,
      date: normalizePersianDate(profit.datePersian) || "",
      description: profit.description || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateProfit = async () => {
    if (!editProfit.title.trim()) {
      showToast("❌ لطفاً عنوان سود را وارد کنید", "error");
      return;
    }
    if (!editProfit.amount || editProfit.amount === "0") {
      showToast("❌ لطفاً مبلغ سود را وارد کنید", "error");
      return;
    }

    try {
      let profitDate = editingProfit.date;
      let profitDatePersian = editProfit.date;
      
      if (editProfit.date && editProfit.date.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
        const normalizedDate = normalizePersianDate(editProfit.date);
        profitDate = convertPersianToGregorian(normalizedDate);
        profitDatePersian = normalizedDate;
      } else if (!editProfit.date) {
        profitDatePersian = getTodayPersianDate();
        profitDate = new Date().toISOString();
      }
      
      const profitRef = ref(db, `users_emails/${emailKey}/profits/${editingProfit.id}`);
      await update(profitRef, {
        title: editProfit.title.trim(),
        amount: Number(editProfit.amount),
        category: editProfit.category,
        categoryLabel: profitCategories.find(c => c.value === editProfit.category)?.label,
        categoryIcon: profitCategories.find(c => c.value === editProfit.category)?.icon,
        date: profitDate,
        datePersian: profitDatePersian,
        description: editProfit.description.trim() || "",
        updatedAt: new Date().toISOString()
      });
      
      showToast(`✅ سود "${editProfit.title}" با موفقیت ویرایش شد`, "success");
      setShowEditModal(false);
      setEditingProfit(null);
    } catch (error) {
      console.error("Error updating profit:", error);
      showToast("❌ خطا در ویرایش سود", "error");
    }
  };

  const handleDeleteClick = (profit) => {
    setProfitToDelete(profit);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!profitToDelete) return;
    try {
      await remove(ref(db, `users_emails/${emailKey}/profits/${profitToDelete.id}`));
      showToast(`✅ سود "${profitToDelete.title}" با موفقیت حذف شد`, "success");
    } catch (error) {
      console.error("Error deleting profit:", error);
      showToast("❌ خطا در حذف سود", "error");
    } finally {
      setOpenConfirmModal(false);
      setProfitToDelete(null);
    }
  };

  // ========== توابع خروجی ==========
  const getTodayPersianDateForPrint = getTodayPersianDate;

 // تابع خروجی ماهانه
const handleMonthlyExport = (year, monthIndex) => {
  const monthName = persianMonths[monthIndex - 1];
  const monthProfits = profits.filter(profit => {
    const parts = getDateParts(profit.datePersian);
    return parts && parts.year === year && parts.month === monthIndex;
  });
  
  const total = monthProfits.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const carTotal = monthProfits.filter(p => p.category === "car").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const transportTotal = monthProfits.filter(p => p.category === "transport").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const otherTotal = monthProfits.filter(p => p.category === "other").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const transactionCount = monthProfits.length;
  const averageProfit = transactionCount > 0 ? Math.round(total / transactionCount) : 0;
  
  // پیدا کردن بیشترین دسته
  const categoryTotals = [
    { name: "خودرو", icon: "🚗", amount: carTotal },
    { name: "ایاب ذهاب", icon: "🚕", amount: transportTotal },
    { name: "سایر", icon: "📦", amount: otherTotal }
  ];
  const bestCategory = categoryTotals.reduce((a, b) => a.amount > b.amount ? a : b);
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>گزارش ماه ${monthName} سال ${year}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap');
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Vazirmatn', 'Vazir', 'IRANSans', Tahoma, sans-serif;
          direction: rtl;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          min-height: 100vh;
          padding: 30px;
        }
        .report-container {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
          padding: 0 0 20px 0;
        }
        
        /* ===== هدر ===== */
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px 35px;
          text-align: center;
        }
        .header h1 { 
          font-size: 24px; 
          font-weight: 900; 
          margin-bottom: 6px; 
          letter-spacing: 1px;
        }
        .header p { 
          opacity: 0.9; 
          font-size: 13px; 
        }
        
        .content { 
          padding: 25px 30px; 
        }
        
        /* ===== باکس کل سود ===== */
        .total-box {
          background: linear-gradient(135deg, #10b981, #059669);
          padding: 25px 30px;
          border-radius: 20px;
          text-align: center;
          color: white;
          margin-bottom: 25px;
          box-shadow: 0 10px 25px -5px rgba(16,185,129,0.3);
        }
        .total-box .label { 
          font-size: 15px; 
          opacity: 0.95; 
        }
        .total-box .amount { 
          font-size: 38px; 
          font-weight: 900; 
          margin: 8px 0; 
        }
        .total-box .words { 
          font-size: 13px; 
          opacity: 0.9; 
        }
        
        /* ===== باکس‌های آماری ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 25px;
        }
        .stat-box {
          padding: 18px 14px;
          border-radius: 14px;
          text-align: center;
          color: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.12);
        }
        .stat-box .icon { font-size: 28px; margin-bottom: 6px; }
        .stat-box .label { font-size: 11px; opacity: 0.9; }
        .stat-box .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
        .stat-box .sub { font-size: 10px; opacity: 0.8; margin-top: 3px; }
        
        .stat-box.best-cat { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .stat-box.count { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .stat-box.avg { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
        .stat-box.total { background: linear-gradient(135deg, #ec4899, #db2777); }
        
        /* ===== باکس‌های دسته‌بندی ===== */
        .category-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 25px;
        }
        .category-card {
          padding: 20px;
          border-radius: 16px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }
        .category-card .icon { font-size: 36px; margin-bottom: 8px; }
        .category-card .label { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .category-card .amount { font-size: 20px; font-weight: 800; }
        .category-card .words { font-size: 11px; color: #64748b; margin-top: 6px; }
        .category-card .count { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        
        /* ===== جدول ===== */
        .table-section {
          background: #f8fafc;
          padding: 20px 24px;
          border-radius: 16px;
        }
        .table-section .title {
          font-size: 18px;
          font-weight: 700;
          padding-right: 14px;
          margin-bottom: 16px;
          color: #1e293b;
      
        }
        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        table { 
          width: 100%; 
          border-collapse: collapse;
          font-size: 13px;
        }
        thead {
          background: linear-gradient(135deg, #1e293b, #0f172a);
        }
        th { 
          padding: 14px 18px; 
          text-align: center; 
          color: #fff; 
          font-weight: 700; 
          font-size: 13px;
          white-space: nowrap;
          border-bottom: 2px solid #334155;
        }
        th:not(:last-child) {
          border-left: 1px solid #334155;
        }
        td { 
          padding: 12px 16px; 
          text-align: center; 
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
          transition: background 0.2s;
        }
        tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        tbody tr:nth-child(odd) {
          background: #ffffff;
        }
        tbody tr:hover {
          background: #fef3c7 !important;
        }
        
        .row-number {
          font-weight: 700;
          color: #94a3b8;
          font-size: 13px;
        }
        .row-title {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
        }
        .row-category {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .row-category.car { background: #dcfce7; color: #16a34a; }
        .row-category.transport { background: #dbeafe; color: #2563eb; }
        .row-category.other { background: #f1f5f9; color: #64748b; }
        
        .row-amount {
          font-weight: 700;
          color: #0f172a;
          font-size: 15px;
        }
        .row-amount .words {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 400;
          display: block;
          margin-top: 3px;
        }
        
        .row-date {
          font-size: 12px;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 14px;
          border-radius: 20px;
          display: inline-block;
        }
        
        .table-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
          padding: 8px 4px;
          font-size: 13px;
          color: #64748b;
          flex-wrap: wrap;
          gap: 8px;
        }
        .table-footer .count {
          font-weight: 700;
          color: #1e293b;
          font-size: 16px;
        }
        
        /* ===== دکمه‌ها ===== */
        .footer-buttons {
          display: flex;
          justify-content: center;
          gap: 14px;
          padding: 20px 25px;
          background: #f1f5f9;
          border-top: 1px solid #e2e8f0;
          margin-top: 20px;
        }
        .print-btn, .close-btn {
          padding: 10px 32px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }
        .print-btn { 
          background: linear-gradient(135deg, #f59e0b, #d97706); 
          color: white; 
          box-shadow: 0 4px 15px rgba(245,158,11,0.3);
        }
        .print-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,158,11,0.4); }
        .close-btn { background: #64748b; color: white; }
        .close-btn:hover { background: #475569; }
        
        /* ===== پرینت ===== */
        @media print { 
          body { background: white !important; padding: 10px !important; } 
          .footer-buttons { display: none !important; } 
          .report-container { box-shadow: none !important; border-radius: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
        
        /* ===== ریسپانسیو ===== */
        @media (max-width: 768px) {
          body { padding: 15px; }
          .content { padding: 18px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .category-grid { grid-template-columns: 1fr; gap: 10px; }
          .header h1 { font-size: 18px; }
          .header { padding: 18px 20px; }
          .total-box .amount { font-size: 28px; }
          .total-box { padding: 18px 20px; }
          .table-section { padding: 14px 16px; }
          th, td { padding: 8px 10px; font-size: 11px; }
          .footer-buttons { flex-direction: column; align-items: center; }
          .print-btn, .close-btn { width: 100%; text-align: center; }
        }
        @media (max-width: 500px) {
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .stat-box { padding: 12px 8px; }
          .stat-box .value { font-size: 14px; }
          .stat-box .icon { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <!-- ===== هدر ===== -->
        <div class="header">
          <h1>📊 گزارش دقیق ماه ${monthName} ${year}</h1>
          <p>تاریخ چاپ: ${getTodayPersianDateForPrint()}</p>
        </div>
        
        <div class="content">
          <!-- ===== باکس کل سود ===== -->
          <div class="total-box">
            <div class="label">💰 مجموع سود ماه ${monthName}</div>
            <div class="amount">${total.toLocaleString()} تومان</div>
            <div class="words">${numberToWords(total)} تومان</div>
          </div>
          
          <!-- ===== باکس‌های آماری ===== -->
          <div class="stats-grid">
            <div class="stat-box best-cat">
              <div class="icon">🏆</div>
              <div class="label">دسته برتر</div>
              <div class="value">${bestCategory.icon} ${bestCategory.name}</div>
              <div class="sub">${formatPrice(bestCategory.amount)} تومان</div>
            </div>
            <div class="stat-box count">
              <div class="icon">📊</div>
              <div class="label">تعداد تراکنش‌ها</div>
              <div class="value">${transactionCount}</div>
              <div class="sub">${transactionCount > 0 ? 'تراکنش ثبت شده' : 'بدون تراکنش'}</div>
            </div>
            <div class="stat-box avg">
              <div class="icon">📈</div>
              <div class="label">میانگین هر تراکنش</div>
              <div class="value">${averageProfit.toLocaleString()} تومان</div>
              <div class="sub">${numberToWords(averageProfit)} تومان</div>
            </div>
            <div class="stat-box total">
              <div class="icon">💵</div>
              <div class="label">مجموع سود</div>
              <div class="value">${total.toLocaleString()} تومان</div>
              <div class="sub">${numberToWords(total)} تومان</div>
            </div>
          </div>
          
          <!-- ===== باکس‌های دسته‌بندی ===== -->
          <div class="category-grid">
            <div class="category-card" style="background: #dcfce7;">
              <div class="icon">🚗</div>
              <div class="label" style="color: #10b981;">خودرو</div>
              <div class="amount" style="color: #10b981;">${carTotal.toLocaleString()} تومان</div>
              <div class="words">${numberToWords(carTotal)} تومان</div>
              <div class="count">${monthProfits.filter(p => p.category === "car").length} تراکنش</div>
            </div>
            <div class="category-card" style="background: #dbeafe;">
              <div class="icon">🚕</div>
              <div class="label" style="color: #3b82f6;">ایاب ذهاب</div>
              <div class="amount" style="color: #3b82f6;">${transportTotal.toLocaleString()} تومان</div>
              <div class="words">${numberToWords(transportTotal)} تومان</div>
              <div class="count">${monthProfits.filter(p => p.category === "transport").length} تراکنش</div>
            </div>
            <div class="category-card" style="background: #f1f5f9;">
              <div class="icon">📦</div>
              <div class="label" style="color: #64748b;">سایر</div>
              <div class="amount" style="color: #64748b;">${otherTotal.toLocaleString()} تومان</div>
              <div class="words">${numberToWords(otherTotal)} تومان</div>
              <div class="count">${monthProfits.filter(p => p.category === "other").length} تراکنش</div>
            </div>
          </div>
          
          <!-- ===== جدول ===== -->
          <div class="table-section">
            <div class="title">📋 لیست کامل سودهای ماه ${monthName}</div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>عنوان سود</th>
                    <th>دسته‌بندی</th>
                    <th>مبلغ (تومان)</th>
                    <th>تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  ${monthProfits.map((p, i) => {
                    const catClass = p.category === "car" ? "car" : p.category === "transport" ? "transport" : "other";
                    return `
                      <tr>
                        <td><span class="row-number">${i+1}</span></td>
                        <td><span class="row-title">${p.title}</span></td>
                        <td><span class="row-category ${catClass}">${p.categoryLabel}</span></td>
                        <td>
                          <span class="row-amount">${Number(p.amount).toLocaleString()} تومان</span>
                          <span class="words">${numberToWords(p.amount)} تومان</span>
                        </td>
                        <td><span class="row-date">${normalizePersianDate(p.datePersian)}</span></td>
                      </tr>
                    `;
                  }).join('')}
                  ${monthProfits.length === 0 ? `
                    <tr>
                      <td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">
                        <span style="font-size:48px; display:block; margin-bottom:12px;">📭</span>
                        هیچ سودی در این ماه ثبت نشده است
                      </td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
            <div class="table-footer">
              <span>تعداد کل: <span class="count">${monthProfits.length}</span> تراکنش</span>
              <span>مجموع سود: <span class="count">${total.toLocaleString()}</span> تومان</span>
            </div>
          </div>
        </div>
        
        <!-- ===== دکمه‌ها ===== -->
        <div class="footer-buttons">
          <button class="print-btn" onclick="window.print()">🖨️ چاپ این گزارش</button>
          <button class="close-btn" onclick="window.close()">✖️ بستن</button>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};

  // تابع خروجی سالانه
  const handleYearlyExport = (year) => {
    const yearProfits = profits.filter(profit => {
      const parts = getDateParts(profit.datePersian);
      return parts && parts.year === year;
    });

    const total = yearProfits.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const transactionCount = yearProfits.length;
    const averageProfit = transactionCount > 0 ? Math.round(total / transactionCount) : 0;

    const monthlyStats = {};
    for (let i = 1; i <= 12; i++) monthlyStats[i] = 0;
    
    const monthlyProfits = {};
    for (let i = 1; i <= 12; i++) monthlyProfits[i] = [];
    
    yearProfits.forEach(p => {
      const parts = getDateParts(p.datePersian);
      if (parts && parts.month) {
        monthlyStats[parts.month] += Number(p.amount) || 0;
        monthlyProfits[parts.month].push(p);
      }
    });

    let bestMonthIndex = 1, worstMonthIndex = 1;
    for (let i = 1; i <= 12; i++) {
      if (monthlyStats[i] > monthlyStats[bestMonthIndex]) bestMonthIndex = i;
      if (monthlyStats[i] < monthlyStats[worstMonthIndex]) worstMonthIndex = i;
    }

    const carTotal = yearProfits.filter(p => p.category === "car").reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const transportTotal = yearProfits.filter(p => p.category === "transport").reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const otherTotal = yearProfits.filter(p => p.category === "other").reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const categoryTotals = [
      { name: "خودرو", icon: "🚗", amount: carTotal },
      { name: "ایاب ذهاب", icon: "🚕", amount: transportTotal },
      { name: "سایر", icon: "📦", amount: otherTotal }
    ];
    const bestCategory = categoryTotals.reduce((a, b) => a.amount > b.amount ? a : b);

    const maxMonthlyAmount = Math.max(...Object.values(monthlyStats), 1);

    // ===== آرایه رنگ‌های معمولی و شاداب =====
    const monthColors = [
      { bg: "#6C63FF", text: "#fff" },
      { bg: "#FF6B6B", text: "#fff" },
      { bg: "#4ECDC4", text: "#fff" },
      { bg: "#45B7D1", text: "#fff" },
      { bg: "#96CEB4", text: "#1e293b" },
      { bg: "#FFEAA7", text: "#1e293b" },
      { bg: "#DDA0DD", text: "#1e293b" },
      { bg: "#98D8C8", text: "#1e293b" },
      { bg: "#F7DC6F", text: "#1e293b" },
      { bg: "#BB8FCE", text: "#fff" },
      { bg: "#85C1E9", text: "#fff" },
      { bg: "#F8C471", text: "#1e293b" }
    ];

    // ساخت آرایه از داده‌های ماه‌ها
    const monthDataArray = persianMonths.map((monthName, index) => {
      const monthNum = index + 1;
      const amount = monthlyStats[monthNum] || 0;
      const percent = maxMonthlyAmount > 0 ? (amount / maxMonthlyAmount) * 100 : 0;
      const profitsOfMonth = monthlyProfits[monthNum] || [];
      const hasData = profitsOfMonth.length > 0;
      const color = monthColors[index];
      return { 
        monthNum, 
        monthName, 
        amount, 
        percent, 
        hasData, 
        count: profitsOfMonth.length,
        color: color,
        isBest: monthNum === bestMonthIndex,
        isWorst: monthNum === worstMonthIndex
      };
    });

    // ===== صفحه اصلی گزارش سالانه =====
    const printWindow = window.open("", "_blank");
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>گزارش سال ${year}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Vazirmatn', 'Vazir', 'IRANSans', Tahoma, sans-serif;
            direction: rtl;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            padding: 30px;
          }
          .report-container {
            max-width: 1100px;
            margin: 0 auto;
            background: white;
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
            padding: 0 0 20px 0;
          }
          .header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 20px 30px;
            text-align: center;
          }
          .header h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
          .header p { opacity: 0.8; font-size: 12px; }
          .content { padding: 20px 25px; }
          
          .total-box {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            margin: 0 0 20px 0;
            padding: 16px 20px;
            border-radius: 16px;
            text-align: center;
            color: white;
            box-shadow: 0 8px 20px -5px rgba(245,158,11,0.3);
          }
          .total-box .label { font-size: 13px; opacity: 0.95; }
          .total-box .amount { font-size: 24px; font-weight: 900; margin: 4px 0; }
          .total-box .words { font-size: 11px; opacity: 0.9; }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .stat-box {
            padding: 16px 12px;
            border-radius: 14px;
            text-align: center;
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .stat-box .icon { font-size: 26px; margin-bottom: 4px; }
          .stat-box .label { font-size: 10px; opacity: 0.9; }
          .stat-box .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
          .stat-box .sub { font-size: 9px; opacity: 0.8; margin-top: 3px; }
          .stat-box .hint { font-size: 8px; opacity: 0.7; margin-top: 2px; }

          .stat-box.best-month { background: linear-gradient(135deg, #f59e0b, #d97706); }
          .stat-box.worst-month { background: linear-gradient(135deg, #ef4444, #dc2626); }
          .stat-box.avg { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
          .stat-box.category { background: linear-gradient(135deg, #ec4899, #db2777); }

          .category-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
            margin-bottom: 20px;
          }
          .category-card {
            padding: 18px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          }
          .category-card .icon { font-size: 32px; margin-bottom: 6px; }
          .category-card .label { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
          .category-card .amount { font-size: 18px; font-weight: 700; }
          .category-card .words { font-size: 10px; color: #64748b; margin-top: 6px; }

          .months-section {
            padding: 18px 20px;
            border-radius: 16px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          }
          .months-section .title {
            font-size: 16px;
            font-weight: 700;
            padding-right: 12px;
            margin-bottom: 16px;
            color: #1e293b;
       
          }
          .months-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .month-card {
            border-radius: 16px;
            padding: 18px 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.12);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          .month-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 35px rgba(0,0,0,0.2);
          }
          .month-card .month-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
          }
          .month-card .month-name {
            font-weight: 700;
            font-size: 15px;
            color: rgba(255,255,255,0.95);
          }
          .month-card .month-amount {
            font-weight: 900;
            font-size: 18px;
            color: rgba(255,255,255,0.95);
          }
          .month-card .month-bar {
            background: rgba(255,255,255,0.25);
            border-radius: 10px;
            height: 6px;
            overflow: hidden;
            margin: 8px 0;
            position: relative;
            z-index: 1;
          }
          .month-card .month-bar-inner {
            height: 100%;
            border-radius: 10px;
            background: rgba(255,255,255,0.8);
            transition: width 0.8s ease;
          }
          .month-card .month-words {
            font-size: 10px;
            opacity: 0.85;
            margin-top: 4px;
            position: relative;
            z-index: 1;
          }
          .month-card .month-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            position: relative;
            z-index: 1;
          }
          .month-card .month-count {
            font-size: 10px;
            opacity: 0.8;
            background: rgba(255,255,255,0.15);
            padding: 2px 10px;
            border-radius: 20px;
          }
          .month-card .badge {
            font-size: 9px;
            background: rgba(255,255,255,0.2);
            padding: 2px 10px;
            border-radius: 20px;
            font-weight: 600;
          }
          .month-card .badge.best {
            background: rgba(255,215,0,0.4);
            color: #fff;
          }
          .month-card .badge.worst {
            background: rgba(255,0,0,0.3);
            color: #fff;
          }

          .table-section {
            background: #f8fafc;
            padding: 20px 24px;
            border-radius: 16px;
          }
          .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .table-header h3 {
            font-size: 16px;
            font-weight: 700;
            padding-right: 12px;
            color: #1e293b;
         
          }
          .search-box {
            display: flex;
            align-items: center;
            gap: 8px;
            background: white;
            border-radius: 10px;
            padding: 4px 12px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s;
          }
          .search-box:focus-within {
            border-color: #8b5cf6;
            box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
          }
          .search-box input {
            border: none;
            padding: 8px 4px;
            font-size: 13px;
            outline: none;
            background: transparent;
            color: #1e293b;
            font-family: inherit;
            width: 200px;
          }
          .search-box input::placeholder {
            color: #94a3b8;
          }
          .search-box .icon {
            font-size: 16px;
            color: #94a3b8;
          }
          .search-box .clear-btn {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: #94a3b8;
            display: none;
            padding: 0 4px;
          }
          .search-box .clear-btn.show {
            display: block;
          }
          .search-box .clear-btn:hover {
            color: #ef4444;
          }

          .table-wrapper {
            overflow-x: auto;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
            font-size: 13px;
          }
          thead {
            background: linear-gradient(135deg, #1e293b, #0f172a);
          }
          th { 
            padding: 14px 16px; 
            text-align: center; 
            color: #fff; 
            font-weight: 700; 
            font-size: 12px;
            white-space: nowrap;
            border-bottom: 2px solid #334155;
          }
          th:not(:last-child) {
            border-left: 1px solid #334155;
          }
          td { 
            padding: 12px 16px; 
            text-align: center; 
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            transition: background 0.2s;
          }
          tbody tr:hover {
            background: #fef3c7 !important;
          }
          tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          tbody tr:nth-child(odd) {
            background: #ffffff;
          }
          tbody tr.hidden {
            display: none;
          }

          .row-number {
            font-weight: 700;
            color: #94a3b8;
            font-size: 12px;
          }
          .row-title {
            font-weight: 600;
            color: #1e293b;
          }
          .row-category {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
          }
          .row-category.car { background: #dcfce7; color: #16a34a; }
          .row-category.transport { background: #dbeafe; color: #2563eb; }
          .row-category.other { background: #f1f5f9; color: #64748b; }

          .row-amount {
            font-weight: 700;
            color: #0f172a;
          }
          .row-amount .words {
            font-size: 9px;
            color: #94a3b8;
            font-weight: 400;
            display: block;
            margin-top: 2px;
          }

          .row-date {
            font-size: 12px;
            color: #64748b;
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-block;
          }

          .no-results {
            text-align: center;
            padding: 40px 20px;
            color: #94a3b8;
            display: none;
          }
          .no-results.show {
            display: block;
          }
          .no-results .icon {
            font-size: 48px;
            display: block;
            margin-bottom: 12px;
          }

          .table-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
            padding: 8px 4px;
            font-size: 12px;
            color: #64748b;
            flex-wrap: wrap;
            gap: 8px;
          }
          .table-footer .count {
            font-weight: 600;
            color: #1e293b;
          }

          .footer-buttons {
            display: flex;
            justify-content: center;
            gap: 14px;
            padding: 18px 25px;
            background: #f1f5f9;
            border-top: 1px solid #e2e8f0;
            margin-top: 18px;
          }
          .print-btn, .close-btn {
            padding: 10px 28px;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
          }
          .print-btn { 
            background: linear-gradient(135deg, #f59e0b, #d97706); 
            color: white; 
            box-shadow: 0 4px 12px rgba(245,158,11,0.3);
          }
          .print-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(245,158,11,0.4); }
          .close-btn { background: #64748b; color: white; }
          .close-btn:hover { background: #475569; }

          @media print { 
            body { background: white !important; padding: 10px !important; } 
            .footer-buttons { display: none !important; } 
            .search-box { display: none !important; }
            .report-container { box-shadow: none !important; border-radius: 0 !important; }
            .month-card:hover { transform: none !important; }
            .table-section { background: #f8fafc !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          }
          
          @media (max-width: 768px) {
            body { padding: 15px; }
            .content { padding: 15px; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .category-grid { grid-template-columns: 1fr; gap: 10px; }
            .months-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
            .header h1 { font-size: 16px; }
            .total-box .amount { font-size: 20px; }
            .table-header { flex-direction: column; align-items: stretch; }
            .search-box input { width: 100%; }
            .table-footer { flex-direction: column; text-align: center; }
            .footer-buttons { flex-direction: column; align-items: center; }
            .print-btn, .close-btn { width: 100%; text-align: center; }
          }
          @media (max-width: 500px) {
            .stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
            .months-grid { grid-template-columns: 1fr; gap: 10px; }
            .stat-box { padding: 12px 8px; }
            .stat-box .value { font-size: 14px; }
            .stat-box .icon { font-size: 20px; }
            .month-card { padding: 14px 16px; }
            .month-card .month-amount { font-size: 15px; }
            th, td { padding: 8px 10px; font-size: 11px; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>📊 گزارش مالی سال ${year}</h1>
            <p>تاریخ چاپ: ${getTodayPersianDateForPrint()}</p>
          </div>
          <div class="content">
            <div class="total-box">
              <div class="label">💰 سود کل سال ${year}</div>
              <div class="amount">${total.toLocaleString()} تومان</div>
              <div class="words">${numberToWords(total)} تومان</div>
            </div>

            <div class="stats-grid">
              <div class="stat-box best-month">
                <div class="icon">🏆</div>
                <div class="label">بهترین ماه</div>
                <div class="value">${persianMonths[bestMonthIndex - 1]}</div>
                <div class="sub">${formatPrice(monthlyStats[bestMonthIndex])} تومان</div>
              </div>
              <div class="stat-box worst-month">
                <div class="icon">📉</div>
                <div class="label">ضعیف‌ترین ماه</div>
                <div class="value">${persianMonths[worstMonthIndex - 1]}</div>
                <div class="sub">${formatPrice(monthlyStats[worstMonthIndex])} تومان</div>
              </div>
              <div class="stat-box avg">
                <div class="icon">📈</div>
                <div class="label">میانگین هر تراکنش</div>
                <div class="value">${averageProfit.toLocaleString()} تومان</div>
                <div class="sub">${numberToWords(averageProfit)} تومان</div>
                <div class="hint">ⓘ مجموع سود ÷ تعداد تراکنش‌ها</div>
              </div>
              <div class="stat-box category">
                <div class="icon">🏅</div>
                <div class="label">دسته برتر سال</div>
                <div class="value">${bestCategory.icon} ${bestCategory.name}</div>
                <div class="sub">${formatPrice(bestCategory.amount)} تومان</div>
              </div>
            </div>

            <div class="category-grid">
              <div class="category-card" style="background: #dcfce7;">
                <div class="icon">🚗</div>
                <div class="label" style="color: #10b981;">خودرو</div>
                <div class="amount" style="color: #10b981;">${carTotal.toLocaleString()} تومان</div>
                <div class="words">${numberToWords(carTotal)} تومان</div>
              </div>
              <div class="category-card" style="background: #dbeafe;">
                <div class="icon">🚕</div>
                <div class="label" style="color: #3b82f6;">ایاب ذهاب</div>
                <div class="amount" style="color: #3b82f6;">${transportTotal.toLocaleString()} تومان</div>
                <div class="words">${numberToWords(transportTotal)} تومان</div>
              </div>
              <div class="category-card" style="background: #f1f5f9;">
                <div class="icon">📦</div>
                <div class="label" style="color: #64748b;">سایر</div>
                <div class="amount" style="color: #64748b;">${otherTotal.toLocaleString()} تومان</div>
                <div class="words">${numberToWords(otherTotal)} تومان</div>
              </div>
            </div>

            <div class="months-section">
              <div class="title">📅 گزارش ماه‌های سال ${year}</div>
              <div class="months-grid">
                ${monthDataArray.map((data, index) => `
                  <div class="month-card" style="background: ${data.color.bg}; color: ${data.color.text};">
                    <div class="month-header">
                      <span class="month-name" style="color: ${data.color.text};">${data.monthName}</span>
                      <span class="month-amount" style="color: ${data.color.text};">${formatPrice(data.amount)} تومان</span>
                    </div>
                    <div class="month-bar" style="background: rgba(255,255,255,0.3);">
                      <div class="month-bar-inner" style="width: ${data.percent}%; background: rgba(255,255,255,0.7);"></div>
                    </div>
                    <div class="month-words" style="color: ${data.color.text}; opacity: 0.8;">${numberToWords(data.amount)} تومان</div>
                    <div class="month-footer">
                      <span class="month-count" style="color: ${data.color.text};">${data.hasData ? data.count + ' تراکنش' : 'بدون تراکنش'}</span>
                      ${data.isBest ? '<span class="badge best">🏆 بهترین ماه</span>' : ''}
                      ${data.isWorst && !data.isBest ? '<span class="badge worst">📉 ضعیف‌ترین</span>' : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="table-section">
              <div class="table-header">
                <h3>📋 لیست کامل سودهای سال ${year}</h3>
                <div class="search-box">
                  <span class="icon">🔍</span>
                  <input 
                    type="text" 
                    id="tableSearch" 
                    placeholder="جستجو در عنوان، دسته یا مبلغ..."
                    onkeyup="filterTable()"
                  />
                  <button class="clear-btn" id="clearBtn" onclick="clearSearch()">✕</button>
                </div>
              </div>
              <div class="table-wrapper">
                <table id="profitTable">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>عنوان سود</th>
                      <th>دسته‌بندی</th>
                      <th>مبلغ (تومان)</th>
                      <th>تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${yearProfits.map((p, i) => {
                      const catClass = p.category === "car" ? "car" : p.category === "transport" ? "transport" : "other";
                      const catLabel = p.categoryLabel || p.category;
                      return `
                        <tr data-search="${p.title} ${catLabel} ${Number(p.amount).toLocaleString()} ${normalizePersianDate(p.datePersian)}">
                          <td><span class="row-number">${i+1}</span></td>
                          <td><span class="row-title">${p.title}</span></td>
                          <td><span class="row-category ${catClass}">${catLabel}</span></td>
                          <td>
                            <span class="row-amount">${Number(p.amount).toLocaleString()} تومان</span>
                            <span class="words">${numberToWords(p.amount)} تومان</span>
                          </td>
                          <td><span class="row-date">${normalizePersianDate(p.datePersian)}</span></td>
                        </tr>
                      `;
                    }).join('')}
                    ${yearProfits.length === 0 ? `
                      <tr>
                        <td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">
                          <span style="font-size:40px; display:block; margin-bottom:10px;">📭</span>
                          هیچ سودی ثبت نشده است
                        </td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
              <div class="no-results" id="noResults">
                <span class="icon">🔍</span>
                <span>نتیجه‌ای برای جستجوی شما یافت نشد</span>
              </div>
              <div class="table-footer">
                <span>تعداد کل: <span class="count" id="totalCount">${yearProfits.length}</span> تراکنش</span>
                <span>نتیجه جستجو: <span class="count" id="resultCount">${yearProfits.length}</span> تراکنش</span>
              </div>
            </div>
          </div>
          <div class="footer-buttons">
            <button class="print-btn" onclick="window.print()">🖨️ چاپ گزارش</button>
            <button class="close-btn" onclick="window.close()">✖️ بستن</button>
          </div>
        </div>

        <script>
          function filterTable() {
            const input = document.getElementById('tableSearch');
            const filter = input.value.toLowerCase().trim();
            const table = document.getElementById('profitTable');
            const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
            const clearBtn = document.getElementById('clearBtn');
            const noResults = document.getElementById('noResults');
            let visibleCount = 0;
            let totalCount = rows.length;

            if (filter.length > 0) {
              clearBtn.classList.add('show');
            } else {
              clearBtn.classList.remove('show');
            }

            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const searchData = row.getAttribute('data-search') || '';
              
              if (searchData.toLowerCase().includes(filter)) {
                row.classList.remove('hidden');
                visibleCount++;
              } else {
                row.classList.add('hidden');
              }
            }

            if (visibleCount === 0 && totalCount > 0) {
              noResults.classList.add('show');
            } else {
              noResults.classList.remove('show');
            }

            document.getElementById('resultCount').textContent = visibleCount;
          }

          function clearSearch() {
            document.getElementById('tableSearch').value = '';
            document.getElementById('clearBtn').classList.remove('show');
            filterTable();
          }

          document.getElementById('tableSearch').addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
              filterTable();
            }
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // تابع پرینت کلی
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>گزارش سود و درآمد</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Vazirmatn', 'Vazir', 'IRANSans', Tahoma, sans-serif;
            direction: rtl;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px;
          }
          .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 32px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          }
          .header { 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            padding: 30px 40px; 
            text-align: center; 
            color: white;
          }
          .header h1 { font-size: 24px; margin-bottom: 8px; font-weight: 900; }
          .header p { font-size: 13px; opacity: 0.9; }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 20px; 
            margin: 30px; 
          }
          .stat-card { 
            padding: 25px; 
            border-radius: 20px; 
            color: white; 
            text-align: center;
          }
          .stat-card .icon { font-size: 40px; margin-bottom: 10px; }
          .stat-card .amount { font-size: 28px; font-weight: 700; margin: 10px 0; }
          .stat-card .label { font-size: 13px; opacity: 0.9; }
          .stat-card .words { font-size: 10px; opacity: 0.8; margin-top: 8px; }
          .category-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin: 30px; 
          }
          .category-card { 
            padding: 20px; 
            border-radius: 20px; 
            text-align: center;
          }
          .category-card .icon { font-size: 40px; margin-bottom: 10px; }
          .category-card .label { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          .category-card .amount { font-size: 22px; font-weight: 700; }
          .category-card .words { font-size: 10px; color: #64748b; margin-top: 8px; }
          .stats-section { 
            background: #f8fafc; 
            margin: 30px; 
            padding: 25px; 
            border-radius: 20px; 
          }
          .stats-section h3 { 
            font-size: 20px; 
            margin-bottom: 20px; 
            padding-right: 15px;
            color: #1e293b;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
          }
          th, td { 
            border: 1px solid #e2e8f0; 
            padding: 12px; 
            text-align: center; 
            font-size: 13px; 
          }
          th { 
            background: #1e293b; 
            color: white; 
            font-weight: 700;
            padding: 14px;
          }
          tr:hover { background: #fef3c7; }
          .footer-buttons { 
            display: flex; 
            justify-content: center; 
            gap: 16px; 
            padding: 30px; 
            background: #f1f5f9; 
            border-top: 1px solid #e2e8f0; 
          }
          .print-btn, .close-btn { 
            padding: 12px 32px; 
            border: none; 
            border-radius: 12px; 
            font-size: 14px; 
            font-weight: 600; 
            cursor: pointer;
            font-family: inherit;
          }
          .print-btn { 
            background: linear-gradient(135deg, #f59e0b, #d97706); 
            color: white; 
          }
          .close-btn { 
            background: #64748b; 
            color: white; 
          }
          @media print { 
            body { background: white; padding: 0; } 
            .footer-buttons { display: none; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>📈 گزارش سود و درآمد</h1>
            <p>تاریخ چاپ: ${getTodayPersianDateForPrint()}</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed)">
              <div class="icon">💰</div>
              <div class="amount">${formatPrice(getTotalProfit())} تومان</div>
              <div class="label">سود کل</div>
              <div class="words">${numberToWords(getTotalProfit())} تومان</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b, #d97706)">
              <div class="icon">📅</div>
              <div class="amount">${formatPrice(getCurrentYearProfit())} تومان</div>
              <div class="label">سود امسال (${getCurrentPersianYear()})</div>
              <div class="words">${numberToWords(getCurrentYearProfit())} تومان</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #10b981, #059669)">
              <div class="icon">📆</div>
              <div class="amount">${formatPrice(getCurrentMonthProfit())} تومان</div>
              <div class="label">سود این ماه (${persianMonths[getCurrentPersianMonth() - 1]})</div>
              <div class="words">${numberToWords(getCurrentMonthProfit())} تومان</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ec4899, #db2777)">
              <div class="icon">📊</div>
              <div class="amount">${profits.length}</div>
              <div class="label">تعداد سودها</div>
            </div>
          </div>
          
          <div class="category-grid">
            <div class="category-card" style="background: #dcfce7; ">
              <div class="icon">🚗</div>
              <div class="label" style="color: #10b981">خودرو</div>
              <div class="amount" style="color: #10b981">${formatPrice(getCategoryTotal("car"))} تومان</div>
              <div class="words">${numberToWords(getCategoryTotal("car"))} تومان</div>
            </div>
            <div class="category-card" style="background: #dbeafe; ">
              <div class="icon">🚕</div>
              <div class="label" style="color: #3b82f6">ایاب ذهاب</div>
              <div class="amount" style="color: #3b82f6">${formatPrice(getCategoryTotal("transport"))} تومان</div>
              <div class="words">${numberToWords(getCategoryTotal("transport"))} تومان</div>
            </div>
            <div class="category-card" style="background: #f1f5f9; ">
              <div class="icon">📦</div>
              <div class="label" style="color: #64748b">سایر</div>
              <div class="amount" style="color: #64748b">${formatPrice(getCategoryTotal("other"))} تومان</div>
              <div class="words">${numberToWords(getCategoryTotal("other"))} تومان</div>
            </div>
          </div>
          
          <div class="stats-section">
            <h3>📋 لیست سودهای ثبت شده</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>عنوان سود</th>
                  <th>دسته‌بندی</th>
                  <th>مبلغ (تومان)</th>
                  <th>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                ${profits.slice(0, 50).map((profit, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${profit.title || "بدون عنوان"}</td>
                    <td>${profit.categoryLabel || profit.category}</td>
                    <td>${formatPrice(profit.amount)}</td>
                    <td>${getDisplayDate(profit)}</td>
                  </tr>
                `).join('')}
                ${profits.length === 0 ? '<tr><td colspan="5" style="text-align:center">هیچ سودی ثبت نشده است</td>' : ''}
              </tbody>
            </table>
          </div>
          
          <div class="footer-buttons">
            <button class="print-btn" onclick="window.print()">🖨️ چاپ گزارش</button>
            <button class="close-btn" onclick="window.close()">✖️ بستن</button>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ========== محاسبات نهایی ==========
  const totalProfit = getTotalProfit();
  const currentYearProfit = getCurrentYearProfit();
  const currentMonthProfit = getCurrentMonthProfit();
  const selectedYearProfit = getSelectedYearProfit();
  const monthlyData = getMonthlyData();
  const yearlyData = getYearlyData();

  const availableYears = [...new Set(Object.keys(yearlyData).map(y => parseInt(y, 10)))].sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(getCurrentPersianYear());

  const carTotal = getCategoryTotal("car");
  const transportTotal = getCategoryTotal("transport");
  const otherTotal = getCategoryTotal("other");

  const filteredProfits = profits.filter(profit => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (profit.title && profit.title.toLowerCase().includes(searchLower)) ||
      (profit.description && profit.description.toLowerCase().includes(searchLower))
    );
  });

  const maxMonthlyAmount = Math.max(...Object.values(monthlyData), 1);

  // ========== ستون‌های جدول ==========
  const columns = [
    { name: "ردیف", selector: (row, index) => index + 1, sortable: true, width: "60px", center: true },
    { name: "عنوان سود", selector: (row) => row.title, sortable: true, grow: 1, cell: (row) => <span style={{ fontWeight: "bold", color: "#1e293b" }}>{row.title}</span> },
    { name: "دسته‌بندی", selector: (row) => row.categoryLabel, sortable: true, width: "120px", cell: (row) => { const cat = profitCategories.find(c => c.value === row.category); return (<span style={{ background: cat?.bg, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "500", color: cat?.color, display: "inline-flex", alignItems: "center", gap: "6px" }}><span>{cat?.icon}</span><span>{cat?.label}</span></span>); } },
    { name: "مبلغ (تومان)", selector: (row) => row.amount, sortable: true, width: "200px", cell: (row) => (<div><span style={{ background: "#dcfce7", padding: "4px 10px", borderRadius: "16px", fontSize: "12px", fontWeight: "bold", color: "#16a34a", display: "inline-block", whiteSpace: "nowrap" }}>{formatPrice(row.amount)} تومان</span><div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>{numberToWords(row.amount)} تومان</div></div>) },
    { name: "تاریخ", selector: (row) => getDisplayDate(row), sortable: true, width: "110px", cell: (row) => (<span style={{ background: "#dbeafe", padding: "4px 10px", borderRadius: "16px", fontSize: "12px", color: "#1e40af", display: "inline-block", whiteSpace: "nowrap" }}>{getDisplayDate(row)}</span>) },
    { name: "عملیات", width: "100px", center: true, cell: (row) => (<div style={{ display: "flex", gap: "6px", justifyContent: "center" }}><button onClick={() => handleEditClick(row)} style={{ background: "#e0e7ff", border: "none", padding: "5px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }} title="ویرایش">✏️</button><button onClick={() => handleDeleteClick(row)} style={{ background: "#fee2e2", border: "none", padding: "5px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }} title="حذف">🗑️</button></div>) }
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
    padding: "8px 10px", borderRadius: "8px", width: "100%", boxSizing: "border-box", fontSize: "13px",
    backgroundColor: "#ffffff", color: "#000000", border: focusedIndex === index ? "2px solid #3b82f6" : "1px solid #d1d5db",
    outline: "none", transition: "all 0.2s ease-in-out", marginBottom: "12px", fontFamily: "inherit"
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

  // ========== رندر اصلی ==========
  return (
    <div style={{ padding: "24px", backgroundColor: "#f1f5f9", minHeight: "80vh", borderRadius: "16px" }}>
      {toast && (
        <div style={{ position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "12px", color: "#fff", fontSize: "14px", fontWeight: "500", zIndex: 10000, backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444", animation: "slideIn 0.3s ease-out" }}>
          {toast.message}
        </div>
      )}

      {/* هدر */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "linear-gradient(135deg, #64748b, #475569)", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "12px", cursor: "pointer", fontSize: "13px", fontWeight: "500", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>← بازگشت</button>
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "900", color: "#0f172a", background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>📈 مدیریت سود و گزارش‌ها</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handlePrint} style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 12px rgba(139,92,246,0.3)" }}>🖨️ پرینت کامل</button>
          <button onClick={() => setShowAddModal(true)} style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "12px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>➕ ثبت سود جدید</button>
        </div>
      </div>

      {/* 3 کارت اصلی */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
        <div style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
          borderRadius: "20px", 
          padding: "28px", 
          color: "#fff", 
          boxShadow: "0 15px 35px -8px rgba(102,126,234,0.4)",
          transition: "transform 0.3s",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", fontSize: "120px", opacity: 0.1 }}>💰</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: "44px" }}>💰</span>
            <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 14px", borderRadius: "30px", fontSize: "12px", fontWeight: "600" }}>کل درآمد</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "900", marginBottom: "4px", position: "relative", zIndex: 1 }}>{formatPrice(totalProfit)} تومان</div>
          <div style={{ fontSize: "12px", opacity: 0.8, position: "relative", zIndex: 1 }}>{numberToWords(totalProfit)} تومان</div>
        </div>

        <div style={{ 
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", 
          borderRadius: "20px", 
          padding: "28px", 
          color: "#fff", 
          boxShadow: "0 15px 35px -8px rgba(245,87,108,0.4)",
          transition: "transform 0.3s",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", fontSize: "120px", opacity: 0.1 }}>📅</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: "44px" }}>📅</span>
            <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 14px", borderRadius: "30px", fontSize: "12px", fontWeight: "600" }}>سال {getCurrentPersianYear()}</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "900", marginBottom: "4px", position: "relative", zIndex: 1 }}>{formatPrice(currentYearProfit)} تومان</div>
          <div style={{ fontSize: "12px", opacity: 0.8, position: "relative", zIndex: 1 }}>{numberToWords(currentYearProfit)} تومان</div>
        </div>

        <div style={{ 
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", 
          borderRadius: "20px", 
          padding: "28px", 
          color: "#fff", 
          boxShadow: "0 15px 35px -8px rgba(79,172,254,0.4)",
          transition: "transform 0.3s",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", fontSize: "120px", opacity: 0.1 }}>📆</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: "44px" }}>📆</span>
            <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 14px", borderRadius: "30px", fontSize: "12px", fontWeight: "600" }}>{persianMonths[getCurrentPersianMonth() - 1]}</span>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "900", marginBottom: "4px", position: "relative", zIndex: 1 }}>{formatPrice(currentMonthProfit)} تومان</div>
          <div style={{ fontSize: "12px", opacity: 0.8, position: "relative", zIndex: 1 }}>{numberToWords(currentMonthProfit)} تومان</div>
        </div>
      </div>

      {/* دسته‌بندی سودها */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
        {profitCategories.map(cat => {
          const total = getCategoryTotal(cat.value);
          return (
            <div key={cat.value} style={{ 
              background: cat.bg, 
              borderRadius: "20px", 
              padding: "24px", 
              boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                <div style={{ 
                  background: cat.color, 
                  width: "56px", 
                  height: "56px", 
                  borderRadius: "28px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "32px",
                  boxShadow: `0 8px 20px ${cat.color}40`
                }}>{cat.icon}</div>
                <div>
                  <div style={{ fontSize: "15px", color: cat.color, fontWeight: "700" }}>{cat.label}</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a" }}>{formatPrice(total)} تومان</div>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", paddingRight: "72px" }}>{numberToWords(total)} تومان</div>
            </div>
          );
        })}
      </div>

      {/* جستجو */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#94a3b8" }}>🔍</span>
          <input 
            type="text" 
            placeholder="جستجو در عنوان یا توضیحات سود..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ 
              width: "100%", 
              padding: "12px 45px 12px 18px", 
              borderRadius: "14px", 
              border: "2px solid #e2e8f0", 
              fontSize: "14px", 
              outline: "none", 
              backgroundColor: "#111", 
              color: "#fff",
              transition: "all 0.3s",
              fontWeight: "500"
            }} 
            onFocus={(e) => e.target.style.borderColor = "#111"}
            onBlur={(e) => e.target.style.borderColor = "#111"}
          />
          {searchTerm && <button onClick={() => setSearchTerm("")} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#94a3b8" }}>✕</button>}
        </div>
      </div>

      {/* جدول */}
      <div style={{ 
        background: "#fff", 
        borderRadius: "20px", 
        overflow: "hidden", 
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)", 
        border: "1px solid #e2e8f0", 
        marginBottom: "24px" 
      }}>
        <DataTable 
          columns={columns} 
          data={filteredProfits} 
          customStyles={customStyles} 
          pagination 
          paginationPerPage={10} 
          paginationRowsPerPageOptions={[5, 10, 25, 50]} 
          responsive 
          highlightOnHover 
          striped 
          noDataComponent={
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <span style={{ fontSize: "64px", display: "block", marginBottom: "16px" }}>📈</span>
              <p style={{ fontSize: "16px", color: "#64748b", marginBottom: "16px" }}>هیچ سودی ثبت نشده است</p>
              <button onClick={() => setShowAddModal(true)} style={{ padding: "10px 28px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>➕ ثبت سود جدید</button>
            </div>
          } 
        />
      </div>

 {/* ===== گزارش‌ها ===== */}
<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
  
  {/* ===== گزارش سالانه (سطر اول) ===== */}
  <div style={{ 
    background: "#fff", 
    borderRadius: "24px", 
    padding: "28px", 
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
    width: "100%"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
      <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>📈 گزارش سالانه</h3>
    </div>
    {Object.keys(yearlyData).length > 0 ? (
      <div>
        {Object.keys(yearlyData).sort((a, b) => b - a).map(year => {
          const amount = yearlyData[year];
          const maxAmount = Math.max(...Object.values(yearlyData), 1);
          const percent = (amount / maxAmount) * 100;
          return (
            <div key={year} style={{ 
              marginBottom: "16px", 
              padding: "16px 18px", 
              background: "#f8fafc", 
              borderRadius: "14px",
              transition: "all 0.3s",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>سال {year}</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "20px", fontWeight: "900", color: "#f59e0b" }}>{formatPrice(amount)} تومان</span>
                  <button 
                    onClick={() => handleYearlyExport(parseInt(year, 10))}
                    style={{ 
                      background: "linear-gradient(135deg, #f59e0b, #d97706)", 
                      border: "none", 
                      borderRadius: "8px", 
                      padding: "6px 14px", 
                      fontSize: "11px", 
                      color: "white", 
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: "600",
                      boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "linear-gradient(135deg, #d97706, #b45309)";
                      e.target.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "linear-gradient(135deg, #f59e0b, #d97706)";
                      e.target.style.transform = "scale(1)";
                    }}
                    title={`خروجی سال ${year}`}
                  >
                    🖨️ خروجی
                  </button>
                </div>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: "20px", height: "8px", overflow: "hidden" }}>
                <div style={{ 
                  width: `${percent}%`, 
                  background: "linear-gradient(90deg, #f59e0b, #fbbf24)", 
                  height: "100%", 
                  borderRadius: "20px", 
                  transition: "width 0.8s ease" 
                }}></div>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>{numberToWords(amount)} تومان</div>
            </div>
          );
        })}
      </div>
    ) : (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
        <span style={{ fontSize: "64px", display: "block", marginBottom: "16px" }}>📊</span>
        <p style={{ fontSize: "16px" }}>هیچ داده‌ای برای نمایش وجود ندارد</p>
      </div>
    )}
  </div>

{/* ===== گزارش ماهانه (سطر دوم) ===== */}
<div style={{ 
  background: "#fff", 
  borderRadius: "24px", 
  padding: "28px", 
  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
  width: "100%"
}}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>📊 گزارش ماهانه</h3>
    <select 
      value={selectedYear} 
      onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))} 
      style={{ 
        padding: "8px 16px", 
        borderRadius: "12px", 
        border: "2px solid #e2e8f0", 
        fontSize: "14px", 
        background: "#fff",
        fontWeight: "600",
        color: "#0f172a",
        cursor: "pointer",
        outline: "none"
      }}
    >
      {availableYears.map(year => (<option key={year} value={year}>{year}</option>))}
    </select>
  </div>
  
  <div style={{ 
    background: "linear-gradient(135deg, #fef3c7, #fde68a)", 
    padding: "24px", 
    borderRadius: "20px", 
    marginBottom: "20px", 
    textAlign: "center",
    border: "1px solid #f59e0b30"
  }}>
    <div style={{ fontSize: "14px", color: "#92400e", marginBottom: "8px", fontWeight: "600" }}>سود سال {selectedYear}</div>
    <div style={{ fontSize: "36px", fontWeight: "900", color: "#d97706" }}>{formatPrice(selectedYearProfit)} تومان</div>
    <div style={{ fontSize: "13px", color: "#92400e", marginTop: "8px" }}>{numberToWords(selectedYearProfit)} تومان</div>
  </div>
  
  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
    {persianMonths.map((month, index) => {
      const amount = monthlyData[index + 1];
      const percent = maxMonthlyAmount > 0 ? (amount / maxMonthlyAmount) * 100 : 0;
      
      // ===== رنگ‌های ساده و خوانا =====
      const monthColors = [
        { bg: "#E8F0FE", border: "#4A90D9", text: "#1e293b" },   // فروردین
        { bg: "#FDE8E8", border: "#E74C3C", text: "#1e293b" },   // اردیبهشت
        { bg: "#E8F8F5", border: "#1ABC9C", text: "#1e293b" },   // خرداد
        { bg: "#EAF2F8", border: "#3498DB", text: "#1e293b" },   // تیر
        { bg: "#E8F8E8", border: "#27AE60", text: "#1e293b" },   // مرداد
        { bg: "#FEF9E7", border: "#F1C40F", text: "#1e293b" },   // شهریور
        { bg: "#F4ECF7", border: "#8E44AD", text: "#1e293b" },   // مهر
        { bg: "#E8F8F5", border: "#16A085", text: "#1e293b" },   // آبان
        { bg: "#FCF3CF", border: "#F39C12", text: "#1e293b" },   // آذر
        { bg: "#EBF5FB", border: "#2980B9", text: "#1e293b" },   // دی
        { bg: "#E8F8E8", border: "#2ECC71", text: "#1e293b" },   // بهمن
        { bg: "#FDF2E9", border: "#E67E22", text: "#1e293b" }    // اسفند
      ];
      
      const color = monthColors[index];
      const hasData = amount > 0;
      
      return (
        <div key={index} style={{ 
          background: hasData ? color.bg : "#f8fafc",
          borderRadius: "14px", 
          padding: "18px 16px",
          transition: "all 0.3s",
          cursor: hasData ? "pointer" : "default",
          border: `2px solid ${hasData ? color.border : "#e2e8f0"}`,
          boxShadow: hasData ? "0 2px 8px rgba(0,0,0,0.06)" : "none"
        }}
        onMouseEnter={(e) => {
          if (hasData) {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (hasData) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
          }
        }}
        >
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "8px" 
          }}>
            <div style={{ 
              fontWeight: "700", 
              fontSize: "15px", 
              color: "#1e293b"
            }}>
              {month}
            </div>
            <button 
              onClick={() => handleMonthlyExport(selectedYear, index + 1)}
              style={{ 
                background: hasData ? color.border : "#e2e8f0", 
                border: "none", 
                borderRadius: "8px", 
                padding: "4px 12px", 
                fontSize: "10px", 
                color: hasData ? "#ffffff" : "#94a3b8", 
                cursor: hasData ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: "600",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (hasData) {
                  e.target.style.opacity = "0.8";
                  e.target.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (hasData) {
                  e.target.style.opacity = "1";
                  e.target.style.transform = "scale(1)";
                }
              }}
              title={`خروجی ماه ${month}`}
              disabled={!hasData}
            >
              🖨️
            </button>
          </div>
          
          <div style={{ 
            fontSize: "20px", 
            fontWeight: "900", 
            color: hasData ? color.border : "#94a3b8"
          }}>
            {formatPrice(amount)} تومان
          </div>
          
          <div style={{ 
            fontSize: "10px", 
            color: "#64748b", 
            marginTop: "4px" 
          }}>
            {numberToWords(amount)} تومان
          </div>
          
          <div style={{ 
            background: "#e2e8f0", 
            borderRadius: "10px", 
            height: "4px", 
            marginTop: "12px", 
            overflow: "hidden" 
          }}>
            <div style={{ 
              width: `${percent}%`, 
              background: hasData ? color.border : "#e2e8f0", 
              height: "100%", 
              borderRadius: "10px", 
              transition: "width 0.8s ease" 
            }}></div>
          </div>
          
          <div style={{ 
            fontSize: "9px", 
            color: "#94a3b8", 
            marginTop: "6px" 
          }}>
            {hasData ? `${Math.round(percent)}% از بهترین ماه` : 'بدون تراکنش'}
          </div>
        </div>
      );
    })}
  </div>
</div>
</div>
      {/* مودال ثبت سود */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ ثبت سود جدید" color="#10b981" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input 
            type="text" 
            value={newProfit.amount ? Number(newProfit.amount).toLocaleString() : ""} 
            onChange={(e) => { 
              let raw = e.target.value.replace(/,/g, ""); 
              if (raw === "" || /^\d+$/.test(raw)) setNewProfit({...newProfit, amount: raw}); 
            }} 
            style={{...inputStyle(0, null), textAlign: "left", direction: "ltr", fontSize: "12px"}} 
            placeholder="مثال: 50,000,000" 
            autoFocus
          />
          {newProfit.amount && newProfit.amount !== "0" && (
            <div style={{ fontSize: "12px", color: "#10b981", marginBottom: "8px", marginTop: "-8px", fontWeight: "500" }}>
              {numberToWords(Number(newProfit.amount))} تومان
            </div>
          )}
          
          <label style={labelStyle}>📂 دسته‌بندی</label>
          <select value={newProfit.category} onChange={(e) => setNewProfit({...newProfit, category: e.target.value})} style={inputStyle(1, null)}>
            {profitCategories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>))}
          </select>
          
          <label style={labelStyle}>📅 تاریخ (شمسی - اختیاری)</label>
          <input 
            type="text" 
            placeholder="مثال: 1405/01/15" 
            value={newProfit.date} 
            onChange={(e) => setNewProfit({...newProfit, date: e.target.value})} 
            style={inputStyle(2, null)} 
          />
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "-8px", marginBottom: "12px" }}>
            فرمت: سال/ماه/روز (در صورت خالی ماندن، تاریخ امروز ثبت می‌شود)
          </div>
          
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea 
            value={newProfit.description} 
            onChange={(e) => setNewProfit({...newProfit, description: e.target.value})} 
            style={{...inputStyle(3, null), minHeight: "60px", resize: "vertical"}} 
            placeholder="توضیحات اضافی..." 
            rows="3" 
          />
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "12px", background: "#64748b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>انصراف</button>
            <button onClick={handleAddProfit} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>✅ ثبت سود</button>
          </div>
        </div>
      </Modal>

      {/* مودال ویرایش سود */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ ویرایش سود" color="#f59e0b" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>📌 عنوان سود *</label>
          <input type="text" value={editProfit.title} onChange={(e) => setEditProfit({...editProfit, title: e.target.value})} style={inputStyle(10, null)} />
          
          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input 
            type="text" 
            value={editProfit.amount ? Number(editProfit.amount).toLocaleString() : ""} 
            onChange={(e) => { 
              let raw = e.target.value.replace(/,/g, ""); 
              if (raw === "" || /^\d+$/.test(raw)) setEditProfit({...editProfit, amount: raw}); 
            }} 
            style={{...inputStyle(11, null), textAlign: "left", direction: "ltr", fontSize: "16px", fontWeight: "600"}} 
          />
          {editProfit.amount && editProfit.amount !== "0" && (
            <div style={{ fontSize: "12px", color: "#10b981", marginBottom: "8px", marginTop: "-8px", fontWeight: "500" }}>
              {numberToWords(Number(editProfit.amount))} تومان
            </div>
          )}
          
          <label style={labelStyle}>📂 دسته‌بندی</label>
          <select value={editProfit.category} onChange={(e) => setEditProfit({...editProfit, category: e.target.value})} style={inputStyle(12, null)}>
            {profitCategories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>))}
          </select>
          
          <label style={labelStyle}>📅 تاریخ (شمسی)</label>
          <input type="text" placeholder="مثال: 1405/01/15" value={editProfit.date} onChange={(e) => setEditProfit({...editProfit, date: e.target.value})} style={inputStyle(13, null)} />
          
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={editProfit.description} onChange={(e) => setEditProfit({...editProfit, description: e.target.value})} style={{...inputStyle(14, null), minHeight: "60px", resize: "vertical"}} rows="3" />
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: "12px", background: "#64748b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>انصراف</button>
            <button onClick={handleUpdateProfit} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", boxShadow: "0 4px 15px rgba(245,158,11,0.3)" }}>✏️ ویرایش سود</button>
          </div>
        </div>
      </Modal>

      {/* مودال حذف */}
      <Modal isOpen={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title="🗑️ تأیید حذف" color="#ef4444" size="sm">
        <div style={{ textAlign: "center", padding: "10px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <p style={{ fontSize: "16px", marginBottom: "12px", color: "#1e293b" }}>آیا از حذف سود <strong style={{ color: "#ef4444" }}>"{profitToDelete?.title}"</strong> مطمئن هستید؟</p>
          <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "20px" }}>این عمل غیرقابل بازگشت است.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button onClick={() => setOpenConfirmModal(false)} style={{ flex: 1, padding: "12px", background: "#64748b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>انصراف</button>
            <button onClick={confirmDelete} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", boxShadow: "0 4px 15px rgba(239,68,68,0.3)" }}>🗑️ حذف سود</button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes slideIn { 
          from { transform: translateX(100%); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card-anim {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ProfitManager;