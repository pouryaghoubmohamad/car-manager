import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";

const ArchivedCars = ({ user, onBack }) => {
  const [archivedCars, setArchivedCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const emailKey = user?.email?.replace(/\./g, '_').replace(/@/g, '_at_') || "";

  useEffect(() => {
    if (!user || !emailKey) {
      setLoading(false);
      return;
    }
    const archiveRef = ref(db, `users_emails/${emailKey}/archivedCars`);
    const unsubscribe = onValue(archiveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const carsArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value,
          expenses: value.expenses || []
        })).reverse();
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
      if (dateValue instanceof Date) {
        if (isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(dateValue);
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

  const columnTitleStyle = (isProfit = true) => ({
    fontSize: "11px",
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: "6px",
    paddingBottom: "4px",
    borderBottom: `2px solid ${isProfit ? "#f59e0b" : "#ef4444"}`
  });

  const wordsStyle = { fontSize: "9px", color: "#64748b", marginTop: "3px", textAlign: "left" };
  const tinyWordsStyle = { fontSize: "8px", color: "#94a3b8", marginTop: "2px", textAlign: "left" };

  const handlePrint = (car) => {
    setSelectedCar(car);
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      
      const purchasePrice = car.purchasePrice || car.originalCar?.purchasePrice || 0;
      const totalExpenses = car.totalExpense || (car.expenses ? Object.values(car.expenses).reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0);
      const totalCostWithPurchase = car.totalCost || (purchasePrice + totalExpenses);
      
      const expensesByCategory = {};
      if (car.expenses && Object.keys(car.expenses).length > 0) {
        Object.values(car.expenses).forEach(exp => {
          const category = exp.category || 'other';
          if (!expensesByCategory[category]) {
            expensesByCategory[category] = [];
          }
          expensesByCategory[category].push(exp);
        });
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>صورتحساب فروش خودرو ${car.originalCar?.carName}</title>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap');
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Vazirmatn', 'Vazir', 'IRANSans', Tahoma, sans-serif;
                direction: rtl;
                padding: 20px;
                margin: 0;
                background: #f0f4f8;
              }
              .invoice {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              }
              .header {
                background: linear-gradient(135deg, #1e293b, #334155);
                padding: 20px;
                text-align: center;
                color: white;
              }
              .header h1 { font-size: 22px; margin-bottom: 6px; }
              .header p { font-size: 12px; opacity: 0.8; }
              .content { padding: 20px; }
              .section {
                margin-bottom: 20px;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                overflow: hidden;
              }
              .section-title {
                background: #f8fafc;
                padding: 10px 16px;
                font-weight: bold;
                color: #1e293b;
                border-bottom: 2px solid #e2e8f0;
                font-size: 13px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                padding: 16px;
              }
              .info-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 6px 0;
                border-bottom: 1px dashed #e2e8f0;
                font-size: 12px;
              }
              .info-label { font-weight: 600; color: #64748b; }
              .right-box {
                background: #f1f5f9;
                border-radius: 10px;
                padding: 6px 10px;
                text-align: left;
                font-size: 12px;
              }
              .right-box-blue {
                background: #e0f2fe;
                border-radius: 10px;
                padding: 6px 10px;
                text-align: left;
                font-weight: bold;
                color: #0284c7;
                font-size: 12px;
              }
              .right-box-date {
                background: #dbeafe;
                border-radius: 10px;
                padding: 6px 10px;
                text-align: left;
                color: #1e40af;
                font-weight: 500;
                font-size: 12px;
              }
              .amount-word {
                font-size: 10px;
                color: #10b981;
                margin-top: 3px;
                text-align: left;
              }
              .three-cols {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 16px;
              }
              .col-card {
                background: #f8fafc;
                border-radius: 12px;
                padding: 8px;
                text-align: center;
              }
              .col-title {
                font-size: 11px;
                font-weight: bold;
                color: #64748b;
                margin-bottom: 6px;
                padding-bottom: 4px;
                border-bottom: 2px solid #f59e0b;
              }
              .print-buttons {
                display: flex;
                gap: 12px;
                justify-content: center;
                padding: 20px;
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
              }
              .print-btn, .back-btn {
                padding: 10px 24px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                font-family: inherit;
                transition: all 0.2s;
              }
              .print-btn {
                background: #f59e0b;
                color: white;
              }
              .print-btn:hover {
                background: #d97706;
              }
              .back-btn {
                background: #64748b;
                color: white;
              }
              .back-btn:hover {
                background: #475569;
              }
              @media print {
                body { padding: 0; background: white; }
                .print-buttons { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="invoice">
              <div class="header">
                <h1>🚗 صورتحساب فروش خودرو</h1>
                <p>تاریخ: ${safeConvertToPersianDate(car.soldAt)}</p>
                <p>شماره فاکتور: ${car.id.slice(-8)}</p>
              </div>
              
              <div class="content">
                <div class="section">
                  <div class="section-title">📋 اطلاعات خودرو</div>
                  <div class="info-grid">
                    <div class="info-item"><span class="info-label">نام خودرو:</span><div class="right-box">${car.originalCar?.carName}</div></div>
                    <div class="info-item"><span class="info-label">خریدار قبلی:</span><div class="right-box-blue">${car.originalCar?.buyerName}</div></div>
                    <div class="info-item"><span class="info-label">خریدار جدید:</span><div class="right-box-blue" style="background:#fef3c7; color:#b45309">${car.newBuyerName}</div></div>
                    <div class="info-item"><span class="info-label">تاریخ خرید:</span><div class="right-box-date">${safeConvertToPersianDate(car.originalCar?.purchaseDate)}</div></div>
                    <div class="info-item"><span class="info-label">تاریخ فروش:</span><div class="right-box-date">${safeConvertToPersianDate(car.sellDate)}</div></div>
                  </div>
                </div>
                
                <div class="three-cols">
                  <div class="col-card">
                    <div class="col-title">💰 مبلغ خرید</div>
                    <div class="right-box">
                      <div style="font-size:14px; font-weight:bold">${formatPrice(purchasePrice)} تومان</div>
                      <div class="amount-word">${numberToWords(purchasePrice)} تومان</div>
                    </div>
                  </div>
                  <div class="col-card">
                    <div class="col-title">🔧 مجموع هزینه‌ها</div>
                    <div style="background:#fef3c7; border-radius:10px; padding:6px 10px; text-align:left">
                      <div style="font-weight:bold; color:#f59e0b; font-size:14px">${formatPrice(totalExpenses)} تومان</div>
                      <div class="amount-word">${numberToWords(totalExpenses)} تومان</div>
                    </div>
                  </div>
                  <div class="col-card">
                    <div class="col-title">💰 هزینه کل</div>
                    <div style="background:#ede9fe; border-radius:10px; padding:6px 10px; text-align:left">
                      <div style="font-weight:bold; color:#7c3aed; font-size:14px">${formatPrice(totalCostWithPurchase)} تومان</div>
                      <div class="amount-word">${numberToWords(totalCostWithPurchase)} تومان</div>
                    </div>
                  </div>
                </div>
                
                <div class="three-cols">
                  <div class="col-card">
                    <div class="col-title">💵 قیمت فروش</div>
                    <div style="background:#dcfce7; border-radius:10px; padding:6px 10px; text-align:left">
                      <div style="color:#16a34a; font-weight:bold; font-size:14px">${formatPrice(car.sellingPrice)} تومان</div>
                      <div class="amount-word">${numberToWords(car.sellingPrice)} تومان</div>
                    </div>
                  </div>
                  <div class="col-card">
                    <div class="col-title" style="border-bottom-color: ${car.profit >= 0 ? '#f59e0b' : '#ef4444'}">📊 سود نهایی</div>
                    <div style="background: ${car.profit >= 0 ? '#fef3c7' : '#fee2e2'}; border-radius: 10px; padding: 6px 10px; text-align: left;">
                      <div style="font-weight:bold; color: ${car.profit >= 0 ? '#16a34a' : '#dc2626'}; font-size:14px">
                        ${formatPrice(Math.abs(car.profit))} تومان ${car.profit < 0 ? '(زیان)' : ''}
                      </div>
                      <div class="amount-word">${numberToWords(Math.abs(car.profit))} تومان</div>
                    </div>
                  </div>
                  <div class="col-card"></div>
                </div>
                
                <div class="section">
                  <div class="section-title">🔧 هزینه‌های ثبت شده</div>
                  <div style="padding: 16px;">
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
            <div style="background:#f8fafc; margin-bottom:12px; border-radius:12px; overflow:hidden">
              <div style="background:${catInfo.color}; padding:10px 16px; color:white; font-weight:bold; font-size:13px">
                ${catInfo.icon} ${catInfo.label} (${exps.length} مورد) - جمع: ${formatPrice(catTotal)} تومان
              </div>
          `);
          exps.forEach(exp => {
            printWindow.document.write(`
              <div style="display:flex; justify-content:space-between; padding:8px 16px; border-bottom:1px solid #e2e8f0; font-size:13px">
                <span>${exp.description || 'بدون توضیحات'}</span>
                <div>
                  <div>${formatPrice(exp.amount)} تومان</div>
                  <div class="amount-word">${numberToWords(exp.amount)} تومان</div>
                </div>
              </div>
            `);
          });
          printWindow.document.write(`</div>`);
        }
      } else {
        printWindow.document.write(`<div style="text-align:center; padding:16px;">هیچ هزینه‌ای ثبت نشده است</div>`);
      }
      
      printWindow.document.write(`
                  </div>
                </div>
                
                ${car.description ? `<div class="section"><div class="section-title">📝 توضیحات</div><div style="padding:16px">${car.description}</div></div>` : ''}
              </div>
              
              <div class="print-buttons">
                <button class="print-btn" onclick="window.print()">🖨️ چاپ</button>
                <button class="back-btn" onclick="window.close()">✖️ برگشت</button>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setSelectedCar(null);
    }, 100);
  };

  const filteredCars = archivedCars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (car.originalCar?.carName && car.originalCar.carName.toLowerCase().includes(searchLower)) ||
      (car.newBuyerName && car.newBuyerName.toLowerCase().includes(searchLower))
    );
  });

  const inputStyle = (index, focusedIndex) => ({
    padding: "8px 10px",
    borderRadius: "8px",
    width: "100%",
    maxWidth: "700px",
    margin: "0 auto",
    boxSizing: "border-box",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    color: "#000000",
    border: focusedIndex === index ? "2px solid #3b82f6" : "1px solid #d1d5db",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    marginBottom: "12px",
    fontFamily: "inherit",
    display: "block"
  });

  const labelStyle = {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "6px",
    display: "block",
    fontWeight: "500",
    maxWidth: "700px",
    margin: "0 auto 6px auto"
  };

  // استایل بارگذاری
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

  const loadingText = {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "500"
  };

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={loadingSpinner}></div>
        <p style={loadingText}>در حال بارگذاری...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={headerButtonsStyle}>
        <button onClick={onBack} style={backBtnStyle}>← بازگشت</button>
        <div style={pageTitleWrapper}>
          <h2 style={pageTitleTextStyle}>📦 بایگانی خودروهای فروخته شده</h2>
        </div>
        <div style={{ width: "80px" }}></div>
      </div>

      <div style={statsContainerStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🚗</div>
          <div>
            <div style={statValueStyle}>{filteredCars.length}</div>
            <div style={statLabelStyle}>خودروهای فروخته شده</div>
          </div>
        </div>
        <div style={statCardStyle2}>
          <div style={statIconStyle}>💰</div>
          <div>
            <div style={statValueStyle}>
              {filteredCars.reduce((sum, c) => sum + (c.sellingPrice || 0), 0).toLocaleString()}
            </div>
            <div style={statLabelStyle}>مجموع فروش (تومان)</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle}>🔍 جستجو</label>
        <input
          type="text"
          placeholder="جستجو در نام خودرو یا خریدار جدید..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={inputStyle(999, focusedIndex)}
          onFocus={() => setFocusedIndex(999)}
          onBlur={() => setFocusedIndex(null)}
        />
      </div>

      {filteredCars.length === 0 ? (
        <div style={emptyStyle}>
          <span style={{ fontSize: "48px" }}>📦</span>
          <p>هیچ خودروی فروخته شده‌ای وجود ندارد</p>
        </div>
      ) : (
        <div style={carsGridStyle}>
          {filteredCars.map((car) => {
            const purchasePrice = car.purchasePrice || car.originalCar?.purchasePrice || 0;
            const totalExpenses = car.totalExpense || (car.expenses ? Object.values(car.expenses).reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0);
            const totalCostWithPurchase = car.totalCost || (purchasePrice + totalExpenses);
            
            const expensesByCategory = {};
            if (car.expenses && Object.keys(car.expenses).length > 0) {
              Object.values(car.expenses).forEach(exp => {
                const cat = exp.category || 'other';
                if (!expensesByCategory[cat]) {
                  expensesByCategory[cat] = [];
                }
                expensesByCategory[cat].push(exp);
              });
            }
            
            return (
              <div key={car.id} style={archiveCardStyle}>
                <div style={archiveHeaderStyle}>
                  <h3 style={archiveTitleStyle}>🚗 {car.originalCar?.carName}</h3>
                  <span style={archiveBadgeStyle}>فروخته شده</span>
                </div>

                <div style={archiveContentStyle}>
                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📋 اطلاعات خریدار</h4>
                    <div style={infoRowStyle}>
                      <span>خریدار قبلی:</span>
                      <div style={rightBoxStyle('buyer')}>{car.originalCar?.buyerName}</div>
                    </div>
                    <div style={infoRowStyle}>
                      <span>تاریخ خرید:</span>
                      <div style={rightBoxStyle('date')}>{safeConvertToPersianDate(car.originalCar?.purchaseDate)}</div>
                    </div>
                  </div>

                  <div style={threeColumnsStyle}>
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle(true)}>💰 مبلغ خرید</div>
                      <div style={rightBoxStyle('purchase')}>
                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>{formatPrice(purchasePrice)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(purchasePrice)} تومان</div>
                      </div>
                    </div>
                    
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle(true)}>🔧 مجموع هزینه‌ها</div>
                      <div style={rightBoxStyle('expense')}>
                        <div style={{ fontWeight: "bold", color: "#f59e0b", fontSize: "14px" }}>{formatPrice(totalExpenses)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(totalExpenses)} تومان</div>
                      </div>
                    </div>
                    
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle(true)}>💰 هزینه کل</div>
                      <div style={rightBoxStyle('total')}>
                        <div style={{ fontWeight: "bold", color: "#7c3aed", fontSize: "14px" }}>{formatPrice(totalCostWithPurchase)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(totalCostWithPurchase)} تومان</div>
                      </div>
                    </div>
                  </div>

                  <div style={threeColumnsStyle}>
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle(true)}>💵 قیمت فروش</div>
                      <div style={rightBoxStyle('selling')}>
                        <div style={{ fontWeight: "bold", color: "#16a34a", fontSize: "14px" }}>{formatPrice(car.sellingPrice)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(car.sellingPrice)} تومان</div>
                      </div>
                    </div>
                    
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle(car.profit >= 0)}>📊 سود نهایی</div>
                      <div style={car.profit >= 0 ? rightBoxStyle('profit') : rightBoxStyle('loss')}>
                        <div style={{ fontWeight: "bold", color: car.profit >= 0 ? "#16a34a" : "#dc2626", fontSize: "14px" }}>
                          {formatPrice(Math.abs(car.profit))} تومان {car.profit < 0 ? "(زیان)" : ""}
                        </div>
                        <div style={tinyWordsStyle}>{numberToWords(Math.abs(car.profit))} تومان</div>
                      </div>
                    </div>
                    
                    <div style={columnCardStyle}></div>
                  </div>

                  {Object.keys(expensesByCategory).length > 0 && (
                    <div style={expenseSectionStyle}>
                      <h4 style={sectionTitleStyle}>🔧 هزینه‌های ثبت شده</h4>
                      <div style={expenseListStyle}>
                        {Object.entries(expensesByCategory).slice(0, 4).map(([cat, exps]) => {
                          const catInfo = getCategoryLabel(cat);
                          const catTotal = exps.reduce((s, e) => s + (e.amount || 0), 0);
                          return (
                            <div key={cat} style={{...expenseCategoryItem, borderRight: `3px solid ${catInfo.color}`}}>
                              <div style={expenseCategoryHeader}>
                                <span>{catInfo.icon} {catInfo.label}</span>
                                <span>{exps.length} مورد</span>
                              </div>
                              <div style={expenseCategoryTotal}>
                                جمع: {formatPrice(catTotal)} تومان
                              </div>
                              <div style={tinyWordsStyle}>{numberToWords(catTotal)} تومان</div>
                            </div>
                          );
                        })}
                        {Object.keys(expensesByCategory).length > 4 && (
                          <div style={moreExpenseStyle}>+ {Object.keys(expensesByCategory).length - 4} دسته دیگر</div>
                        )}
                      </div>
                    </div>
                  )}

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

                  <button onClick={() => handlePrint(car)} style={printBtnStyle}>
                    🖨️ چاپ صورتحساب کامل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// استایل‌ها
const loadingStyle = { textAlign: "center", padding: "40px" };
const emptyStyle = { textAlign: "center", padding: "60px", background: "#fff", borderRadius: "12px" };

const headerButtonsStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px"
};

const backBtnStyle = {
  background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px"
};

const pageTitleWrapper = { flex: 1, textAlign: "center" };
const pageTitleTextStyle = { fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: 0 };

const statsContainerStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" };
const statCardStyle = { background: "linear-gradient(135deg, #64748b, #475569)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statCardStyle2 = { background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statIconStyle = { fontSize: "32px" };
const statValueStyle = { fontSize: "24px", fontWeight: "bold" };
const statLabelStyle = { fontSize: "12px", opacity: 0.9 };

const carsGridStyle = { 
  display: "flex", 
  flexDirection: "column", 
  gap: "20px",
  alignItems: "center"
};

const archiveCardStyle = { 
  background: "#fff", 
  borderRadius: "16px", 
  overflow: "hidden", 
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)", 
  transition: "all 0.3s",
  maxWidth: "700px",
  width: "100%"
};

const archiveHeaderStyle = { background: "linear-gradient(135deg, #475569, #334155)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const archiveTitleStyle = { margin: 0, fontSize: "16px", fontWeight: "bold", color: "#fff" };
const archiveBadgeStyle = { background: "#f59e0b", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "#fff", fontWeight: "bold" };
const archiveContentStyle = { padding: "16px" };

const infoSectionStyle = { marginBottom: "12px", padding: "10px", background: "#f8fafc", borderRadius: "12px" };
const sectionTitleStyle = { fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "10px", paddingBottom: "6px", borderBottom: "2px solid #e2e8f0" };
const infoRowStyle = { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", alignItems: "flex-start", flexWrap: "wrap", gap: "6px" };

const expenseSectionStyle = { marginBottom: "12px", padding: "10px", background: "#fef3c7", borderRadius: "12px" };
const expenseListStyle = { display: "flex", flexDirection: "column", gap: "8px" };
const expenseCategoryItem = { background: "#fff", padding: "8px", borderRadius: "8px" };
const expenseCategoryHeader = { display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px", fontWeight: "bold" };
const expenseCategoryTotal = { fontSize: "12px", fontWeight: "bold", color: "#f59e0b" };
const moreExpenseStyle = { fontSize: "10px", color: "#f59e0b", textAlign: "center", marginTop: "6px" };

const printBtnStyle = {
  width: "100%",
  marginTop: "12px",
  padding: "8px",
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "bold",
  transition: "all 0.3s"
};

export default ArchivedCars;