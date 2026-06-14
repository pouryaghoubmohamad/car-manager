import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import Modal from "../Modal";

const OfficeExpenseList = ({ user, onBack }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(null);
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

  const filteredExpenses = expenses.filter(expense => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (expense.title && expense.title.toLowerCase().includes(searchLower)) ||
      (expense.description && expense.description.toLowerCase().includes(searchLower))
    );
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

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
      case 'title':
        return { backgroundColor: "#e0e7ff", borderRadius: "12px", padding: "6px 10px", textAlign: "left", fontWeight: "bold", color: "#4338ca", fontSize: "12px" };
      case 'amount':
        return { backgroundColor: "#fef3c7", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
      case 'date':
        return { backgroundColor: "#dcfce7", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#16a34a", fontWeight: "500", fontSize: "12px" };
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

  const buttonContainerStyle = {
    display: "flex",
    gap: "8px",
    marginTop: "16px",
    paddingTop: "12px",
    borderTop: "1px solid #e2e8f0"
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
        <div style={pageTitleWrapper}>
          <h2 style={pageTitleTextStyle}>💰 هزینه‌های دفتری</h2>
        </div>
        <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>➕ ثبت هزینه جدید</button>
      </div>

      <div style={statsContainerStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>📋</div>
          <div>
            <div style={statValueStyle}>{filteredExpenses.length}</div>
            <div style={statLabelStyle}>تعداد هزینه‌ها</div>
          </div>
        </div>
        <div style={statCardStyle2}>
          <div style={statIconStyle}>💰</div>
          <div>
            <div style={statValueStyle}>{totalExpenses.toLocaleString()}</div>
            <div style={statLabelStyle}>مجموع هزینه‌ها (تومان)</div>
            <div style={statWordsSmall}>{numberToWords(totalExpenses)} تومان</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" }}>
        <label style={{...labelStyle, maxWidth: "700px", margin: "0 auto 6px auto" }}>🔍 جستجو</label>
        <input
          type="text"
          placeholder="جستجو در عنوان یا توضیحات هزینه..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{...inputStyle(999, focusedIndex), maxWidth: "700px", margin: "0 auto", display: "block"}}
          onFocus={() => setFocusedIndex(999)}
          onBlur={() => setFocusedIndex(null)}
        />
      </div>

      {filteredExpenses.length === 0 ? (
        <div style={emptyStyle}>
          <span style={{ fontSize: "48px" }}>💰</span>
          <p>هیچ هزینه‌ای ثبت نشده است</p>
          <button onClick={() => setShowAddModal(true)} style={emptyAddBtnStyle}>➕ ثبت هزینه جدید</button>
        </div>
      ) : (
        <div style={carsGridStyle}>
          {filteredExpenses.map((expense, index) => {
            return (
              <div key={expense.id} style={archiveCardStyle}>
                <div style={archiveHeaderStyle}>
                  <h3 style={archiveTitleStyle}>💰 {expense.title}</h3>
                  <span style={archiveBadgeStyle}>هزینه #{index + 1}</span>
                </div>

                <div style={archiveContentStyle}>
                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📋 اطلاعات هزینه</h4>
                    <div style={infoRowStyle}>
                      <span>عنوان هزینه:</span>
                      <div style={rightBoxStyle('title')}>{expense.title}</div>
                    </div>
                    {expense.description && (
                      <div style={infoRowStyle}>
                        <span>توضیحات:</span>
                        <div style={rightBoxStyle('title')}>{expense.description}</div>
                      </div>
                    )}
                    <div style={infoRowStyle}>
                      <span>تاریخ ثبت:</span>
                      <div style={rightBoxStyle('date')}>{expense.createdAtPersian || toPersianDate(expense.createdAt)}</div>
                    </div>
                  </div>

                  <div style={threeColumnsStyle}>
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle}>💰 مبلغ هزینه</div>
                      <div style={rightBoxStyle('amount')}>
                        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#f59e0b" }}>{formatPrice(expense.amount)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(expense.amount)} تومان</div>
                      </div>
                    </div>
                    <div style={columnCardStyle}></div>
                    <div style={columnCardStyle}></div>
                  </div>

                  <div style={buttonContainerStyle}>
                    <button onClick={() => handleEditClick(expense)} style={editBtnStyle}>
                      ✏️ ویرایش
                    </button>
                    <button onClick={() => handleDeleteClick(expense)} style={deleteBtnStyle}>
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ ثبت هزینه جدید" color="#f59e0b" size="md">
        <div style={modalFormStyle}>
          <label style={labelStyle}>📌 عنوان هزینه *</label>
          <input type="text" placeholder="مثال: قبض برق" value={newExpense.title} onChange={(e) => setNewExpense({...newExpense, title: e.target.value})} style={inputStyle(0, focusedIndex)} />
          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input type="text" value={newExpense.amount ? Number(newExpense.amount).toLocaleString() : ""} onChange={(e) => { let raw = e.target.value.replace(/,/g, ""); if (raw === "" || /^\d+$/.test(raw)) setNewExpense({...newExpense, amount: raw}); }} style={{...inputStyle(1, focusedIndex), textAlign: "left", direction: "ltr"}} placeholder="مثال: 500,000" />
          {newExpense.amount && newExpense.amount !== "0" && <div style={{ fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" }}>{numberToWords(Number(newExpense.amount))} تومان</div>}
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} style={{...inputStyle(2, focusedIndex), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات اضافی..." rows="3" />
          <div style={modalBtnContainer}>
            <button onClick={() => setShowAddModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleAddExpense} style={submitBtnStyle}>✅ ثبت هزینه</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ ویرایش هزینه" color="#8b5cf6" size="md">
        <div style={modalFormStyle}>
          <label style={labelStyle}>📌 عنوان هزینه *</label>
          <input type="text" placeholder="مثال: قبض برق" value={editExpense.title} onChange={(e) => setEditExpense({...editExpense, title: e.target.value})} style={inputStyle(10, focusedIndex)} />
          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input type="text" value={editExpense.amount ? Number(editExpense.amount).toLocaleString() : ""} onChange={(e) => { let raw = e.target.value.replace(/,/g, ""); if (raw === "" || /^\d+$/.test(raw)) setEditExpense({...editExpense, amount: raw}); }} style={{...inputStyle(11, focusedIndex), textAlign: "left", direction: "ltr"}} placeholder="مبلغ هزینه" />
          {editExpense.amount && editExpense.amount !== "0" && <div style={{ fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px" }}>{numberToWords(Number(editExpense.amount))} تومان</div>}
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={editExpense.description} onChange={(e) => setEditExpense({...editExpense, description: e.target.value})} style={{...inputStyle(12, focusedIndex), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات" />
          <div style={modalBtnContainer}>
            <button onClick={() => setShowEditModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleUpdateExpense} style={submitBtnPurpleStyle}>✏️ ویرایش هزینه</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title="🗑️ تأیید حذف" color="#ef4444" size="sm">
        <div style={confirmModalStyle}>
          <p style={confirmTextStyle}>آیا از حذف هزینه <strong>"{expenseToDelete?.title}"</strong> مطمئن هستید؟</p>
          <p style={confirmWarningStyle}>این عمل غیرقابل بازگشت است.</p>
          <div style={confirmBtnContainer}>
            <button onClick={() => setOpenConfirmModal(false)} style={confirmCancelBtn}>انصراف</button>
            <button onClick={confirmDelete} style={confirmDeleteBtn}>حذف هزینه</button>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};

const toastStyle = { position: "fixed", top: "20px", right: "20px", padding: "12px 20px", borderRadius: "12px", color: "#fff", fontSize: "14px", fontWeight: "500", zIndex: 10000, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "10px" };
const loadingStyle = { textAlign: "center", padding: "40px" };
const emptyStyle = { textAlign: "center", padding: "60px", background: "#fff", borderRadius: "12px" };

const headerButtonsStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "10px", flexWrap: "wrap" };
const backBtnStyle = { background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" };
const addBtnStyle = { background: "#f59e0b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" };
const emptyAddBtnStyle = { background: "#f59e0b", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", marginTop: "20px" };
const pageTitleWrapper = { flex: 1, textAlign: "center" };
const pageTitleTextStyle = { fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: 0 };

const statsContainerStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" };
const statCardStyle = { background: "linear-gradient(135deg, #475569, #64748b)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statCardStyle2 = { background: "linear-gradient(135deg, #ea580c, #f97316)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statIconStyle = { fontSize: "32px" };
const statValueStyle = { fontSize: "24px", fontWeight: "bold" };
const statLabelStyle = { fontSize: "12px", opacity: 0.9 };
const statWordsSmall = { fontSize: "10px", opacity: 0.8, marginTop: "5px" };

const carsGridStyle = { display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" };
const archiveCardStyle = { background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transition: "all 0.3s", maxWidth: "700px", width: "100%" };
const archiveHeaderStyle = { background: "linear-gradient(135deg, #f59e0b, #ea580c)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const archiveTitleStyle = { margin: 0, fontSize: "16px", fontWeight: "bold", color: "#fff" };
const archiveBadgeStyle = { background: "#ffffff", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "#f59e0b", fontWeight: "bold" };
const archiveContentStyle = { padding: "16px" };

const editBtnStyle = { flex: 1, padding: "8px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" };
const deleteBtnStyle = { flex: 1, padding: "8px", background: "#ef4444", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" };

const modalFormStyle = { display: "flex", flexDirection: "column", gap: "12px" };
const modalBtnContainer = { display: "flex", gap: "10px", marginTop: "10px" };
const cancelBtnStyle = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const submitBtnStyle = { flex: 1, padding: "10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const submitBtnPurpleStyle = { flex: 1, padding: "10px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };

const confirmModalStyle = { textAlign: "center", padding: "10px" };
const confirmTextStyle = { fontSize: "16px", marginBottom: "12px" };
const confirmWarningStyle = { fontSize: "12px", color: "#ef4444", marginBottom: "20px" };
const confirmBtnContainer = { display: "flex", gap: "12px", marginTop: "10px" };
const confirmCancelBtn = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmDeleteBtn = { flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

export default OfficeExpenseList;