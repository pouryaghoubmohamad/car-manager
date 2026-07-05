import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import DataTable from "react-data-table-component";
import Modal from "../Modal";

const OfficeExpenseList = ({ user, onBack }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    description: "",
    createdAt: new Date().toISOString()
  });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpense, setEditExpense] = useState({
    title: "",
    amount: "",
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
    const expensesRef = ref(db, `users_emails/${emailKey}/officeExpenses`);
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const expensesArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value
        })).reverse();
        setExpenses(expensesArray);
      } else {
        setExpenses([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, emailKey]);

  const handleAddExpense = async () => {
    if (!newExpense.title.trim()) {
      showToast("❌ لطفاً عنوان هزینه را وارد کنید", "error");
      return;
    }
    if (!newExpense.amount || newExpense.amount === "0") {
      showToast("❌ لطفاً مبلغ هزینه را وارد کنید", "error");
      return;
    }

    try {
      const expensesRef = ref(db, `users_emails/${emailKey}/officeExpenses`);
      const persianDate = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      
      await push(expensesRef, {
        title: newExpense.title.trim(),
        amount: Number(newExpense.amount),
        description: newExpense.description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: persianDate
      });
      
      showToast(`✅ هزینه "${newExpense.title}" با موفقیت ثبت شد`, "success");
      setShowAddModal(false);
      setNewExpense({
        title: "",
        amount: "",
        description: "",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      showToast("❌ خطا در ثبت هزینه", "error");
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setEditExpense({
      title: expense.title,
      amount: expense.amount.toString(),
      description: expense.description || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateExpense = async () => {
    if (!editExpense.title.trim()) {
      showToast("❌ لطفاً عنوان هزینه را وارد کنید", "error");
      return;
    }
    if (!editExpense.amount || editExpense.amount === "0") {
      showToast("❌ لطفاً مبلغ هزینه را وارد کنید", "error");
      return;
    }

    try {
      const expenseRef = ref(db, `users_emails/${emailKey}/officeExpenses/${editingExpense.id}`);
      await update(expenseRef, {
        title: editExpense.title.trim(),
        amount: Number(editExpense.amount),
        description: editExpense.description.trim() || "",
        updatedAt: new Date().toISOString()
      });
      
      showToast(`✅ هزینه "${editExpense.title}" با موفقیت ویرایش شد`, "success");
      setShowEditModal(false);
      setEditingExpense(null);
    } catch (error) {
      showToast("❌ خطا در ویرایش هزینه", "error");
    }
  };

  const handleDeleteClick = (expense) => {
    setExpenseToDelete(expense);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await remove(ref(db, `users_emails/${emailKey}/officeExpenses/${expenseToDelete.id}`));
      showToast(`✅ هزینه "${expenseToDelete.title}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف هزینه", "error");
    } finally {
      setOpenConfirmModal(false);
      setExpenseToDelete(null);
    }
  };

  // تابع پرینت - با دکمه‌ها در پایین صفحه پرینت
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const totalAmount = filteredData.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>لیست هزینه‌های دفتری</title>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Vazirmatn', 'Vazir', 'IRANSans', Tahoma, sans-serif;
              direction: rtl;
              padding: 30px;
              background: #fff;
            }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 15px; }
            .header h1 { font-size: 24px; color: #1e293b; }
            .header p { font-size: 12px; color: #64748b; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-size: 13px; }
            th { background: #f8fafc; font-weight: bold; color: #475569; }
            .total { margin-top: 20px; text-align: left; font-size: 16px; font-weight: bold; background: #fef3c7; padding: 10px; border-radius: 8px; }
            .bottom-buttons {
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
            .print-btn { background: #f59e0b; color: white; }
            .close-btn { background: #64748b; color: white; }
            @media print {
              .bottom-buttons { display: none; }
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>💰 لیست هزینه‌های دفتری</h1>
            <p>تاریخ چاپ: ${new Intl.DateTimeFormat('fa-IR').format(new Date())}</p>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>عنوان هزینه</th><th>مبلغ (تومان)</th><th>توضیحات</th><th>تاریخ ثبت</th></tr>
            </thead>
            <tbody>
              ${filteredData.map((exp, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${exp.title}</td>
                  <td>${Number(exp.amount).toLocaleString()}</td>
                  <td>${exp.description || "-"}</td>
                  <td>${exp.createdAtPersian || toPersianDate(exp.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">مجموع کل هزینه‌ها: ${totalAmount.toLocaleString()} تومان</div>
          <div class="bottom-buttons">
            <button class="print-btn" onclick="window.print()">🖨️ چاپ</button>
            <button class="close-btn" onclick="window.close()">✖️ برگشت</button>
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

  const filteredData = expenses.filter(expense => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (expense.title && expense.title.toLowerCase().includes(searchLower)) ||
      (expense.description && expense.description.toLowerCase().includes(searchLower))
    );
  });

  const totalExpenses = filteredData.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // ستون‌های جدول
  const columns = [
    {
      name: "ردیف",
      selector: (row, index) => index + 1,
      sortable: true,
      width: "60px",
      center: true
    },
    {
      name: "عنوان هزینه",
      selector: (row) => row.title,
      sortable: true,
      grow: 1,
      cell: (row) => <span style={{ fontWeight: "bold", color: "#1e293b" }}>{row.title}</span>
    },
    {
      name: "مبلغ (تومان)",
      selector: (row) => row.amount,
      sortable: true,
      width: "180px",
      cell: (row) => (
        <span style={{
          background: "#fef3c7",
          padding: "4px 10px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#d97706",
          display: "inline-block",
          whiteSpace: "nowrap"
        }}>
          {formatPrice(row.amount)} تومان
        </span>
      )
    },
    {
      name: "توضیحات",
      selector: (row) => row.description,
      sortable: true,
      grow: 1.5,
      cell: (row) => row.description ? (
        <span style={{
          background: "#e0e7ff",
          padding: "4px 10px",
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
      name: "تاریخ ثبت",
      selector: (row) => row.createdAtPersian || toPersianDate(row.createdAt),
      sortable: true,
      width: "110px",
      cell: (row) => (
        <span style={{
          background: "#dbeafe",
          padding: "4px 10px",
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
      name: "عملیات",
      width: "100px",
      center: true,
      cell: (row) => (
        <div className="stack-on-mobile" style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          <button
            className="table-action-btn"
            onClick={() => handleEditClick(row)}
            style={{
              background: "#e0e7ff",
              border: "none",
              padding: "5px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px"
            }}
            title="ویرایش"
          >
            ✏️
          </button>
          <button
            className="table-action-btn"
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
      {/* Toast */}
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

      {/* دکمه‌های بالا */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <button onClick={onBack} style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" }}>
          ← بازگشت
        </button>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#1e293b" }}>💰 هزینه‌های دفتری</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowAddModal(true)} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
            ➕ ثبت هزینه جدید
          </button>
          <button className="print-btn-desktop-only" onClick={handlePrint} style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
            🖨️ پرینت
          </button>
        </div>
      </div>

      {/* آمار */}
      <div className="responsive-grid-2" style={{ marginBottom: "24px" }}>
        <div style={{ background: "linear-gradient(135deg, #64748b, #475569)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ fontSize: "32px" }}>📋</span>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{filteredData.length}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>تعداد هزینه‌ها</div>
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ fontSize: "32px" }}>💰</span>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalExpenses.toLocaleString()} تومان</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>مجموع کل هزینه‌ها</div>
            <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "5px" }}>{numberToWords(totalExpenses)} تومان</div>
          </div>
        </div>
      </div>

      {/* جستجو */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ position: "relative", maxWidth: "350px" }}>
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}>🔍</span>
          <input
            type="text"
            placeholder="جستجو در عنوان یا توضیحات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 35px 10px 15px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none" }}
          />
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
              <p>هیچ هزینه‌ای ثبت نشده است</p>
              <button onClick={() => setShowAddModal(true)} style={{ marginTop: "16px", padding: "8px 20px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>➕ ثبت هزینه جدید</button>
            </div>
          }
        />
      </div>

      {/* مودال ثبت هزینه */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ ثبت هزینه جدید" color="#f59e0b" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>📌 عنوان هزینه *</label>
          <input type="text" placeholder="مثال: قبض برق" value={newExpense.title} onChange={(e) => setNewExpense({...newExpense, title: e.target.value})} style={inputStyle(0, null)} />
          
          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input type="text" value={newExpense.amount ? Number(newExpense.amount).toLocaleString() : ""} onChange={(e) => { let raw = e.target.value.replace(/,/g, ""); if (raw === "" || /^\d+$/.test(raw)) setNewExpense({...newExpense, amount: raw}); }} style={{...inputStyle(1, null), textAlign: "left", direction: "ltr"}} placeholder="مثال: 500,000" />
          {newExpense.amount && newExpense.amount !== "0" && <div style={{ fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" }}>{numberToWords(Number(newExpense.amount))} تومان</div>}
          
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} style={{...inputStyle(2, null), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات اضافی..." rows="3" />
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={handleAddExpense} style={{ flex: 1, padding: "10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>✅ ثبت هزینه</button>
          </div>
        </div>
      </Modal>

      {/* مودال ویرایش هزینه */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ ویرایش هزینه" color="#8b5cf6" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>📌 عنوان هزینه *</label>
          <input type="text" placeholder="مثال: قبض برق" value={editExpense.title} onChange={(e) => setEditExpense({...editExpense, title: e.target.value})} style={inputStyle(10, null)} />
          
          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input type="text" value={editExpense.amount ? Number(editExpense.amount).toLocaleString() : ""} onChange={(e) => { let raw = e.target.value.replace(/,/g, ""); if (raw === "" || /^\d+$/.test(raw)) setEditExpense({...editExpense, amount: raw}); }} style={{...inputStyle(11, null), textAlign: "left", direction: "ltr"}} placeholder="مبلغ هزینه" />
          {editExpense.amount && editExpense.amount !== "0" && <div style={{ fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" }}>{numberToWords(Number(editExpense.amount))} تومان</div>}
          
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={editExpense.description} onChange={(e) => setEditExpense({...editExpense, description: e.target.value})} style={{...inputStyle(12, null), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات" rows="3" />
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={handleUpdateExpense} style={{ flex: 1, padding: "10px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>✏️ ویرایش هزینه</button>
          </div>
        </div>
      </Modal>

      {/* مودال حذف */}
      <Modal isOpen={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title="🗑️ تأیید حذف" color="#ef4444" size="sm">
        <div style={{ textAlign: "center", padding: "10px" }}>
          <p style={{ fontSize: "16px", marginBottom: "12px" }}>آیا از حذف هزینه <strong>"{expenseToDelete?.title}"</strong> مطمئن هستید؟</p>
          <p style={{ fontSize: "12px", color: "#ef4444", marginBottom: "20px" }}>این عمل غیرقابل بازگشت است.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button onClick={() => setOpenConfirmModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={confirmDelete} style={{ flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>حذف هزینه</button>
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

export default OfficeExpenseList;