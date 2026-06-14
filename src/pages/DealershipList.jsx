import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import Modal from "../Modal";
import DataTable from "react-data-table-component";

const DealershipList = ({ user, onBack }) => {
  const [dealerships, setDealerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [dealershipToDelete, setDealershipToDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDealership, setEditingDealership] = useState(null);
  
  const [newDealership, setNewDealership] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
    createdAt: new Date().toISOString()
  });
  
  const [editDealership, setEditDealership] = useState({
    name: "",
    phone: "",
    address: "",
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
    const dealershipsRef = ref(db, `users_emails/${emailKey}/dealerships`);
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
  }, [user, emailKey]);

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
      const dealershipsRef = ref(db, `users_emails/${emailKey}/dealerships`);
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
      const dealershipRef = ref(db, `users_emails/${emailKey}/dealerships/${editingDealership.id}`);
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
      await remove(ref(db, `users_emails/${emailKey}/dealerships/${dealershipToDelete.id}`));
      showToast(`✅ نمایندگی "${dealershipToDelete.name}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف نمایندگی", "error");
    } finally {
      setOpenConfirmModal(false);
      setDealershipToDelete(null);
    }
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

  const formatPhone = (phone) => phone || "-";

  const filteredData = dealerships.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(searchLower)) ||
      (item.phone && item.phone.includes(searchTerm)) ||
      (item.address && item.address.toLowerCase().includes(searchLower))
    );
  });

  // ستون‌های جدول با عرض مساوی (grow: 1)
  const columns = [
    {
      name: "ردیف",
      selector: (row, index) => index + 1,
      sortable: true,
      width: "60px",
      center: true
    },
    {
      name: "نام نمایندگی",
      selector: (row) => row.name,
      sortable: true,
      grow: 1,
      cell: (row) => <span style={{ fontWeight: "bold", color: "#1e293b" }}>{row.name}</span>
    },
    {
      name: "شماره تماس",
      selector: (row) => row.phone,
      sortable: true,
      grow: 1,
      cell: (row) => (
        <span style={{
          background: "#dcfce7",
          padding: "4px 10px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#16a34a",
          display: "inline-block"
        }}>
          📞 {formatPhone(row.phone)}
        </span>
      )
    },
    {
      name: "تاریخ ثبت",
      selector: (row) => row.createdAtPersian || toPersianDate(row.createdAt),
      sortable: true,
      grow: 1,
      cell: (row) => (
        <span style={{
          background: "#dbeafe",
          padding: "4px 10px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#1e40af",
          display: "inline-block"
        }}>
          {row.createdAtPersian || toPersianDate(row.createdAt)}
        </span>
      )
    },
    {
      name: "آدرس",
      selector: (row) => row.address,
      sortable: true,
      grow: 2,
      cell: (row) => row.address ? (
        <span style={{
          background: "#fef3c7",
          padding: "4px 10px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#d97706",
          display: "inline-block",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          📍 {row.address.length > 40 ? row.address.substring(0, 40) + "..." : row.address}
        </span>
      ) : "-"
    },
    {
      name: "عملیات",
      width: "85px",
      center: true,
      cell: (row) => (
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          <button
            onClick={() => handleEditClick(row)}
            style={{
              background: "#e0e7ff",
              border: "none",
              padding: "5px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#c7d2fe"}
            onMouseLeave={(e) => e.target.style.background = "#e0e7ff"}
            title="ویرایش"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            style={{
              background: "#fee2e2",
              border: "none",
              padding: "5px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#fecaca"}
            onMouseLeave={(e) => e.target.style.background = "#fee2e2"}
            title="حذف"
          >
            🗑️
          </button>
        </div>
      )
    }
  ];

  const customStyles = {
    table: {
      style: {
        borderRadius: "16px",
        overflow: "hidden"
      }
    },
    headRow: {
      style: {
        backgroundColor: "#f1f5f9",
        borderBottom: "1px solid #e2e8f0"
      }
    },
    headCells: {
      style: {
        fontSize: "13px",
        fontWeight: "bold",
        color: "#475569",
        padding: "12px 16px"
      }
    },
    rows: {
      style: {
        fontSize: "13px",
        color: "#334155",
        borderBottom: "1px solid #e2e8f0",
        transition: "background 0.2s",
        "&:hover": {
          backgroundColor: "#f8fafc"
        }
      }
    },
    cells: {
      style: {
        padding: "12px 16px"
      }
    },
    pagination: {
      style: {
        borderTop: "1px solid #e2e8f0",
        padding: "12px 16px"
      }
    }
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
    gap: "20px"
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

      <div style={headerButtonsStyle}>
        <button onClick={onBack} style={backBtnStyle}>← بازگشت</button>
        <div style={pageTitleWrapper}>
          <h2 style={pageTitleTextStyle}>🏢 لیست نمایندگی‌ها</h2>
        </div>
        <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>➕ ثبت نمایندگی جدید</button>
      </div>

      <div style={searchSectionStyle}>
      
        <div style={statsBadgeStyle}>
          <span>🏢</span>
          <span>تعداد کل: {filteredData.length} نمایندگی</span>
        </div>
          <div style={searchWrapperStyle}>
          <span style={searchIconStyle}>🔍</span>
          <input
            type="text"
            placeholder="جستجو..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={clearSearchBtn}>✕</button>
          )}
        </div>
      </div>

      <div style={tableOuterContainer}>
        <div style={tableContainerStyle}>
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
                <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>🏢</span>
                <p>هیچ نمایندگی‌ای ثبت نشده است</p>
                <button onClick={() => setShowAddModal(true)} style={emptyTableBtnStyle}>➕ ثبت نمایندگی جدید</button>
              </div>
            }
          />
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ ثبت نمایندگی جدید" color="#3b82f6" size="md">
        <div style={modalFormStyle}>
          <label style={labelStyle}>🏢 نام نمایندگی *</label>
          <input type="text" placeholder="مثال: ایران خودرو - شعبه مرکزی" value={newDealership.name} onChange={(e) => setNewDealership({...newDealership, name: e.target.value})} style={inputStyle(0, null)} />
          <label style={labelStyle}>📞 شماره تماس *</label>
          <input type="tel" placeholder="مثال: 021-12345678" value={newDealership.phone} onChange={(e) => setNewDealership({...newDealership, phone: e.target.value})} style={inputStyle(1, null)} />
          <label style={labelStyle}>📍 آدرس (اختیاری)</label>
          <input type="text" placeholder="مثال: تهران، خیابان آزادی، پلاک ۱۲۳" value={newDealership.address} onChange={(e) => setNewDealership({...newDealership, address: e.target.value})} style={inputStyle(2, null)} />
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={newDealership.description} onChange={(e) => setNewDealership({...newDealership, description: e.target.value})} style={{...inputStyle(3, null), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات اضافی..." rows="3" />
          <div style={modalBtnContainer}>
            <button onClick={() => setShowAddModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleAddDealership} style={submitBtnStyle}>✅ ثبت نمایندگی</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ ویرایش نمایندگی" color="#8b5cf6" size="md">
        <div style={modalFormStyle}>
          <label style={labelStyle}>🏢 نام نمایندگی *</label>
          <input type="text" placeholder="مثال: ایران خودرو - شعبه مرکزی" value={editDealership.name} onChange={(e) => setEditDealership({...editDealership, name: e.target.value})} style={inputStyle(10, null)} />
          <label style={labelStyle}>📞 شماره تماس *</label>
          <input type="tel" placeholder="مثال: 021-12345678" value={editDealership.phone} onChange={(e) => setEditDealership({...editDealership, phone: e.target.value})} style={inputStyle(11, null)} />
          <label style={labelStyle}>📍 آدرس (اختیاری)</label>
          <input type="text" placeholder="مثال: تهران، خیابان آزادی، پلاک ۱۲۳" value={editDealership.address} onChange={(e) => setEditDealership({...editDealership, address: e.target.value})} style={inputStyle(12, null)} />
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={editDealership.description} onChange={(e) => setEditDealership({...editDealership, description: e.target.value})} style={{...inputStyle(13, null), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات" rows="3" />
          <div style={modalBtnContainer}>
            <button onClick={() => setShowEditModal(false)} style={cancelBtnStyle}>انصراف</button>
            <button onClick={handleUpdateDealership} style={submitBtnPurpleStyle}>✏️ ویرایش نمایندگی</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title="🗑️ تأیید حذف" color="#ef4444" size="sm">
        <div style={confirmModalStyle}>
          <p style={confirmTextStyle}>آیا از حذف نمایندگی <strong>"{dealershipToDelete?.name}"</strong> مطمئن هستید؟</p>
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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const headerButtonsStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "10px", flexWrap: "wrap" };
const backBtnStyle = { background: "#64748b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px" };
const addBtnStyle = { background: "#3b82f6", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" };
const pageTitleWrapper = { flex: 1, textAlign: "center" };
const pageTitleTextStyle = { fontSize: "20px", fontWeight: "bold", color: "#1e293b", margin: 0 };

const searchSectionStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
  gap: "16px",
  flexWrap: "wrap"
};

const statsBadgeStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
  padding: "8px 16px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "500",
  color: "#4338ca"
};

const searchWrapperStyle = { position: "relative", flex: "0 0 300px" };
const searchIconStyle = { 
  position: "absolute", 
  right: "12px", 
  top: "50%", 
  transform: "translateY(-50%)", 
  fontSize: "14px", 
  color: "#94a3b8",
  pointerEvents: "none"
};
const clearSearchBtn = { 
  position: "absolute", 
  left: "12px", 
  top: "50%", 
  transform: "translateY(-50%)", 
  background: "none", 
  border: "none", 
  fontSize: "14px", 
  cursor: "pointer", 
  color: "#94a3b8",
  padding: "4px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s"
};
const searchInputStyle = { 
  width: "100%", 
  padding: "8px 35px 8px 35px", 
  borderRadius: "10px", 
  border: "1px solid #cbd5e1", 
  backgroundColor: "#ffffff",
  fontSize: "13px", 
  outline: "none", 
  transition: "all 0.2s ease"
};

const tableOuterContainer = {
  display: "flex",
  justifyContent: "center",
  width: "100%"
};
const tableContainerStyle = {
  width: "100%",
  maxWidth: "1200px",
  background: "#fff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  border: "1px solid #e2e8f0"
};

const emptyTableBtnStyle = { marginTop: "16px", padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" };

const modalFormStyle = { display: "flex", flexDirection: "column", gap: "12px" };
const modalBtnContainer = { display: "flex", gap: "10px", marginTop: "10px" };
const cancelBtnStyle = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const submitBtnStyle = { flex: 1, padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const submitBtnPurpleStyle = { flex: 1, padding: "10px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };

const confirmModalStyle = { textAlign: "center", padding: "10px" };
const confirmTextStyle = { fontSize: "16px", marginBottom: "12px" };
const confirmWarningStyle = { fontSize: "12px", color: "#ef4444", marginBottom: "20px" };
const confirmBtnContainer = { display: "flex", gap: "12px", marginTop: "10px" };
const confirmCancelBtn = { flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };
const confirmDeleteBtn = { flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" };

export default DealershipList;