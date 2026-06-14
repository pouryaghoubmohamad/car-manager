import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import Modal from "../Modal";

const DealershipList = ({ user, onBack }) => {
  const [dealerships, setDealerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [dealershipToDelete, setDealershipToDelete] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDealership, setNewDealership] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
    createdAt: new Date().toISOString()
  });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDealership, setEditingDealership] = useState(null);
  const [editDealership, setEditDealership] = useState({
    name: "",
    phone: "",
    address: "",
    description: ""
  });

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) return;
    const dealershipsRef = ref(db, `users/${user.uid}/dealerships`);
    const unsubscribe = onValue(dealershipsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const dealershipsArray = Object.entries(data).map(([id, value]) => ({
          id: id,
          ...value
        })).reverse();
        setDealerships(dealershipsArray);
      } else {
        setDealerships([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddDealership = async () => {
    if (!newDealership.name.trim()) {
      showToast("❌ لطفاً نام نمایندگی را وارد کنید", "error");
      return;
    }
    if (!newDealership.phone.trim()) {
      showToast("❌ لطفاً شماره تماس را وارد کنید", "error");
      return;
    }

    try {
      const dealershipsRef = ref(db, `users/${user.uid}/dealerships`);
      const persianDate = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      
      await push(dealershipsRef, {
        name: newDealership.name.trim(),
        phone: newDealership.phone.trim(),
        address: newDealership.address.trim() || "",
        description: newDealership.description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: persianDate
      });
      
      showToast(`✅ نمایندگی "${newDealership.name}" با موفقیت ثبت شد`, "success");
      setShowAddModal(false);
      setNewDealership({
        name: "",
        phone: "",
        address: "",
        description: "",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      showToast("❌ خطا در ثبت نمایندگی", "error");
    }
  };

  const handleEditClick = (dealership) => {
    setEditingDealership(dealership);
    setEditDealership({
      name: dealership.name,
      phone: dealership.phone,
      address: dealership.address || "",
      description: dealership.description || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateDealership = async () => {
    if (!editDealership.name.trim()) {
      showToast("❌ لطفاً نام نمایندگی را وارد کنید", "error");
      return;
    }
    if (!editDealership.phone.trim()) {
      showToast("❌ لطفاً شماره تماس را وارد کنید", "error");
      return;
    }

    try {
      const dealershipRef = ref(db, `users/${user.uid}/dealerships/${editingDealership.id}`);
      await update(dealershipRef, {
        name: editDealership.name.trim(),
        phone: editDealership.phone.trim(),
        address: editDealership.address.trim() || "",
        description: editDealership.description.trim() || "",
        updatedAt: new Date().toISOString()
      });
      
      showToast(`✅ نمایندگی "${editDealership.name}" با موفقیت ویرایش شد`, "success");
      setShowEditModal(false);
      setEditingDealership(null);
    } catch (error) {
      showToast("❌ خطا در ویرایش نمایندگی", "error");
    }
  };

  const handleDeleteClick = (dealership) => {
    setDealershipToDelete(dealership);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!dealershipToDelete) return;
    try {
      await remove(ref(db, `users/${user.uid}/dealerships/${dealershipToDelete.id}`));
      showToast(`✅ نمایندگی "${dealershipToDelete.name}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف نمایندگی", "error");
    } finally {
      setOpenConfirmModal(false);
      setDealershipToDelete(null);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return "-";
    // فرمت دهی شماره تلفن (اختیاری)
    return phone;
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

  const filteredDealerships = dealerships.filter(dealership => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (dealership.name && dealership.name.toLowerCase().includes(searchLower)) ||
      (dealership.phone && dealership.phone.includes(searchTerm)) ||
      (dealership.address && dealership.address.toLowerCase().includes(searchLower))
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

  // استایل‌های مثل ArchivedCars
  const rightBoxStyle = (type) => {
    switch(type) {
      case 'name':
        return { backgroundColor: "#e0e7ff", borderRadius: "12px", padding: "6px 10px", textAlign: "left", fontWeight: "bold", color: "#4338ca", fontSize: "12px" };
      case 'phone':
        return { backgroundColor: "#dcfce7", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#16a34a", fontWeight: "500", fontSize: "12px" };
      case 'address':
        return { backgroundColor: "#fef3c7", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#d97706", fontWeight: "500", fontSize: "12px" };
      case 'date':
        return { backgroundColor: "#dbeafe", borderRadius: "12px", padding: "6px 10px", textAlign: "left", color: "#1e40af", fontWeight: "500", fontSize: "12px" };
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
    borderBottom: "2px solid #3b82f6"
  };

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
          <h2 style={pageTitleTextStyle}>🏢 نمایندگی‌ها</h2>
        </div>
        <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>➕ ثبت نمایندگی جدید</button>
      </div>

      <div style={statsContainerStyle}>
        <div style={statCardStyle}>
          <div style={statIconStyle}>🏢</div>
          <div>
            <div style={statValueStyle}>{filteredDealerships.length}</div>
            <div style={statLabelStyle}>تعداد نمایندگی‌ها</div>
          </div>
        </div>
        <div style={statCardStyle2}>
          <div style={statIconStyle}>📞</div>
          <div>
            <div style={statValueStyle}>تماس</div>
            <div style={statLabelStyle}>اطلاعات تماس</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" }}>
        <label style={{...labelStyle, maxWidth: "700px", margin: "0 auto 6px auto" }}>🔍 جستجو</label>
        <input
          type="text"
          placeholder="جستجو در نام، شماره تماس یا آدرس..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{...inputStyle(999, focusedIndex), maxWidth: "700px", margin: "0 auto", display: "block"}}
          onFocus={() => setFocusedIndex(999)}
          onBlur={() => setFocusedIndex(null)}
        />
      </div>

      {filteredDealerships.length === 0 ? (
        <div style={emptyStyle}>
          <span style={{ fontSize: "48px" }}>🏢</span>
          <p>هیچ نمایندگی ثبت نشده است</p>
          <button onClick={() => setShowAddModal(true)} style={emptyAddBtnStyle}>➕ ثبت نمایندگی جدید</button>
        </div>
      ) : (
        <div style={carsGridStyle}>
          {filteredDealerships.map((dealership, index) => {
            return (
              <div key={dealership.id} style={archiveCardStyle}>
                <div style={archiveHeaderStyle}>
                  <h3 style={archiveTitleStyle}>🏢 {dealership.name}</h3>
                  <span style={archiveBadgeStyle}>نمایندگی #{index + 1}</span>
                </div>

                <div style={archiveContentStyle}>
                  <div style={infoSectionStyle}>
                    <h4 style={sectionTitleStyle}>📋 اطلاعات نمایندگی</h4>
                    <div style={infoRowStyle}>
                      <span>نام نمایندگی:</span>
                      <div style={rightBoxStyle('name')}>{dealership.name}</div>
                    </div>
                    <div style={infoRowStyle}>
                      <span>شماره تماس:</span>
                      <div style={rightBoxStyle('phone')}>{formatPhone(dealership.phone)}</div>
                    </div>
                    {dealership.address && (
                      <div style={infoRowStyle}>
                        <span>آدرس:</span>
                        <div style={rightBoxStyle('address')}>{dealership.address}</div>
                      </div>
                    )}
                    {dealership.description && (
                      <div style={infoRowStyle}>
                        <span>توضیحات:</span>
                        <div style={rightBoxStyle('name')}>{dealership.description}</div>
                      </div>
                    )}
                    <div style={infoRowStyle}>
                      <span>تاریخ ثبت:</span>
                      <div style={rightBoxStyle('date')}>{dealership.createdAtPersian || toPersianDate(dealership.createdAt)}</div>
                    </div>
                  </div>

                  {/* سه ستون خالی برای تقارن */}
                  <div style={threeColumnsStyle}>
                    <div style={columnCardStyle}>
                      {/* خالی */}
                    </div>
                    <div style={columnCardStyle}>
                      {/* خالی */}
                    </div>
                    <div style={columnCardStyle}>
                      {/* خالی */}
                    </div>
                  </div>

                  {/* دکمه‌های عملیات */}
                  <div style={buttonContainerStyle}>
                    <button onClick={() => handleEditClick(dealership)} style={editBtnStyle}>
                      ✏️ ویرایش
                    </button>
                    <button onClick={() => handleDeleteClick(dealership)} style={deleteBtnStyle}>
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال ثبت نمایندگی */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="➕ ثبت نمایندگی جدید"
        color="#3b82f6"
        size="md"
      >
        <div style={modalFormStyle}>
          <label style={labelStyle}>🏢 نام نمایندگی *</label>
          <input
            type="text"
            placeholder="مثال: ایران خودرو - شعبه مرکزی"
            value={newDealership.name}
            onChange={(e) => setNewDealership({...newDealership, name: e.target.value})}
            style={inputStyle(0, focusedIndex)}
            onFocus={() => setFocusedIndex(0)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>📞 شماره تماس *</label>
          <input
            type="tel"
            placeholder="مثال: 021-12345678"
            value={newDealership.phone}
            onChange={(e) => setNewDealership({...newDealership, phone: e.target.value})}
            style={inputStyle(1, focusedIndex)}
            onFocus={() => setFocusedIndex(1)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>📍 آدرس (اختیاری)</label>
          <input
            type="text"
            placeholder="مثال: تهران، خیابان آزادی، پلاک ۱۲۳"
            value={newDealership.address}
            onChange={(e) => setNewDealership({...newDealership, address: e.target.value})}
            style={inputStyle(2, focusedIndex)}
            onFocus={() => setFocusedIndex(2)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={newDealership.description}
            onChange={(e) => setNewDealership({...newDealership, description: e.target.value})}
            style={{...inputStyle(3, focusedIndex), minHeight: "60px", resize: "vertical"}}
            onFocus={() => setFocusedIndex(3)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="توضیحات اضافی..."
          />

          <div style={modalBtnContainer}>
            <button onClick={() => setShowAddModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleAddDealership} style={submitBtnStyle}>✅ ثبت نمایندگی</button>
          </div>
        </div>
      </Modal>

      {/* مودال ویرایش نمایندگی */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title="✏️ ویرایش نمایندگی"
        color="#8b5cf6"
        size="md"
      >
        <div style={modalFormStyle}>
          <label style={labelStyle}>🏢 نام نمایندگی *</label>
          <input
            type="text"
            placeholder="مثال: ایران خودرو - شعبه مرکزی"
            value={editDealership.name}
            onChange={(e) => setEditDealership({...editDealership, name: e.target.value})}
            style={inputStyle(10, focusedIndex)}
            onFocus={() => setFocusedIndex(10)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>📞 شماره تماس *</label>
          <input
            type="tel"
            placeholder="مثال: 021-12345678"
            value={editDealership.phone}
            onChange={(e) => setEditDealership({...editDealership, phone: e.target.value})}
            style={inputStyle(11, focusedIndex)}
            onFocus={() => setFocusedIndex(11)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>📍 آدرس (اختیاری)</label>
          <input
            type="text"
            placeholder="مثال: تهران، خیابان آزادی، پلاک ۱۲۳"
            value={editDealership.address}
            onChange={(e) => setEditDealership({...editDealership, address: e.target.value})}
            style={inputStyle(12, focusedIndex)}
            onFocus={() => setFocusedIndex(12)}
            onBlur={() => setFocusedIndex(null)}
          />

          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea
            value={editDealership.description}
            onChange={(e) => setEditDealership({...editDealership, description: e.target.value})}
            style={{...inputStyle(13, focusedIndex), minHeight: "60px", resize: "vertical"}}
            onFocus={() => setFocusedIndex(13)}
            onBlur={() => setFocusedIndex(null)}
            placeholder="توضیحات اضافی..."
          />

          <div style={modalBtnContainer}>
            <button onClick={() => setShowEditModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleUpdateDealership} style={submitBtnPurpleStyle}>✏️ ویرایش نمایندگی</button>
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
            آیا از حذف نمایندگی <strong>"{dealershipToDelete?.name}"</strong> مطمئن هستید؟
          </p>
          <p style={confirmWarningStyle}>این عمل غیرقابل بازگشت است.</p>
          <div style={confirmBtnContainer}>
            <button onClick={() => setOpenConfirmModal(false)} style={confirmCancelBtn}>انصراف</button>
            <button onClick={confirmDelete} style={confirmDeleteBtn}>حذف نمایندگی</button>
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
  background: "#3b82f6", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold"
};

const emptyAddBtnStyle = {
  background: "#3b82f6", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", marginTop: "20px"
};

const pageTitleWrapper = { flex: 1, textAlign: "center" };
const pageTitleTextStyle = { fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: 0 };

const statsContainerStyle = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px", maxWidth: "700px", margin: "0 auto 24px auto" };
const statCardStyle = { background: "linear-gradient(135deg, #475569, #64748b)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
const statCardStyle2 = { background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" };
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

const archiveHeaderStyle = { background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const archiveTitleStyle = { margin: 0, fontSize: "16px", fontWeight: "bold", color: "#fff" };
const archiveBadgeStyle = { background: "#ffffff", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", color: "#3b82f6", fontWeight: "bold" };
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
const modalBtnContainer = { display: "flex", gap: "10px", marginTop: "10px" };
const cancelBtnStyle = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const submitBtnStyle = { flex: 1, padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const submitBtnPurpleStyle = { flex: 1, padding: "10px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };

const confirmModalStyle = { textAlign: "center", padding: "10px" };
const confirmTextStyle = { fontSize: "16px", marginBottom: "12px" };
const confirmWarningStyle = { fontSize: "12px", color: "#ef4444", marginBottom: "20px" };
const confirmBtnContainer = { display: "flex", gap: "12px", marginTop: "10px" };
const confirmCancelBtn = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmDeleteBtn = { flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

export default DealershipList;