import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, get, push, set, remove, onValue } from "firebase/database";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BackupManager = ({ user, onBack }) => {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingJSON, setLoadingJSON] = useState(false);
  const [toast, setToast] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [loading, setLoading] = useState(true);

  const emailKey = user?.email?.replace(/\./g, '_').replace(/@/g, '_at_') || "";

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // بارگذاری تاریخچه بکاپ‌ها از Firebase
  useEffect(() => {
    if (!user || !emailKey) {
      setLoading(false);
      return;
    }
    
    const historyRef = ref(db, `users_emails/${emailKey}/backupHistory`);
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => b.id - a.id);
        setBackupHistory(historyArray);
      } else {
        setBackupHistory([]);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, emailKey]);

  const saveBackupHistory = async (type, fileName) => {
    try {
      const historyRef = ref(db, `users_emails/${emailKey}/backupHistory`);
      const newHistoryRef = push(historyRef);
      await set(newHistoryRef, {
        type: type,
        fileName: fileName,
        date: new Date().toISOString(),
        datePersian: new Intl.DateTimeFormat('fa-IR').format(new Date())
      });
    } catch (error) {
      console.error("خطا در ذخیره تاریخچه:", error);
    }
  };

  // دریافت تمام داده‌های کاربر
  const getAllUserData = async () => {
    const paths = ['cars', 'customers', 'officeExpenses', 'incomes', 'expenses', 'archivedCars'];
    const data = {};
    
    for (const path of paths) {
      const dataRef = ref(db, `users_emails/${emailKey}/${path}`);
      const snapshot = await get(dataRef);
      if (snapshot.exists()) {
        data[path] = snapshot.val();
      } else {
        data[path] = {};
      }
    }
    
    return {
      userId: user.uid,
      userEmail: user.email,
      exportDate: new Date().toISOString(),
      exportDatePersian: new Intl.DateTimeFormat('fa-IR').format(new Date()),
      data: data
    };
  };

  // تبدیل داده به فرمت مناسب برای Excel
  const convertToExcelFormat = (data) => {
    const sheets = {};
    
    for (const [key, value] of Object.entries(data.data)) {
      if (value && Object.keys(value).length > 0) {
        const items = Object.entries(value).map(([id, item]) => ({
          id: id,
          ...item
        }));
        sheets[key] = XLSX.utils.json_to_sheet(items);
      } else {
        sheets[key] = XLSX.utils.json_to_sheet([{ message: "هیچ داده‌ای وجود ندارد" }]);
      }
    }
    
    return sheets;
  };

  // بکاپ Excel
  const backupToExcel = async () => {
    setLoadingExcel(true);
    try {
      const allData = await getAllUserData();
      const sheets = convertToExcelFormat(allData);
      
      const workbook = XLSX.utils.book_new();
      for (const [sheetName, sheetData] of Object.entries(sheets)) {
        XLSX.utils.book_append_sheet(workbook, sheetData, sheetName);
      }
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const fileName = `backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);
      
      await saveBackupHistory('Excel', fileName);
      showToast("✅ بکاپ Excel با موفقیت ذخیره شد", "success");
    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ایجاد بکاپ Excel", "error");
    } finally {
      setLoadingExcel(false);
    }
  };

  // بکاپ JSON
  const backupToJSON = async () => {
    setLoadingJSON(true);
    try {
      const allData = await getAllUserData();
      const jsonStr = JSON.stringify(allData, null, 2);
      const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([jsonStr], { type: 'application/json' });
      saveAs(blob, fileName);
      
      await saveBackupHistory('JSON', fileName);
      showToast("✅ بکاپ JSON با موفقیت ذخیره شد", "success");
    } catch (error) {
      console.error("خطا:", error);
      showToast("❌ خطا در ایجاد بکاپ JSON", "error");
    } finally {
      setLoadingJSON(false);
    }
  };

  const deleteHistoryItem = async (itemId) => {
    try {
      await remove(ref(db, `users_emails/${emailKey}/backupHistory/${itemId}`));
      showToast("✅ آیتم از تاریخچه حذف شد", "success");
    } catch (error) {
      showToast("❌ خطا در حذف آیتم", "error");
    }
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
      </div>

      <div style={pageTitleStyle}>
        <h2 style={pageTitleTextStyle}>💾 مدیریت بکاپ</h2>
        <p style={pageSubtitleStyle}>از اطلاعات خود به صورت دوره‌ای بکاپ بگیرید</p>
      </div>

      <div style={cardsContainerStyle}>
        <div style={cardStyle}>
          <div style={cardIconStyle}>📊</div>
          <h3 style={cardTitleStyle}>بکاپ Excel</h3>
          <p style={cardDescStyle}>گرفتن بکاپ از تمام اطلاعات در قالب فایل Excel</p>
          <p style={cardNoteStyle}>✅ مناسب برای گزارش‌گیری و تحلیل داده</p>
          <button onClick={backupToExcel} disabled={loadingExcel} style={{...cardBtnStyle, backgroundColor: "#10b981"}}>
            {loadingExcel ? "در حال ایجاد..." : "📥 دریافت بکاپ Excel"}
          </button>
        </div>

        <div style={cardStyle}>
          <div style={cardIconStyle}>📄</div>
          <h3 style={cardTitleStyle}>بکاپ JSON</h3>
          <p style={cardDescStyle}>گرفتن بکاپ از تمام اطلاعات در قالب فایل JSON</p>
          <p style={cardNoteStyle}>✅ مناسب برای بازیابی اطلاعات و پشتیبان‌گیری</p>
          <button onClick={backupToJSON} disabled={loadingJSON} style={{...cardBtnStyle, backgroundColor: "#3b82f6"}}>
            {loadingJSON ? "در حال ایجاد..." : "📥 دریافت بکاپ JSON"}
          </button>
        </div>
      </div>

      <div style={infoBoxStyle}>
        <h4 style={infoTitleStyle}>🔄 بکاپ خودکار</h4>
        <p style={infoTextStyle}>
          فایل‌های بکاپ در کامپیوتر شما ذخیره می‌شوند و تاریخچه بکاپ‌ها در دیتابیس ذخیره می‌گردد.
        </p>
        <p style={infoNoteStyle}>
          💡 برای امنیت بیشتر، توصیه می‌شود فایل‌های بکاپ را در فضای ابری (Google Drive، Dropbox و ...) نیز ذخیره کنید.
        </p>
      </div>

      {backupHistory.length > 0 && (
        <div style={historyBoxStyle}>
          <h4 style={historyTitleStyle}>📋 تاریخچه بکاپ‌های اخیر</h4>
          <div style={historyListStyle}>
            {backupHistory.map((item) => (
              <div key={item.id} style={historyItemStyle}>
                <div>
                  <span style={historyTypeStyle}>{item.type === 'Excel' ? '📊 Excel' : '📄 JSON'}</span>
                  <span style={historyDateStyle}>{item.datePersian}</span>
                </div>
                <div>
                  <span style={historyFileNameStyle}>{item.fileName}</span>
                  <button onClick={() => deleteHistoryItem(item.id)} style={historyDeleteStyle}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const toastStyle = {
  position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "12px", color: "#fff", fontSize: "14px", zIndex: 10000, display: "flex", alignItems: "center", gap: "10px"
};

const headerButtonsStyle = {
  display: "flex",
  justifyContent: "flex-start",
  marginBottom: "20px"
};

const backBtnStyle = {
  background: "#64748b",
  color: "#fff",
  border: "none",
  padding: "8px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "13px"
};

const pageTitleStyle = {
  textAlign: "center",
  marginBottom: "30px"
};

const pageTitleTextStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1e293b",
  marginBottom: "8px"
};

const pageSubtitleStyle = {
  fontSize: "14px",
  color: "#64748b"
};

const cardsContainerStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "24px",
  marginBottom: "30px"
};

const cardStyle = {
  background: "#fff",
  borderRadius: "20px",
  padding: "24px",
  textAlign: "center",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  transition: "all 0.3s"
};

const cardIconStyle = {
  fontSize: "48px",
  marginBottom: "16px"
};

const cardTitleStyle = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#1e293b",
  marginBottom: "12px"
};

const cardDescStyle = {
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "16px"
};

const cardNoteStyle = {
  fontSize: "11px",
  color: "#10b981",
  marginBottom: "20px"
};

const cardBtnStyle = {
  width: "100%",
  padding: "12px",
  border: "none",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "all 0.3s"
};

const infoBoxStyle = {
  background: "#f0fdf4",
  padding: "16px",
  borderRadius: "16px",
  marginBottom: "30px",
  borderRight: "4px solid #10b981"
};

const infoTitleStyle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1e293b",
  marginBottom: "12px"
};

const infoTextStyle = {
  fontSize: "13px",
  color: "#475569",
  marginBottom: "8px"
};

const infoNoteStyle = {
  fontSize: "12px",
  color: "#10b981"
};

const historyBoxStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const historyTitleStyle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1e293b",
  marginBottom: "16px",
  paddingBottom: "8px",
  borderBottom: "1px solid #e2e8f0"
};

const historyListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const historyItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  background: "#f8fafc",
  borderRadius: "12px",
  flexWrap: "wrap",
  gap: "8px"
};

const historyTypeStyle = {
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "11px",
  fontWeight: "bold",
  background: "#e2e8f0",
  color: "#475569",
  marginRight: "12px"
};

const historyDateStyle = {
  fontSize: "12px",
  color: "#64748b"
};

const historyFileNameStyle = {
  fontSize: "12px",
  color: "#1e293b",
  marginRight: "12px"
};

const historyDeleteStyle = {
  background: "#fee2e2",
  border: "none",
  padding: "4px 8px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px"
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

export default BackupManager;