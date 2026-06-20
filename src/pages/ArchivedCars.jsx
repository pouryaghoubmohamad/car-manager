import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, update, remove, set } from "firebase/database";
import Modal from "../Modal";

const ArchivedCars = ({ user, onBack, onRestoreSuccess }) => {
  const [archivedCars, setArchivedCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCar, setSelectedCar] = useState(null);
  const [toast, setToast] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [carToRestore, setCarToRestore] = useState(null);

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
    const archiveRef = ref(db, `users_emails/${emailKey}/archivedCars`);
    const unsubscribe = onValue(archiveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.entries(data)
          .filter(([_, value]) => !value.deleted)
          .map(([id, value]) => ({
            id: id,
            ...value,
            expenses: value.expenses || []
          }))
          .reverse();
        setArchivedCars(carsArray);
      } else {
        setArchivedCars([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, emailKey]);

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

  const calculateProfit = (car) => {
    const sellingPrice = Number(car.sellingPrice) || 0;
    let purchasePrice = Number(car.purchasePrice) || 0;
    if (purchasePrice === 0 && car.originalCar?.purchasePrice) {
      purchasePrice = Number(car.originalCar.purchasePrice) || 0;
    }
    const totalExpenses = car.totalExpense || (car.expenses ? Object.values(car.expenses).reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0);
    const totalCost = purchasePrice + totalExpenses;
    return sellingPrice - totalCost;
  };

  const rightBoxStyle = (type) => {
    switch(type) {
      case 'buyer':
        return { backgroundColor: "#e0f2fe", borderRadius: "12px", padding: "6px 10px", textAlign: "left", fontWeight: "bold", color: "#0284c7", fontSize: "12px" };
      case 'date':
        return { backgroundColor: "#dbeafe", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#1e40af", fontWeight: "500", fontSize: "12px" };
      case 'purchase':
        return { backgroundColor: "#f1f5f9", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      case 'selling':
        return { backgroundColor: "#dcfce7", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      case 'profit':
        return { backgroundColor: "#fef3c7", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      case 'loss':
        return { backgroundColor: "#fee2e2", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      case 'expense':
        return { backgroundColor: "#fef3c7", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      case 'total':
        return { backgroundColor: "#ede9fe", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      default:
        return { backgroundColor: "#f8fafc", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
    }
  };

  // ========== بخش چاپ صورتحساب ==========
// ========== بخش چاپ صورتحساب ==========
const handlePrint = (car) => {
  setSelectedCar(car);
  setTimeout(() => {
    const printWindow = window.open('', '_blank');
    
    const purchasePrice = Number(car.purchasePrice) || Number(car.originalCar?.purchasePrice) || 0;
    const totalExpenses = car.totalExpense || (car.expenses ? Object.values(car.expenses).reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0);
    const totalCost = purchasePrice + totalExpenses;
    const profitValue = (Number(car.sellingPrice) || 0) - totalCost;
    
    const carInfo = car.originalCar || {};
    
    printWindow.document.write(`
      <html>
        <head>
          <title>صورتحساب فروش خودرو ${carInfo.carName || car.originalCar?.carName}</title>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Vazirmatn', 'Vazir', 'IRANSans', Tahoma, sans-serif;
              direction: rtl;
              padding: 30px;
              margin: 0;
              background: #f0f4f8;
              min-height: 100vh;
            }
            .invoice {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              border-radius: 32px;
              overflow: hidden;
              box-shadow: 0 30px 60px rgba(0,0,0,0.15);
            }
            .header {
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
              padding: 30px 40px;
              text-align: center;
              color: white;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 900;
              margin-bottom: 8px;
              background: linear-gradient(135deg, #fbbf24, #f59e0b);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .header .sub-info {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 12px;
              font-size: 13px;
              color: #94a3b8;
            }
            .header .sub-info .badge {
              background: rgba(251, 191, 36, 0.2);
              padding: 4px 16px;
              border-radius: 30px;
              color: #fbbf24;
              font-weight: 700;
              font-size: 12px;
              border: 1px solid rgba(251, 191, 36, 0.3);
            }
            .content { padding: 30px 35px; }
            .section {
              margin-bottom: 24px;
              border: 1px solid #e2e8f0;
              border-radius: 20px;
              overflow: hidden;
              background: white;
            }
            .section-title {
              background: linear-gradient(135deg, #f8fafc, #f1f5f9);
              padding: 14px 20px;
              font-weight: 700;
              color: #0f172a;
              border-bottom: 2px solid #e2e8f0;
              font-size: 14px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              padding: 18px 20px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px dashed #e2e8f0;
              font-size: 13px;
            }
            .info-item:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #64748b; font-size: 12px; }
            .info-box {
              background: #f8fafc;
              border-radius: 12px;
              padding: 8px 14px;
              text-align: left;
              font-weight: 500;
              font-size: 13px;
              min-width: 120px;
            }
            .info-box-blue { background: #e0f2fe; color: #0284c7; font-weight: 700; }
            .info-box-date { background: #dbeafe; color: #1e40af; }
            .info-box-green { background: #dcfce7; color: #16a34a; }
            .info-box-yellow { background: #fef3c7; color: #b45309; }
            
            .expense-group {
              background: #f8fafc;
              margin-bottom: 12px;
              border-radius: 14px;
              overflow: hidden;
              border: 1px solid #e2e8f0;
            }
            .expense-group-header {
              padding: 10px 16px;
              color: white;
              font-weight: 700;
              font-size: 13px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .expense-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 16px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
            }
            .expense-item:last-child { border-bottom: none; }
            .expense-item .desc { font-weight: 500; color: #1e293b; }
            .expense-item .amount { font-weight: 700; color: #0f172a; }
            .expense-item .words { font-size: 9px; color: #94a3b8; margin-right: 8px; }
            
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 12px;
              margin-top: 24px;
            }
            .stat-box {
              background: white;
              border-radius: 16px;
              padding: 16px 12px;
              text-align: center;
              border: 2px solid #e2e8f0;
              position: relative;
              overflow: hidden;
            }
            .stat-box::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
            }
            .stat-box.purchase::before { background: linear-gradient(90deg, #3b82f6, #2563eb); }
            .stat-box.purchase { border-color: #93c5fd; background: #f0f9ff; }
            .stat-box.expenses::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
            .stat-box.expenses { border-color: #fcd34d; background: #fffbeb; }
            .stat-box.total-cost::before { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
            .stat-box.total-cost { border-color: #c4b5fd; background: #f5f3ff; }
            .stat-box.selling::before { background: linear-gradient(90deg, #10b981, #059669); }
            .stat-box.selling { border-color: #6ee7b7; background: #ecfdf5; }
            .stat-box.profit::before { background: linear-gradient(90deg, #f43f5e, #e11d48); }
            .stat-box.profit { border-color: #fda4af; background: #fff1f2; }
            .stat-box.profit.positive::before { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
            .stat-box.profit.positive { border-color: #fde68a; background: #fffbeb; }
            
            .stat-box .stat-icon { font-size: 28px; display: block; margin-bottom: 6px; }
            .stat-box .stat-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
            .stat-box .stat-value { font-size: 18px; font-weight: 900; color: #0f172a; direction: ltr; }
            .stat-box .stat-value.purchase-color { color: #2563eb; }
            .stat-box .stat-value.expenses-color { color: #d97706; }
            .stat-box .stat-value.total-color { color: #7c3aed; }
            .stat-box .stat-value.selling-color { color: #059669; }
            .stat-box .stat-value.profit-color { color: #dc2626; }
            .stat-box .stat-value.profit-color.positive { color: #16a34a; }
            .stat-box .stat-words { font-size: 9px; color: #94a3b8; margin-top: 4px; direction: rtl; }
            
            .print-actions {
              display: flex;
              gap: 14px;
              justify-content: center;
              padding: 24px 30px;
              border-top: 2px solid #e2e8f0;
              background: #f8fafc;
              margin-top: 24px;
            }
            .print-btn, .back-btn {
              padding: 12px 32px;
              border: none;
              border-radius: 14px;
              cursor: pointer;
              font-size: 15px;
              font-weight: 700;
              font-family: inherit;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .print-btn { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #0f172a; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3); }
            .back-btn { background: #64748b; color: white; }
            
            @media (max-width: 768px) {
              body { padding: 15px; }
              .content { padding: 20px; }
              .stats-grid { grid-template-columns: repeat(3, 1fr); }
              .info-grid { grid-template-columns: 1fr; }
              .header .sub-info { flex-direction: column; gap: 8px; align-items: center; }
            }
            @media (max-width: 500px) {
              .stats-grid { grid-template-columns: repeat(2, 1fr); }
              .stats-grid .stat-box:nth-child(5) { grid-column: span 2; }
            }
            @media print {
              body { padding: 0; background: white; }
              .invoice { border-radius: 0; box-shadow: none; }
              .print-actions { display: none; }
              .stat-box { border: 1px solid #e2e8f0 !important; break-inside: avoid; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div class="header-content">
                <h1>🚗 صورتحساب فروش خودرو</h1>
                <div class="sub-info">
                  <span>📅 تاریخ: ${safeConvertToPersianDate(car.soldAt)}</span>
                  <span>🔢 شماره فاکتور: ${car.id?.slice(-8) || "------"}</span>
                  <span class="badge">✅ فروش نهایی</span>
                </div>
              </div>
            </div>
            
            <div class="content">
              <!-- اطلاعات خریدار و فروش -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px;">
                <div class="section">
                  <div class="section-title"><span>👤</span> اطلاعات خریدار قبلی</div>
                  <div class="info-grid">
                    <div class="info-item"><span class="info-label">🚘 نام خودرو:</span><div class="info-box">${carInfo.carName || car.originalCar?.carName}</div></div>
                    <div class="info-item"><span class="info-label">📅 سال تولید:</span><div class="info-box info-box-green">${carInfo.productionYear || car.originalCar?.productionYear || "-"}</div></div>
                    <div class="info-item"><span class="info-label">🎨 رنگ:</span><div class="info-box info-box-green">${carInfo.color || car.originalCar?.color || "-"}</div></div>
                    <div class="info-item"><span class="info-label">👤 خریدار قبلی:</span><div class="info-box info-box-blue">${carInfo.buyerName || car.originalCar?.buyerName}</div></div>
                    <div class="info-item"><span class="info-label">📆 تاریخ خرید:</span><div class="info-box info-box-date">${safeConvertToPersianDate(carInfo.purchaseDate) || safeConvertToPersianDate(car.originalCar?.purchaseDate)}</div></div>
                  </div>
                </div>
                
                <div class="section">
                  <div class="section-title"><span>🤝</span> اطلاعات فروش</div>
                  <div class="info-grid">
                    <div class="info-item"><span class="info-label">👤 خریدار جدید:</span><div class="info-box info-box-yellow">${car.newBuyerName}</div></div>
                    <div class="info-item"><span class="info-label">📆 تاریخ فروش:</span><div class="info-box info-box-date">${safeConvertToPersianDate(car.sellDate)}</div></div>
                    <div class="info-item" style="grid-column: span 2;">
                      <span class="info-label">💰 قیمت فروش:</span>
                      <div class="info-box" style="flex:1; background: #dcfce7; color: #16a34a; font-weight: 700; font-size: 15px; border: 1px solid #86efac;">
                        ${formatPrice(car.sellingPrice)} تومان
                        <div style="font-size: 11px; font-weight: 400; color: #16a34a; margin-top: 2px;">${numberToWords(car.sellingPrice)} تومان</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- هزینه‌های ثبت شده -->
              <div class="section">
                <div class="section-title"><span>🔧</span> هزینه‌های ثبت شده</div>
                <div style="padding: 16px 20px;">
    `);
    
    if (car.expenses && Object.keys(car.expenses).length > 0) {
      const grouped = {};
      Object.values(car.expenses).forEach(exp => {
        const cat = exp.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(exp);
      });
      
      for (const [cat, exps] of Object.entries(grouped)) {
        const catInfo = getCategoryLabel(cat);
        const catTotal = exps.reduce((s, e) => s + (e.amount || 0), 0);
        printWindow.document.write(`
          <div class="expense-group">
            <div class="expense-group-header" style="background:${catInfo.color};">
              <span>${catInfo.icon} ${catInfo.label}</span>
              <span class="count">${exps.length} مورد | جمع: ${formatPrice(catTotal)} تومان</span>
            </div>
        `);
        exps.forEach(exp => {
          printWindow.document.write(`
            <div class="expense-item">
              <span class="desc">${exp.description || 'بدون توضیحات'}</span>
              <div>
                <span class="amount">${formatPrice(exp.amount)}</span>
                <span class="words">${numberToWords(exp.amount)} تومان</span>
              </div>
            </div>
          `);
        });
        printWindow.document.write(`</div>`);
      }
    } else {
      printWindow.document.write(`
        <div style="text-align:center; padding:30px; color:#94a3b8; font-size:14px;">
          <div style="font-size:40px; margin-bottom:10px;">📭</div>
          هیچ هزینه‌ای ثبت نشده است
        </div>
      `);
    }
    
    printWindow.document.write(`
                </div>
              </div>
              
              <!-- ۵ باکس آماری -->
              <div class="stats-grid">
                <div class="stat-box purchase">
                  <span class="stat-icon">💰</span>
                  <div class="stat-label">مبلغ خرید</div>
                  <div class="stat-value purchase-color">${formatPrice(purchasePrice)}</div>
                  <div class="stat-words">${numberToWords(purchasePrice)} تومان</div>
                </div>
                <div class="stat-box expenses">
                  <span class="stat-icon">🔧</span>
                  <div class="stat-label">مجموع هزینه‌ها</div>
                  <div class="stat-value expenses-color">${formatPrice(totalExpenses)}</div>
                  <div class="stat-words">${numberToWords(totalExpenses)} تومان</div>
                </div>
                <div class="stat-box total-cost">
                  <span class="stat-icon">📊</span>
                  <div class="stat-label">هزینه کل</div>
                  <div class="stat-value total-color">${formatPrice(totalCost)}</div>
                  <div class="stat-words">${numberToWords(totalCost)} تومان</div>
                </div>
                <div class="stat-box selling">
                  <span class="stat-icon">💵</span>
                  <div class="stat-label">مبلغ فروش</div>
                  <div class="stat-value selling-color">${formatPrice(car.sellingPrice)}</div>
                  <div class="stat-words">${numberToWords(car.sellingPrice)} تومان</div>
                </div>
                <div class="stat-box profit ${profitValue >= 0 ? 'positive' : ''}">
                  <span class="stat-icon">${profitValue >= 0 ? '📈' : '📉'}</span>
                  <div class="stat-label">سود نهایی</div>
                  <div class="stat-value profit-color ${profitValue >= 0 ? 'positive' : ''}">
                    ${formatPrice(Math.abs(profitValue))} ${profitValue < 0 ? '⚠️' : ''}
                  </div>
                  <div class="stat-words">${profitValue >= 0 ? 'سود' : 'زیان'} ${numberToWords(Math.abs(profitValue))} تومان</div>
                </div>
              </div>
            </div>
            
            <div class="print-actions">
              <button class="print-btn" onclick="window.print()">🖨️ چاپ صورتحساب</button>
              <button class="back-btn" onclick="window.close()">✖️ بستن</button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setSelectedCar(null);
  }, 100);
};

  const openRestoreModal = (car) => {
    setCarToRestore(car);
    setShowRestoreModal(true);
  };

const confirmRestore = async () => {
  if (!carToRestore) return;
  
  try {
    const originalCarId = carToRestore.originalCar?.id;
    
    if (originalCarId) {
      const carRef = ref(db, `users_emails/${emailKey}/cars/${originalCarId}`);
      await update(carRef, { 
        sold: false,  // ← این خط مهمه
        soldAt: null,
        sellingPrice: null,
        newBuyerName: null
      });
      
      const savedExpenses = carToRestore.expenses || {};
      for (const [expId, expData] of Object.entries(savedExpenses)) {
        const expenseRef = ref(db, `users_emails/${emailKey}/expenses/${expId}`);
        await set(expenseRef, {
          ...expData,
          carId: originalCarId,
          carName: carToRestore.originalCar?.carName,
          restoredAt: new Date().toISOString()
        });
      }
    }
    
    const archiveRef = ref(db, `users_emails/${emailKey}/archivedCars/${carToRestore.id}`);
    await remove(archiveRef);
    
    showToast(`✅ خودرو "${carToRestore.originalCar?.carName}" با موفقیت به لیست فعال بازگردانده شد`, "success");
    setArchivedCars(prev => prev.filter(c => c.id !== carToRestore.id));
    
    if (onRestoreSuccess) onRestoreSuccess();
    
    setTimeout(() => {
      if (onBack) onBack();
    }, 1500);
    
  } catch (error) {
    console.error("خطا:", error);
    showToast(`❌ خطا در بازگرداندن خودرو`, "error");
  } finally {
    setShowRestoreModal(false);
    setCarToRestore(null);
  }
};

  const filteredCars = archivedCars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (car.originalCar?.carName && car.originalCar.carName.toLowerCase().includes(searchLower)) ||
      (car.newBuyerName && car.newBuyerName.toLowerCase().includes(searchLower))
    );
  });

  // ========== محاسبات ==========
  const totalProfit = filteredCars.reduce((sum, car) => {
    const profit = calculateProfit(car);
    return sum + (profit > 0 ? profit : 0);
  }, 0);
  const totalSales = filteredCars.reduce((sum, c) => sum + (c.sellingPrice || 0), 0);
  
  // ===== جدید: مجموع کل هزینه‌های همه خودروهای بایگانی شده =====
  const totalArchivedExpenses = archivedCars.reduce((sum, car) => {
    const carExpenses = car.totalExpense || (car.expenses ? Object.values(car.expenses).reduce((s, exp) => s + (exp.amount || 0), 0) : 0);
    return sum + carExpenses;
  }, 0);

  const getCardColor = (index) => {
    const colors = [
      { header: "linear-gradient(135deg, #3b82f6, #2563eb)" },
      { header: "linear-gradient(135deg, #10b981, #059669)" },
      { header: "linear-gradient(135deg, #f59e0b, #d97706)" },
      { header: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
      { header: "linear-gradient(135deg, #ec4899, #db2777)" },
      { header: "linear-gradient(135deg, #06b6d4, #0891b2)" },
    ];
    return colors[index % colors.length];
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
        <p>در حال بارگذاری...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
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

      <div style={headerButtonsStyle}>
        <button onClick={onBack} style={backBtnStyle}>← بازگشت</button>
        <div style={pageTitleWrapper}>
          <h2 style={pageTitleTextStyle}>📦 بایگانی خودروهای فروخته شده</h2>
        </div>
        <div style={{ width: "80px" }}></div>
      </div>

      {/* ===== ۴ باکس آماری ===== */}
      <div style={statsContainerStyle}>
        {/* 1. خودروهای فروخته شده */}
        <div style={statCardStyle}>
          <span style={statIconStyle}>🚗</span>
          <div>
            <div style={statValueStyle}>{filteredCars.length}</div>
            <div style={statLabelStyle}>خودروهای فروخته شده</div>
          </div>
        </div>
        
        {/* 2. مجموع فروش */}
        <div style={statCardStyle2}>
          <span style={statIconStyle}>💰</span>
          <div>
            <div style={statValueStyle}>{totalSales.toLocaleString()}</div>
            <div style={statLabelStyle}>مجموع فروش (تومان)</div>
            <div style={statWordsSmall}>{numberToWords(totalSales)} تومان</div>
          </div>
        </div>
        
        {/* 3. مجموع سود نهایی */}
        <div style={statCardStyle3}>
          <span style={statIconStyle}>📊</span>
          <div>
            <div style={statValueStyle}>{totalProfit.toLocaleString()} تومان</div>
            <div style={statLabelStyle}>مجموع سود نهایی</div>
            <div style={statWordsSmall}>{numberToWords(totalProfit)} تومان</div>
          </div>
        </div>
        
        {/* 4. مجموع کل هزینه‌های خودروها (NEW) */}
        <div style={statCardStyle4}>
          <span style={statIconStyle}>🔧</span>
          <div>
            <div style={statValueStyle}>{totalArchivedExpenses.toLocaleString()} تومان</div>
            <div style={statLabelStyle}>مجموع هزینه‌های خودروها</div>
            <div style={statWordsSmall}>{numberToWords(totalArchivedExpenses)} تومان</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div style={{ position: "relative", maxWidth: "350px" }}>
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8" }}>🔍</span>
          <input
            type="text"
            placeholder="جستجو در نام خودرو یا خریدار جدید..."
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
        <div style={emptyStyle}>
          <span style={{ fontSize: "48px" }}>📦</span>
          <p>هیچ خودروی فروخته شده‌ای وجود ندارد</p>
        </div>
      ) : (
        <div style={carsGridStyle}>
          {filteredCars.map((car, index) => {
            const purchasePrice = Number(car.purchasePrice) || Number(car.originalCar?.purchasePrice) || 0;
            const totalExpenses = car.totalExpense || (car.expenses ? Object.values(car.expenses).reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0);
            const totalCost = purchasePrice + totalExpenses;
            const profitValue = (Number(car.sellingPrice) || 0) - totalCost;
            const cardColor = getCardColor(index);
            
            const carInfo = car.originalCar || {};
            
            return (
              <div key={car.id} style={archiveCardStyle}>
                <div style={{...archiveHeaderStyle, background: cardColor.header}}>
                  <h3 style={archiveTitleStyle}>🚗 {carInfo.carName || "-"}</h3>
                  <span style={archiveBadgeStyle}>فروخته شده</span>
                </div>

                <div style={archiveContentStyle}>
                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📋 اطلاعات خریدار</h4>
                    <div style={infoRowStyle}>
                      <span>خریدار قبلی:</span>
                      <div style={rightBoxStyle('buyer')}>{carInfo.buyerName || "-"}</div>
                    </div>
                    <div style={infoRowStyle}>
                      <span>تاریخ خرید:</span>
                      <div style={rightBoxStyle('date')}>{safeConvertToPersianDate(carInfo.purchaseDate) || "-"}</div>
                    </div>
                  </div>

                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📋 اطلاعات فروش</h4>
                    <div style={infoRowStyle}>
                      <span>خریدار جدید:</span>
                      <div style={{...rightBoxStyle('buyer'), backgroundColor: "#fef3c7", color: "#b45309" }}>{car.newBuyerName}</div>
                    </div>
                    <div style={infoRowStyle}>
                      <span>تاریخ فروش:</span>
                      <div style={rightBoxStyle('date')}>{safeConvertToPersianDate(car.sellDate)}</div>
                    </div>
                  </div>

                  <div style={carSpecsStyle}>
                    <h4 style={specsTitleStyle}>🚘 مشخصات خودرو</h4>
                    <div style={specsGridStyle}>
                      <div style={specsItemStyle}>
                        <span style={specsLabelStyle}>📅 سال تولید:</span>
                        <span style={specsValueStyle}>{carInfo.productionYear || "-"}</span>
                      </div>
                      <div style={specsItemStyle}>
                        <span style={specsLabelStyle}>🎨 رنگ:</span>
                        <span style={specsValueStyle}>{carInfo.color || "-"}</span>
                      </div>
                    </div>
                    {(carInfo.description || car.originalCar?.description) && (
                      <div style={specsItemStyle}>
                        <span style={specsLabelStyle}>📝 توضیحات:</span>
                        <span style={specsValueStyle}>{carInfo.description || car.originalCar?.description}</span>
                      </div>
                    )}
                  </div>

                  {car.expenses && Object.keys(car.expenses).length > 0 && (
                    <div style={expenseSectionStyle}>
                      <h4 style={sectionTitleStyle}>🔧 هزینه‌های ثبت شده</h4>
                      <div style={expenseListStyle}>
                        {Object.entries(car.expenses).slice(0, 4).map(([expId, exp]) => (
                          <div key={expId} style={{...expenseCategoryItem, borderRight: `3px solid ${getCategoryLabel(exp.category).color}`}}>
                            <div style={expenseCategoryHeader}>
                              <span>{getCategoryLabel(exp.category).icon} {getCategoryLabel(exp.category).label}</span>
                              <span>{formatPrice(exp.amount)} تومان</span>
                            </div>
                            {exp.description && <div style={expenseDescStyle}>{exp.description}</div>}
                            <div style={tinyWordsStyle}>{numberToWords(exp.amount)} تومان</div>
                          </div>
                        ))}
                        {Object.keys(car.expenses).length > 4 && (
                          <div style={moreExpenseStyle}>+ {Object.keys(car.expenses).length - 4} هزینه دیگر</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "#f1f5f9", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>💰 مبلغ خرید</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{formatPrice(purchasePrice)}</div>
                      <div style={{ fontSize: "9px", color: "#10b981" }}>{numberToWords(purchasePrice)}</div>
                    </div>
                    <div style={{ background: "#fef3c7", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#d97706", marginBottom: "4px" }}>🔧 مجموع هزینه‌ها</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#d97706" }}>{formatPrice(totalExpenses)}</div>
                      <div style={{ fontSize: "9px", color: "#f59e0b" }}>{numberToWords(totalExpenses)}</div>
                    </div>
                    <div style={{ background: "#ede9fe", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#7c3aed", marginBottom: "4px" }}>💰 هزینه کل</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#7c3aed" }}>{formatPrice(totalCost)}</div>
                      <div style={{ fontSize: "9px", color: "#8b5cf6" }}>{numberToWords(totalCost)}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "#dcfce7", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#16a34a", marginBottom: "4px" }}>💵 قیمت فروش</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#16a34a" }}>{formatPrice(car.sellingPrice)}</div>
                      <div style={{ fontSize: "9px", color: "#10b981" }}>{numberToWords(car.sellingPrice)}</div>
                    </div>
                    <div style={{ background: profitValue >= 0 ? "#fef3c7" : "#fee2e2", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: profitValue >= 0 ? "#d97706" : "#dc2626", marginBottom: "4px" }}>📊 سود نهایی</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: profitValue >= 0 ? "#16a34a" : "#dc2626" }}>{formatPrice(Math.abs(profitValue))} {profitValue < 0 ? "(زیان)" : ""}</div>
                      <div style={{ fontSize: "9px", color: profitValue >= 0 ? "#f59e0b" : "#ef4444" }}>{numberToWords(Math.abs(profitValue))}</div>
                    </div>
                  </div>

                  <div style={buttonContainerStyle}>
                    <button onClick={() => handlePrint(car)} style={printBtnStyle}>
                      🖨️ چاپ صورتحساب
                    </button>
                    <button onClick={() => openRestoreModal(car)} style={restoreBtnStyle}>
                      ↩️ بازگشت به لیست فعال
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title="↩️ بازگشت به لیست فعال" color="#10b981" size="sm">
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔄</div>
          <p style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px", color: "#1e293b" }}>بازگشت خودرو به لیست فعال</p>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>خودرو <strong style={{ color: "#f59e0b" }}>"{carToRestore?.originalCar?.carName}"</strong></p>
          <p style={{ fontSize: "13px", color: "#10b981", marginBottom: "24px" }}>به لیست خودروهای فعال بازگردانده می‌شود.</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => setShowRestoreModal(false)} style={{ padding: "10px 24px", background: "#64748b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer" }}>انصراف</button>
            <button onClick={confirmRestore} style={{ padding: "10px 24px", background: "#10b981", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>↩️ تایید و بازگشت</button>
          </div>
        </div>
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

// ===== استایل‌ها =====
const toastStyle = { position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "12px", color: "#fff", fontSize: "14px", fontWeight: "500", zIndex: 10000, display: "flex", alignItems: "center", gap: "10px" };
const emptyStyle = { textAlign: "center", padding: "60px", background: "#fff", borderRadius: "12px" };

const headerButtonsStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "16px", flexWrap: "wrap" };
const backBtnStyle = { background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" };
const pageTitleWrapper = { flex: 1, textAlign: "center" };
const pageTitleTextStyle = { fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: 0 };

// ===== ۴ ستونه =====
const statsContainerStyle = { 
  display: "grid", 
  gridTemplateColumns: "repeat(4, 1fr)", 
  gap: "16px", 
  marginBottom: "24px" 
};

// ===== استایل‌های ۴ باکس =====
const statCardStyle = { background: "linear-gradient(135deg, #64748b, #475569)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" };
const statCardStyle2 = { background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" };
const statCardStyle3 = { background: "linear-gradient(135deg, #10b981, #059669)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" };
const statCardStyle4 = { background: "linear-gradient(135deg, #f43f5e, #e11d48)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" };

const statIconStyle = { fontSize: "32px" };
const statValueStyle = { fontSize: "24px", fontWeight: "bold" };
const statLabelStyle = { fontSize: "12px", opacity: 0.9 };
const statWordsSmall = { fontSize: "10px", opacity: 0.8, marginTop: "5px" };

const carsGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", alignItems: "start" };
const archiveCardStyle = { background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transition: "all 0.3s" };
const archiveHeaderStyle = { padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const archiveTitleStyle = { margin: 0, fontSize: "16px", fontWeight: "bold", color: "#fff" };
const archiveBadgeStyle = { background: "#f59e0b", padding: "4px 12px", borderRadius: "30px", fontSize: "11px", color: "#fff", fontWeight: "bold" };
const archiveContentStyle = { padding: "20px" };

const infoSectionStyle = { marginBottom: "16px", padding: "12px", background: "#f8fafc", borderRadius: "14px" };
const sectionTitleStyle = { fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "10px", paddingBottom: "6px", borderBottom: "2px solid #e2e8f0" };
const infoRowStyle = { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", alignItems: "flex-start", flexWrap: "wrap", gap: "6px" };

const carSpecsStyle = { marginBottom: "16px", padding: "12px", background: "#f0fdf4", borderRadius: "14px", borderRight: "2px solid #86efac" };
const specsTitleStyle = { fontSize: "13px", fontWeight: "bold", color: "#166534", marginBottom: "10px", paddingBottom: "6px", borderBottom: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "8px" };
const specsGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" };
const specsItemStyle = { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", flexWrap: "wrap", gap: "6px" };
const specsLabelStyle = { color: "#64748b", fontWeight: "500" };
const specsValueStyle = { fontWeight: "600", color: "#1e293b" };

const expenseSectionStyle = { marginBottom: "16px", padding: "12px", background: "#fef3c7", borderRadius: "14px" };
const expenseListStyle = { display: "flex", flexDirection: "column", gap: "8px" };
const expenseCategoryItem = { background: "#fff", padding: "8px", borderRadius: "8px", marginBottom: "6px" };
const expenseCategoryHeader = { display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px", fontWeight: "bold" };
const expenseDescStyle = { fontSize: "10px", color: "#64748b", marginTop: "4px" };
const moreExpenseStyle = { fontSize: "10px", color: "#f59e0b", textAlign: "center", marginTop: "6px" };

const buttonContainerStyle = { display: "flex", gap: "10px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" };
const printBtnStyle = { flex: 1, padding: "8px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" };
const restoreBtnStyle = { flex: 1, padding: "8px", background: "#10b981", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" };
const tinyWordsStyle = { fontSize: "8px", color: "#94a3b8", marginTop: "2px", textAlign: "left" };

export default ArchivedCars;