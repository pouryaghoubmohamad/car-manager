import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove } from "firebase/database";
import Modal from "../Modal";

const CustomerList = ({ user, onBack, onAddCustomer }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) return;
    const customersRef = ref(db, `users/${user.uid}/customers`);
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value
        })).reverse();
        setCustomers(customersArray);
      } else {
        setCustomers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await remove(ref(db, `users/${user.uid}/customers/${customerToDelete.id}`));
      showToast(`✅ مشتری "${customerToDelete.customerName}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف مشتری", "error");
    } finally {
      setOpenConfirmModal(false);
      setCustomerToDelete(null);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return "-";
    if (phone.length === 11) {
      return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 11)}`;
    }
    return phone;
  };

  const showDate = (date) => {
    if (!date) return "-";
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    return date;
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (customer.customerName && customer.customerName.toLowerCase().includes(searchLower)) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.address && customer.address.toLowerCase().includes(searchLower))
    );
  });

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

      {/* هدر با دکمه بازگشت و ثبت جدید */}
      <div style={headerButtonsStyle}>
        <button onClick={onBack} style={backBtnStyle}>← بازگشت</button>
        <button onClick={onAddCustomer} style={addNewBtnStyle}>➕ ثبت مشتری جدید</button>
      </div>

      {/* باکس آمار */}
      <div style={statsContainerStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>👥</div>
          <div>
            <div style={statValueStyle}>{filteredCustomers.length}</div>
            <div style={statLabelStyle}>تعداد مشتریان</div>
          </div>
        </div>
        <div style={statCardStyle2}>
          <div style={statIconStyle}>📅</div>
          <div>
            <div style={statValueStyle}>
              {customers.filter(c => c.createdAtPersian?.startsWith("1403")).length}
            </div>
            <div style={statLabelStyle}>مشتریان امسال</div>
          </div>
        </div>
      </div>

      {/* جستجو */}
      <div style={{ marginBottom: "24px" }}>
        <label style={labelStyle}>🔍 جستجو</label>
        <input
          type="text"
          placeholder="جستجو در نام، شماره تماس یا آدرس مشتری..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={inputStyle(999, focusedIndex)}
          onFocus={() => setFocusedIndex(999)}
          onBlur={() => setFocusedIndex(null)}
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div style={emptyStyle}>
          <p>👥 هیچ مشتریی ثبت نشده است</p>
          <button onClick={onAddCustomer} style={emptyAddBtnStyle}>➕ ثبت مشتری جدید</button>
        </div>
      ) : (
        <div style={customersGridStyle}>
          {filteredCustomers.map((customer, index) => {
            const cardColors = [
              { bg: "#eef2ff", border: "#3b82f6" },
              { bg: "#ecfdf5", border: "#10b981" },
              { bg: "#fef3c7", border: "#f59e0b" },
              { bg: "#fce7f3", border: "#ec4899" },
              { bg: "#e0e7ff", border: "#6366f1" },
              { bg: "#ffedd5", border: "#ea580c" },
            ];
            const colorIndex = index % cardColors.length;
            const colors = cardColors[colorIndex];
            
            return (
              <div key={customer.id} style={{...customerCardStyle, borderTop: `4px solid ${colors.border}`}}>
                <div style={customerHeaderStyle}>
                  <div style={customerInfoStyle}>
                    <h3 style={customerNameStyle}>{customer.customerName}</h3>
                    <span style={customerCodeStyle}>کد: {index + 1}</span>
                  </div>
                  <button onClick={() => handleDeleteClick(customer)} style={deleteBtnStyle}>🗑️</button>
                </div>

                <div style={customerContentStyle}>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>📞 شماره تماس</span>
                    <span style={infoValueStyle}>{formatPhone(customer.phone)}</span>
                  </div>
                  
                  {customer.address && (
                    <div style={infoRowStyle}>
                      <span style={infoLabelStyle}>🏠 آدرس</span>
                      <span style={infoValueStyle}>{customer.address}</span>
                    </div>
                  )}
                  
                  {customer.description && (
                    <div style={infoRowStyle}>
                      <span style={infoLabelStyle}>📝 توضیحات</span>
                      <span style={infoValueStyle}>{customer.description}</span>
                    </div>
                  )}
                  
                  <div style={dateRowStyle}>
                    <span>📅 تاریخ ثبت: {customer.createdAtPersian || showDate(customer.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal 
        isOpen={openConfirmModal} 
        onClose={() => setOpenConfirmModal(false)} 
        title="🗑️ تأیید حذف"
        color="#ef4444"
        size="sm"
      >
        <div style={confirmModalStyle}>
          <p style={confirmTextStyle}>
            آیا از حذف مشتری <strong>"{customerToDelete?.customerName}"</strong> مطمئن هستید؟
          </p>
          <p style={confirmWarningStyle}>این عمل غیرقابل بازگشت است.</p>
          <div style={confirmBtnContainer}>
            <button onClick={() => setOpenConfirmModal(false)} style={confirmCancelBtn}>انصراف</button>
            <button onClick={confirmDelete} style={confirmDeleteBtn}>حذف مشتری</button>
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

// استایل‌ها
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
  background: "#7c3aed", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold"
};

const emptyAddBtnStyle = {
  background: "#7c3aed", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", marginTop: "20px"
};

const statsContainerStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" };
const statCardStyle = { background: "linear-gradient(135deg, #7c3aed, #8b5cf6)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statCardStyle2 = { background: "linear-gradient(135deg, #10b981, #34d399)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statIconStyle = { fontSize: "32px" };
const statValueStyle = { fontSize: "24px", fontWeight: "bold" };
const statLabelStyle = { fontSize: "12px", opacity: 0.9 };

const customersGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" };
const customerCardStyle = { background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", transition: "all 0.2s", cursor: "pointer" };
const customerHeaderStyle = { padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" };
const customerInfoStyle = { flex: 1 };
const customerNameStyle = { margin: 0, fontSize: "16px", fontWeight: "bold", color: "#1e293b" };
const customerCodeStyle = { fontSize: "11px", color: "#94a3b8" };
const deleteBtnStyle = { background: "#fee2e2", border: "none", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" };
const customerContentStyle = { padding: "16px" };
const infoRowStyle = { display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px", flexWrap: "wrap", gap: "8px" };
const infoLabelStyle = { color: "#64748b", fontWeight: "500" };
const infoValueStyle = { color: "#1e293b", fontWeight: "500", direction: "ltr", textAlign: "left" };
const dateRowStyle = { marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "#94a3b8", textAlign: "center" };
const confirmModalStyle = { textAlign: "center", padding: "10px" };
const confirmTextStyle = { fontSize: "16px", marginBottom: "12px" };
const confirmWarningStyle = { fontSize: "12px", color: "#ef4444", marginBottom: "20px" };
const confirmBtnContainer = { display: "flex", gap: "12px", marginTop: "10px" };
const confirmCancelBtn = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmDeleteBtn = { flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

export default CustomerList;