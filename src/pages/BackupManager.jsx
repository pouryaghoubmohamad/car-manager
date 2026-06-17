import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set } from "firebase/database";
import DataTable from "react-data-table-component";
import Modal from "../Modal";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const BackupManager = ({ user, onBack }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBackup, setNewBackup] = useState({
    name: "",
    description: "",
    downloadJSON: true,
    downloadExcel: true
  });
  const [isCreating, setIsCreating] = useState(false);

  const emailKey = user?.email?.replace(/\./g, '_').replace(/@/g, '_at_') || "";

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ===== دریافت بکاپ‌ها با مرتب‌سازی جدیدترین اول =====
  useEffect(() => {
    if (!user || !emailKey) {
      setLoading(false);
      return;
    }
    const backupsRef = ref(db, `users_emails/${emailKey}/backups`);
    const unsubscribe = onValue(backupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let backupsArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value
        }));
        
        backupsArray.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.timestamp || a.date || 0);
          const dateB = new Date(b.createdAt || b.timestamp || b.date || 0);
          return dateB - dateA;
        });
        
        setBackups(backupsArray);
      } else {
        setBackups([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  // ===== Export کامل از دیتابیس =====
  const handleExport = async () => {
    try {
      showToast("🔄 در حال گرفتن Export کامل...", "info");
      
      const allData = {};
      const paths = [
        'cars',
        'expenses',
        'officeExpenses',
        'incomes',
        'dealerships',
        'customers',
        'profits',
        'archivedCars',
        'backups'
      ];
      
      for (const path of paths) {
        const pathRef = ref(db, `users_emails/${emailKey}/${path}`);
        const snapshot = await new Promise((resolve) => {
          onValue(pathRef, resolve, { onlyOnce: true });
        });
        if (snapshot.exists()) {
          allData[path] = snapshot.val();
        }
      }
      
      const structuredData = {
        users_emails: {
          [emailKey]: allData
        }
      };
      
      const jsonData = JSON.stringify(structuredData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
      const persianDate = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date()).replace(/[/: ]/g, '_');
      
      saveAs(blob, `export_کامل_${persianDate}.json`);
      showToast(`✅ Export کامل با موفقیت ذخیره شد`, "success");
    } catch (error) {
      console.error("Error exporting:", error);
      showToast("❌ خطا در Export", "error");
    }
  };

  // ===== ذخیره بکاپ با ساختار درست (JSON) =====
  const downloadBackupWithPath = (backupData, fileName) => {
    try {
      const structuredData = {
        users_emails: {
          [emailKey]: backupData
        }
      };
      
      const jsonData = JSON.stringify(structuredData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
      
      saveAs(blob, `${fileName}.json`);
      showToast(`✅ فایل JSON با نام ${fileName}.json ذخیره شد`, "success");
      return true;
    } catch (error) {
      console.error("Error saving backup:", error);
      showToast("❌ خطا در ذخیره JSON", "error");
      return false;
    }
  };

  // ===== تبدیل داده به Excel =====
  const convertToExcel = (data, fileName) => {
    try {
      const wb = XLSX.utils.book_new();
      
      const actualData = data[emailKey] || data;
      
      for (const [key, value] of Object.entries(actualData)) {
        if (value && typeof value === 'object') {
          let sheetData = [];
          if (Array.isArray(value)) {
            sheetData = value;
          } else {
            sheetData = Object.values(value);
          }
          
          if (sheetData.length > 0) {
            const ws = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, key);
          }
        }
      }
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      saveAs(blob, `${fileName}.xlsx`);
      showToast(`✅ فایل Excel با نام ${fileName}.xlsx ذخیره شد`, "success");
      return true;
    } catch (error) {
      console.error("Error creating Excel:", error);
      showToast("❌ خطا در ایجاد فایل Excel", "error");
      return false;
    }
  };

  // ===== گرفتن بکاپ جدید =====
  const handleCreateBackup = async () => {
    if (isCreating) return;
    
    try {
      setIsCreating(true);
      showToast("🔄 در حال ایجاد بکاپ...", "info");
      
      const allData = {};
      const paths = [
        'cars',
        'expenses',
        'officeExpenses',
        'incomes',
        'dealerships',
        'customers',
        'profits',
        'archivedCars',
        'backups'
      ];
      
      for (const path of paths) {
        const pathRef = ref(db, `users_emails/${emailKey}/${path}`);
        const snapshot = await new Promise((resolve) => {
          onValue(pathRef, resolve, { onlyOnce: true });
        });
        if (snapshot.exists()) {
          allData[path] = snapshot.val();
        }
      }
      
      const persianDate = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());
      
      const backupName = newBackup.name.trim() || `بکاپ_${persianDate.replace(/[/: ]/g, '_')}`;
      
      const backupRef = ref(db, `users_emails/${emailKey}/backups`);
      await push(backupRef, {
        name: backupName,
        description: newBackup.description.trim() || "",
        data: allData,
        createdAt: new Date().toISOString(),
        createdAtPersian: persianDate,
        size: JSON.stringify(allData).length
      });
      
      if (newBackup.downloadJSON !== false) {
        downloadBackupWithPath(allData, backupName);
      }
      
      if (newBackup.downloadExcel) {
        convertToExcel(allData, backupName);
      }
      
      showToast(`✅ بکاپ "${backupName}" با موفقیت ایجاد شد`, "success");
      setShowAddModal(false);
      setNewBackup({ 
        name: "", 
        description: "",
        downloadJSON: true,
        downloadExcel: false
      });
    } catch (error) {
      console.error("Error creating backup:", error);
      showToast("❌ خطا در ایجاد بکاپ", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // ===== بازیابی بکاپ =====
  const handleRestoreBackup = async () => {
    if (!backupToRestore) return;
    
    try {
      showToast("🔄 در حال بازیابی بکاپ...", "info");
      
      const data = backupToRestore.data;
      if (!data) {
        showToast("❌ داده‌های بکاپ موجود نیست", "error");
        return;
      }
      
      for (const [path, pathData] of Object.entries(data)) {
        const pathRef = ref(db, `users_emails/${emailKey}/${path}`);
        await set(pathRef, pathData);
      }
      
      showToast(`✅ بکاپ "${backupToRestore.name}" با موفقیت بازیابی شد`, "success");
      setShowRestoreModal(false);
      setBackupToRestore(null);
    } catch (error) {
      console.error("Error restoring backup:", error);
      showToast("❌ خطا در بازیابی بکاپ", "error");
    }
  };

  // ===== حذف بکاپ =====
  const handleDeleteClick = (backup) => {
    setBackupToDelete(backup);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!backupToDelete) return;
    try {
      await remove(ref(db, `users_emails/${emailKey}/backups/${backupToDelete.id}`));
      showToast(`✅ بکاپ "${backupToDelete.name}" با موفقیت حذف شد`, "success");
    } catch (error) {
      console.error("Error deleting backup:", error);
      showToast("❌ خطا در حذف بکاپ", "error");
    } finally {
      setOpenConfirmModal(false);
      setBackupToDelete(null);
    }
  };

  // ===== فرمت تاریخ =====
  const toPersianDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // ===== فرمت حجم =====
  const formatSize = (bytes) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // ===== ستون‌های جدول =====
  const columns = [
    {
      name: "ردیف",
      selector: (row, index) => index + 1,
      sortable: true,
      width: "60px",
      center: true
    },
    {
      name: "نام بکاپ",
      selector: (row) => row.name,
      sortable: true,
      grow: 1,
      cell: (row) => <span style={{ fontWeight: "bold", color: "#1e293b" }}>{row.name}</span>
    },
    {
      name: "تاریخ ایجاد",
      selector: (row) => row.createdAtPersian || toPersianDate(row.createdAt),
      sortable: true,
      width: "150px",
      cell: (row) => (
        <span style={{
          background: "#dbeafe",
          padding: "4px 12px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#1e40af",
          display: "inline-block",
          whiteSpace: "nowrap"
        }}>
          {row.createdAtPersian || toPersianDate(row.createdAt)}
        </span>
      )
    },
    {
      name: "حجم",
      selector: (row) => row.size,
      sortable: true,
      width: "100px",
      cell: (row) => (
        <span style={{
          background: "#f1f5f9",
          padding: "4px 12px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#64748b",
          display: "inline-block"
        }}>
          {formatSize(row.size)}
        </span>
      )
    },
    {
      name: "توضیحات",
      selector: (row) => row.description,
      sortable: true,
      grow: 1,
      cell: (row) => row.description ? (
        <span style={{
          background: "#e0e7ff",
          padding: "4px 12px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#4338ca",
          display: "inline-block",
          maxWidth: "200px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          📝 {row.description}
        </span>
      ) : "-"
    },
    {
      name: "عملیات",
      width: "150px",
      center: true,
      cell: (row) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          <button
            onClick={() => {
              setBackupToRestore(row);
              setShowRestoreModal(true);
            }}
            style={{
              background: "#dbeafe",
              border: "none",
              padding: "5px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              color: "#1e40af",
              fontWeight: "bold"
            }}
            title="بازیابی"
          >
            ↩️ بازیابی
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            style={{
              background: "#fee2e2",
              border: "none",
              padding: "5px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px"
            }}
            title="حذف"
          >
            🗑️
          </button>
        </div>
      )
    }
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
          backgroundColor: toast.type === "success" ? "#10b981" : toast.type === "info" ? "#3b82f6" : "#ef4444",
          animation: "slideIn 0.3s ease-out"
        }}>
          {toast.message}
        </div>
      )}

      {/* ===== هدر با دکمه Export ===== */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" }}>
          ← بازگشت
        </button>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#1e293b" }}>💾 مدیریت بکاپ</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* ===== دکمه Export کامل ===== */}
          <button 
            onClick={handleExport}
            style={{
              background: "#10b981",
              color: "#fff",
              border: "none",
              padding: "8px 20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 4px 12px rgba(16,185,129,0.3)"
            }}
            onMouseEnter={(e) => e.target.style.background = "#059669"}
            onMouseLeave={(e) => e.target.style.background = "#10b981"}
          >
            📤 Export کامل
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            style={{
              background: "#8b5cf6",
              color: "#fff",
              border: "none",
              padding: "8px 20px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 4px 12px rgba(139,92,246,0.3)"
            }}
            onMouseEnter={(e) => e.target.style.background = "#7c3aed"}
            onMouseLeave={(e) => e.target.style.background = "#8b5cf6"}
          >
            ➕ ایجاد بکاپ جدید
          </button>
        </div>
      </div>

      {/* آمار */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px", maxWidth: "400px" }}>
        <div style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ fontSize: "32px" }}>💾</span>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{backups.length}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>تعداد بکاپ‌ها</div>
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ fontSize: "32px" }}>📅</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>
              {backups.length > 0 ? (backups[0]?.createdAtPersian || toPersianDate(backups[0]?.createdAt)) : "-"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>آخرین بکاپ</div>
          </div>
        </div>
      </div>

      {/* جدول */}
      <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
        <DataTable
          columns={columns}
          data={backups}
          customStyles={customStyles}
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[5, 10, 25, 50]}
          responsive
          highlightOnHover
          striped
          noDataComponent={
            <div style={{ textAlign: "center", padding: "40px" }}>
              <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>💾</span>
              <p>هیچ بکاپی ثبت نشده است</p>
              <button onClick={() => setShowAddModal(true)} style={{ marginTop: "16px", padding: "8px 20px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>➕ ایجاد بکاپ جدید</button>
            </div>
          }
        />
      </div>

      {/* مودال ایجاد بکاپ */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="💾 ایجاد بکاپ جدید" color="#8b5cf6" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
            از تمام داده‌های سیستم (خودروها، هزینه‌ها، درآمدها، نمایندگی‌ها، مشتریان، سودها و بکاپ‌ها) بکاپ گرفته می‌شود.
          </p>
          
          <label style={labelStyle}>📌 نام بکاپ (اختیاری)</label>
          <input
            type="text"
            placeholder="مثال: بکاپ کامل"
            value={newBackup.name}
            onChange={(e) => setNewBackup({...newBackup, name: e.target.value})}
            style={inputStyle(0, null)}
          />
          
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={newBackup.description}
            onChange={(e) => setNewBackup({...newBackup, description: e.target.value})}
            style={{...inputStyle(1, null), minHeight: "60px", resize: "vertical"}}
            placeholder="توضیحات اضافی..."
            rows="3"
          />
          
          <div style={{ 
            background: "#f8fafc", 
            padding: "16px", 
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            marginTop: "8px"
          }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "12px" }}>
              📥 انتخاب نوع خروجی:
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <input
                type="checkbox"
                id="jsonCheckbox"
                checked={newBackup.downloadJSON !== false}
                onChange={(e) => setNewBackup({...newBackup, downloadJSON: e.target.checked})}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="jsonCheckbox" style={{ fontSize: "14px", color: "#1e293b", cursor: "pointer" }}>
                📄 فایل JSON (شامل بکاپ‌ها)
              </label>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                id="excelCheckbox"
                checked={newBackup.downloadExcel || false}
                onChange={(e) => setNewBackup({...newBackup, downloadExcel: e.target.checked})}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="excelCheckbox" style={{ fontSize: "14px", color: "#1e293b", cursor: "pointer" }}>
                📊 فایل Excel
              </label>
            </div>
          </div>
          
          <div style={{ 
            background: "#f0fdf4", 
            padding: "12px 16px", 
            borderRadius: "10px",
            border: "1px solid #86efac",
            marginTop: "4px"
          }}>
            <div style={{ fontSize: "13px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>💡</span>
              <span>این بکاپ شامل خود بکاپ‌ها هم هست. پس با Import کردن، همه چیز برمیگرده!</span>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
              انصراف
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              style={{
                flex: 1,
                padding: "10px",
                background: isCreating ? "#94a3b8" : "#8b5cf6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: isCreating ? "not-allowed" : "pointer",
                fontWeight: "bold"
              }}
            >
              {isCreating ? "🔄 در حال ایجاد..." : "✅ ایجاد بکاپ کامل"}
            </button>
          </div>
        </div>
      </Modal>

      {/* مودال بازیابی */}
      <Modal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title="↩️ بازیابی بکاپ" color="#f59e0b" size="sm">
        <div style={{ textAlign: "center", padding: "10px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <p style={{ fontSize: "16px", marginBottom: "12px", color: "#1e293b" }}>
            آیا از بازیابی بکاپ <strong style={{ color: "#f59e0b" }}>"{backupToRestore?.name}"</strong> مطمئن هستید؟
          </p>
          <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "20px" }}>
            تمام داده‌های فعلی با داده‌های بکاپ جایگزین می‌شوند.
            <br />
            این عمل غیرقابل بازگشت است!
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button onClick={() => setShowRestoreModal(false)} style={{ flex: 1, padding: "12px", background: "#64748b", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>
              انصراف
            </button>
            <button onClick={handleRestoreBackup} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", boxShadow: "0 4px 15px rgba(245,158,11,0.3)" }}>
              ↩️ بازیابی بکاپ
            </button>
          </div>
        </div>
      </Modal>

      {/* مودال حذف */}
      <Modal isOpen={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title="🗑️ تأیید حذف" color="#ef4444" size="sm">
        <div style={{ textAlign: "center", padding: "10px" }}>
          <p style={{ fontSize: "16px", marginBottom: "12px" }}>آیا از حذف بکاپ <strong>"{backupToDelete?.name}"</strong> مطمئن هستید؟</p>
          <p style={{ fontSize: "12px", color: "#ef4444", marginBottom: "20px" }}>این عمل غیرقابل بازگشت است.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button onClick={() => setOpenConfirmModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={confirmDelete} style={{ flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>🗑️ حذف</button>
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

export default BackupManager;