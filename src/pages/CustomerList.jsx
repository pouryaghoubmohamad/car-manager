import React, { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue, remove, push, set, update } from "firebase/database";
import DataTable from "react-data-table-component";
import Modal from "../Modal";

const CustomerList = ({ user, onBack }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
    createdAt: new Date().toISOString()
  });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState({
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
    const customersRef = ref(db, `users_emails/${emailKey}/customers`);
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
  }, [user, emailKey]);

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      showToast("❌ لطفاً نام مشتری را وارد کنید", "error");
      return;
    }
    if (!newCustomer.phone.trim()) {
      showToast("❌ لطفاً شماره تماس را وارد کنید", "error");
      return;
    }

    try {
      const customersRef = ref(db, `users_emails/${emailKey}/customers`);
      const persianDate = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      
      await push(customersRef, {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim() || "",
        description: newCustomer.description.trim() || "",
        createdAt: new Date().toISOString(),
        createdAtPersian: persianDate
      });
      
      showToast(`✅ مشتری "${newCustomer.name}" با موفقیت ثبت شد`, "success");
      setShowAddModal(false);
      setNewCustomer({
        name: "",
        phone: "",
        address: "",
        description: "",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      showToast("❌ خطا در ثبت مشتری", "error");
    }
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditCustomer({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || "",
      description: customer.description || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editCustomer.name.trim()) {
      showToast("❌ لطفاً نام مشتری را وارد کنید", "error");
      return;
    }
    if (!editCustomer.phone.trim()) {
      showToast("❌ لطفاً شماره تماس را وارد کنید", "error");
      return;
    }

    try {
      const customerRef = ref(db, `users_emails/${emailKey}/customers/${editingCustomer.id}`);
      await update(customerRef, {
        name: editCustomer.name.trim(),
        phone: editCustomer.phone.trim(),
        address: editCustomer.address.trim() || "",
        description: editCustomer.description.trim() || "",
        updatedAt: new Date().toISOString()
      });
      
      showToast(`✅ مشتری "${editCustomer.name}" با موفقیت ویرایش شد`, "success");
      setShowEditModal(false);
      setEditingCustomer(null);
    } catch (error) {
      showToast("❌ خطا در ویرایش مشتری", "error");
    }
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setOpenConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await remove(ref(db, `users_emails/${emailKey}/customers/${customerToDelete.id}`));
      showToast(`✅ مشتری "${customerToDelete.name}" با موفقیت حذف شد`, "success");
    } catch (error) {
      showToast("❌ خطا در حذف مشتری", "error");
    } finally {
      setOpenConfirmModal(false);
      setCustomerToDelete(null);
    }
  };

  // تابع پرینت
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const totalCount = filteredData.length;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>لیست مشتریان</title>
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
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; }
            .header h1 { font-size: 24px; color: #1e293b; }
            .header p { font-size: 12px; color: #64748b; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-size: 13px; }
            th { background: #f8fafc; font-weight: bold; color: #475569; }
            .total { margin-top: 20px; text-align: left; font-size: 16px; font-weight: bold; background: #dbeafe; padding: 10px; border-radius: 8px; }
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
            .print-btn { background: #3b82f6; color: white; }
            .close-btn { background: #64748b; color: white; }
            @media print {
              .bottom-buttons { display: none; }
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>👥 لیست مشتریان</h1>
            <p>تاریخ چاپ: ${new Intl.DateTimeFormat('fa-IR').format(new Date())}</p>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>نام مشتری</th><th>شماره تماس</th><th>آدرس</th><th>توضیحات</th><th>تاریخ ثبت</th></tr>
            </thead>
            <tbody>
              ${filteredData.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.phone}</td>
                  <td>${item.address || "-"}</td>
                  <td>${item.description || "-"}</td>
                  <td>${item.createdAtPersian || toPersianDate(item.createdAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">تعداد کل مشتریان: ${totalCount} نفر</div>
          <div class="bottom-buttons">
            <button class="print-btn" onclick="window.print()">🖨️ چاپ</button>
            <button class="close-btn" onclick="window.close()">✖️ برگشت</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatPhone = (phone) => {
    if (!phone) return "-";
    const cleanPhone = phone.toString().replace(/[^0-9]/g, "");
    if (cleanPhone.length === 11) {
      return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7, 11)}`;
    }
    return cleanPhone;
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

  const filteredData = customers.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(searchLower)) ||
      (item.phone && item.phone.includes(searchTerm)) ||
      (item.address && item.address.toLowerCase().includes(searchLower))
    );
  });

  const totalCount = filteredData.length;

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
      name: "نام مشتری",
      selector: (row) => row.name,
      sortable: true,
      grow: 1,
      cell: (row) => <span style={{ fontWeight: "bold", color: "#1e293b" }}>{row.name}</span>
    },
    {
      name: "شماره تماس",
      selector: (row) => row.phone,
      sortable: true,
      width: "150px",
      cell: (row) => (
        <span style={{
          background: "#dcfce7",
          padding: "4px 10px",
          borderRadius: "16px",
          fontSize: "12px",
          color: "#16a34a",
          display: "inline-block",
          direction: "ltr",
          unicodeBidi: "embed",
          whiteSpace: "nowrap"
        }}>
          📞 {formatPhone(row.phone)}
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
          maxWidth: "250px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>
          📍 {row.address}
        </span>
      ) : "-"
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
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          <button
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
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold", color: "#1e293b" }}>👥 مشتریان</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowAddModal(true)} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
            ➕ ثبت مشتری جدید
          </button>
          <button onClick={handlePrint} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
            🖨️ پرینت
          </button>
        </div>
      </div>

      {/* آمار */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "16px", marginBottom: "24px", maxWidth: "300px" }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "16px 20px", borderRadius: "16px", color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ fontSize: "32px" }}>👥</span>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{totalCount}</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>تعداد مشتریان</div>
          </div>
        </div>
      </div>

      {/* جستجو */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ position: "relative", maxWidth: "350px" }}>
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}>🔍</span>
          <input
            type="text"
            placeholder="جستجو در نام، شماره تماس یا آدرس..."
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
              <span style={{ fontSize: "48px", display: "block", marginBottom: "12px" }}>👥</span>
              <p>هیچ مشتری‌ای ثبت نشده است</p>
              <button onClick={() => setShowAddModal(true)} style={{ marginTop: "16px", padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>➕ ثبت مشتری جدید</button>
            </div>
          }
        />
      </div>

      {/* مودال ثبت مشتری */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ ثبت مشتری جدید" color="#3b82f6" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>👤 نام مشتری *</label>
          <input type="text" placeholder="مثال: علی محمدی" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} style={inputStyle(0, null)} />
          
          <label style={labelStyle}>📞 شماره تماس *</label>
          <input type="text" placeholder="مثال: 09123456789" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 11)})} style={inputStyle(1, null)} />
          
          <label style={labelStyle}>🏠 آدرس (اختیاری)</label>
          <input type="text" placeholder="مثال: تهران، خیابان آزادی" value={newCustomer.address} onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})} style={inputStyle(2, null)} />
          
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={newCustomer.description} onChange={(e) => setNewCustomer({...newCustomer, description: e.target.value})} style={{...inputStyle(3, null), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات اضافی..." rows="3" />
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={handleAddCustomer} style={{ flex: 1, padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>✅ ثبت مشتری</button>
          </div>
        </div>
      </Modal>

      {/* مودال ویرایش مشتری */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ ویرایش مشتری" color="#8b5cf6" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={labelStyle}>👤 نام مشتری *</label>
          <input type="text" placeholder="مثال: علی محمدی" value={editCustomer.name} onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})} style={inputStyle(10, null)} />
          
          <label style={labelStyle}>📞 شماره تماس *</label>
          <input type="text" placeholder="مثال: 09123456789" value={editCustomer.phone} onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 11)})} style={inputStyle(11, null)} />
          
          <label style={labelStyle}>🏠 آدرس (اختیاری)</label>
          <input type="text" placeholder="مثال: تهران، خیابان آزادی" value={editCustomer.address} onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})} style={inputStyle(12, null)} />
          
          <label style={labelStyle}>📝 توضیحات (اختیاری)</label>
          <textarea value={editCustomer.description} onChange={(e) => setEditCustomer({...editCustomer, description: e.target.value})} style={{...inputStyle(13, null), minHeight: "60px", resize: "vertical"}} placeholder="توضیحات" rows="3" />
          
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={handleUpdateCustomer} style={{ flex: 1, padding: "10px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>✏️ ویرایش مشتری</button>
          </div>
        </div>
      </Modal>

      {/* مودال حذف */}
      <Modal isOpen={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title="🗑️ تأیید حذف" color="#ef4444" size="sm">
        <div style={{ textAlign: "center", padding: "10px" }}>
          <p style={{ fontSize: "16px", marginBottom: "12px" }}>آیا از حذف مشتری <strong>"{customerToDelete?.name}"</strong> مطمئن هستید؟</p>
          <p style={{ fontSize: "12px", color: "#ef4444", marginBottom: "20px" }}>این عمل غیرقابل بازگشت است.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button onClick={() => setOpenConfirmModal(false)} style={{ flex: 1, padding: "10px", background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>انصراف</button>
            <button onClick={confirmDelete} style={{ flex: 1, padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>حذف مشتری</button>
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

export default CustomerList;