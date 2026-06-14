import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import Modal from "../Modal";

const IncomeList = ({ user, onBack }) => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIncome, setNewIncome] = useState({
    title: "",
    amount: "",
    description: "",
    createdAt: new Date().toISOString()
  });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [editIncome, setEditIncome] = useState({
    title: "",
    amount: "",
    description: ""
  });

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) return;
    const incomesRef = ref(db, `users/${user.uid}/incomes`);
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
  }, [user]);

  const handleAddIncome = async () => {
    if (!newIncome.title.trim()) {
      showToast("❌ لطفاً عنوان درآمد را وارد کنید", "error");
      return;
    }
    if (!newIncome.amount || newIncome.amount === "0") {
      showToast("❌ لطفاً مبلغ درآمد را وارد کنید", "error");
      return;
    }

    try {
      const incomesRef = ref(db, `users/${user.uid}/incomes`);
      const persianDate = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      
      await push(incomesRef, {
        title: newIncome.title.trim(),
        amount: Number(newIncome.amount),
        description: newIncome.description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: persianDate
      });
      
      showToast(`✅ درآمد "${newIncome.title}" با موفقیت ثبت شد`, "success");
      setShowAddModal(false);
      setNewIncome({
        title: "",
        amount: "",
        description: "",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      showToast("❌ خطا در ثبت درآمد", "error");
    }
  };

  const handleEditClick = (income) => {
    setEditingIncome(income);
    setEditIncome({
      title: income.title,
      amount: income.amount.toString(),
      description: income.description || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateIncome = async () => {
    if (!editIncome.title.trim()) {
      showToast("❌ لطفاً عنوان درآمد را وارد کنید", "error");
      return;
    }
    if (!editIncome.amount || editIncome.amount === "0") {
      showToast("❌ لطفاً مبلغ درآمد را وارد کنید", "error");
      return;
    }

    try {
      const incomeRef = ref(db, `users/${user.uid}/incomes/${editingIncome.id}`);
      await update(incomeRef, {
        title: editIncome.title.trim(),
        amount: Number(editIncome.amount),
        description: editIncome.description.trim() || "",
        updatedAt: new Date().toISOString()
      });
      
      showToast(`✅ درآمد "${editIncome.title}" با موفقیت ویرایش شد`, "success");
      setShowEditModal(false);
      setEditingIncome(null);
    } catch (error) {
      showToast("❌ خطا در ویرایش درآمد", "error");
    }
  };

  const handleDeleteClick = (income) => {
    setIncomeToDelete(income);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!incomeToDelete) return;
    try {
      await remove(ref(db, `users/${user.uid}/incomes/${incomeToDelete.id}`));
      showToast(`✅ درآمد "${incomeToDelete.title}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف درآمد", "error");
    } finally {
      setOpenConfirmModal(false);
      setIncomeToDelete(null);
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

  const filteredIncomes = incomes.filter(income => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (income.title && income.title.toLowerCase().includes(searchLower)) ||
      (income.description && income.description.toLowerCase().includes(searchLower))
    );
  });

  const totalIncomes = filteredIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

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

  // استایل‌های مثل ArchivedCars
  const rightBoxStyle = (type) => {
    switch(type) {
      case 'title':
        return { backgroundColor: "#e0e7ff", borderRadius: "12px", padding: "6px 10px", textAlign: "left", fontWeight: "bold", color: "#4338ca", fontSize: "12px" };
      case 'amount':
        return { backgroundColor: "#ecfdf5", borderRadius: "12px", padding: "8px 10px", textAlign: "left" };
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
    borderBottom: "2px solid #10b981"
  };

  const wordsStyle = { fontSize: "9px", color: "#64748b", marginTop: "3px", textAlign: "left" };

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
        <div style={pageTitleWrapper}>
          <h2 style={pageTitleTextStyle}>💰 درآمدها</h2>
        </div>
        <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>➕ ثبت درآمد جدید</button>
      </div>

      <div style={statsContainerStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>📋</div>
          <div>
            <div style={statValueStyle}>{filteredIncomes.length}</div>
            <div style={statLabelStyle}>تعداد درآمدها</div>
          </div>
        </div>
        <div style={statCardStyle2}>
          <div style={statIconStyle}>💰</div>
          <div>
            <div style={statValueStyle}>{totalIncomes.toLocaleString()}</div>
            <div style={statLabelStyle}>مجموع درآمدها (تومان)</div>
            <div style={statWordsSmall}>{numberToWords(totalIncomes)} تومان</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" }}>
        <label style={{...labelStyle, maxWidth: "700px", margin: "0 auto 6px auto" }}>🔍 جستجو</label>
        <input
          type="text"
          placeholder="جستجو در عنوان یا توضیحات درآمد..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{...inputStyle(999, focusedIndex), maxWidth: "700px", margin: "0 auto", display: "block"}}
          onFocus={() => setFocusedIndex(999)}
          onBlur={() => setFocusedIndex(null)}
        />
      </div>

      {filteredIncomes.length === 0 ? (
        <div style={emptyStyle}>
          <span style={{ fontSize: "48px" }}>💰</span>
          <p>هیچ درآمدی ثبت نشده است</p>
          <button onClick={() => setShowAddModal(true)} style={emptyAddBtnStyle}>➕ ثبت درآمد جدید</button>
        </div>
      ) : (
        <div style={carsGridStyle}>
          {filteredIncomes.map((income, index) => {
            return (
              <div key={income.id} style={archiveCardStyle}>
                <div style={archiveHeaderStyle}>
                  <h3 style={archiveTitleStyle}>💰 {income.title}</h3>
                  <span style={archiveBadgeStyle}>درآمد #{index + 1}</span>
                </div>

                <div style={archiveContentStyle}>
                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📋 اطلاعات درآمد</h4>
                    <div style={infoRowStyle}>
                      <span>عنوان درآمد:</span>
                      <div style={rightBoxStyle('title')}>{income.title}</div>
                    </div>
                    {income.description && (
                      <div style={infoRowStyle}>
                        <span>توضیحات:</span>
                        <div style={rightBoxStyle('title')}>{income.description}</div>
                      </div>
                    )}
                    <div style={infoRowStyle}>
                      <span>تاریخ ثبت:</span>
                      <div style={rightBoxStyle('date')}>{income.createdAtPersian || toPersianDate(income.createdAt)}</div>
                    </div>
                  </div>

                  {/* سه ستون مثل بایگانی */}
                  <div style={threeColumnsStyle}>
                    <div style={columnCardStyle}>
                      <div style={columnTitleStyle}>💰 مبلغ درآمد</div>
                      <div style={rightBoxStyle('amount')}>
                        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#10b981" }}>{formatPrice(income.amount)} تومان</div>
                        <div style={wordsStyle}>{numberToWords(income.amount)} تومان</div>
                      </div>
                    </div>
                    <div style={columnCardStyle}>
                      {/* خالی برای تقارن */}
                    </div>
                    <div style={columnCardStyle}>
                      {/* خالی برای تقارن */}
                    </div>
                  </div>

                  {/* دکمه‌های عملیات */}
                  <div style={buttonContainerStyle}>
                    <button onClick={() => handleEditClick(income)} style={editBtnStyle}>
                      ✏️ ویرایش
                    </button>
                    <button onClick={() => handleDeleteClick(income)} style={deleteBtnStyle}>
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال ثبت درآمد */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="➕ ثبت درآمد جدید"
        color="#10b981"
        size="md"
      >
        <div style={modalFormStyle}>
          <label style={labelStyle}>📌 عنوان درآمد *</label>
          <input
            type="text"
            placeholder="مثال: حقوق ماهیانه"
            value={newIncome.title}
            onChange={(e) => setNewIncome({...newIncome, title: e.target.value})}
            style={inputStyle(0, focusedIndex)}
            onFocus={() => setFocusedIndex(0)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input
            type="text"
            value={newIncome.amount ? Number(newIncome.amount).toLocaleString() : ""}
            onChange={(e) => {
              let raw = e.target.value.replace(/,/g, "");
              if (raw === "" || /^\d+$/.test(raw)) {
                setNewIncome({...newIncome, amount: raw});
              }
            }}
            style={{...inputStyle(1, focusedIndex), textAlign: "left", direction: "ltr"}}
            onFocus={() => setFocusedIndex(1)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="مثال: 5,000,000"
          />
          {newIncome.amount && newIncome.amount !== "0" && (
            <div style={priceHintStyle}>{numberToWords(Number(newIncome.amount))} تومان</div>
          )}

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={newIncome.description}
            onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
            style={{...inputStyle(2, focusedIndex), minHeight: "60px", resize: "vertical"}}
            onFocus={() => setFocusedIndex(2)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="توضیحات اضافی..."
          />

          <div style={modalBtnContainer}>
            <button onClick={() => setShowAddModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleAddIncome} style={submitBtnStyle}>✅ ثبت درآمد</button>
          </div>
        </div>
      </Modal>

      {/* مودال ویرایش درآمد */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title="✏️ ویرایش درآمد"
        color="#8b5cf6"
        size="md"
      >
        <div style={modalFormStyle}>
          <label style={labelStyle}>📌 عنوان درآمد *</label>
          <input
            type="text"
            placeholder="مثال: حقوق ماهیانه"
            value={editIncome.title}
            onChange={(e) => setEditIncome({...editIncome, title: e.target.value})}
            style={inputStyle(10, focusedIndex)}
            onFocus={() => setFocusedIndex(10)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>💰 مبلغ (تومان) *</label>
          <input
            type="text"
            value={editIncome.amount ? Number(editIncome.amount).toLocaleString() : ""}
            onChange={(e) => {
              let raw = e.target.value.replace(/,/g, "");
              if (raw === "" || /^\d+$/.test(raw)) {
                setEditIncome({...editIncome, amount: raw});
              }
            }}
            style={{...inputStyle(11, focusedIndex), textAlign: "left", direction: "ltr"}}
            onFocus={() => setFocusedIndex(11)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="مثال: 5,000,000"
          />
          {editIncome.amount && editIncome.amount !== "0" && (
            <div style={priceHintStyle}>{numberToWords(Number(editIncome.amount))} تومان</div>
          )}

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={editIncome.description}
            onChange={(e) => setEditIncome({...editIncome, description: e.target.value})}
            style={{...inputStyle(12, focusedIndex), minHeight: "60px", resize: "vertical"}}
            onFocus={() => setFocusedIndex(12)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="توضیحات اضافی..."
          />

          <div style={modalBtnContainer}>
            <button onClick={() => setShowEditModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleUpdateIncome} style={submitBtnPurpleStyle}>✏️ ویرایش درآمد</button>
          </div>
        </div>
      </Modal>

      {/* مودال تأیید حذف */}
      <Modal 
        isOpen={openConfirmModal} 
        onClose={() => setOpenConfirmModal(false)} 
        title="🗑️ تأیید حذف"
        color="#ef4444"
        size="sm"
      >
        <div style={confirmModalStyle}>
          <p style={confirmTextStyle}>
            آیا از حذف درآمد <strong>"{incomeToDelete?.title}"</strong> مطمئن هستید؟
          </p>
          <p style={confirmWarningStyle}>این عمل غیرقابل بازگشت است.</p>
          <div style={confirmBtnContainer}>
            <button onClick={() => setOpenConfirmModal(false)} style={confirmCancelBtn}>انصراف</button>
            <button onClick={confirmDelete} style={confirmDeleteBtn}>حذف درآمد</button>
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

// استایل‌های مثل ArchivedCars
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

const addBtnStyle = {
  background: "#10b981", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold"
};

const emptyAddBtnStyle = {
  background: "#10b981", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", marginTop: "20px"
};

const pageTitleWrapper = { flex: 1, textAlign: "center" };
const pageTitleTextStyle = { fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: 0 };

const statsContainerStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" };
const statCardStyle = { background: "linear-gradient(135deg, #475569, #64748b)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statCardStyle2 = { background: "linear-gradient(135deg, #10b981, #34d399)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
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

const archiveCardStyle = { 
  background: "#fff", 
  borderRadius: "16px", 
  overflow: "hidden", 
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)", 
  transition: "all 0.3s",
  maxWidth: "700px",
  width: "100%"
};

const archiveHeaderStyle = { background: "linear-gradient(135deg, #10b981, #059669)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const archiveTitleStyle = { margin: 0, fontSize: "16px", fontWeight: "bold", color: "#fff" };
const archiveBadgeStyle = { background: "#ffffff", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "#10b981", fontWeight: "bold" };
const archiveContentStyle = { padding: "16px" };

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

const modalFormStyle = { display: "flex", flexDirection: "column", gap: "12px" };
const priceHintStyle = { fontSize: "11px", color: "#10b981", marginBottom: "15px", marginTop: "-8px", paddingRight: "4px" };
const modalBtnContainer = { display: "flex", gap: "10px", marginTop: "10px" };
const cancelBtnStyle = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const submitBtnStyle = { flex: 1, padding: "10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const submitBtnPurpleStyle = { flex: 1, padding: "10px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };

const confirmModalStyle = { textAlign: "center", padding: "10px" };
const confirmTextStyle = { fontSize: "16px", marginBottom: "12px" };
const confirmWarningStyle = { fontSize: "12px", color: "#ef4444", marginBottom: "20px" };
const confirmBtnContainer = { display: "flex", gap: "12px", marginTop: "10px" };
const confirmCancelBtn = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmDeleteBtn = { flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

export default IncomeList;