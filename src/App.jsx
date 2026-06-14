import React, { useState, useEffect } from "react";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import CarList from "./pages/CarList";
import AddCar from "./pages/CarForm";
import ArchivedCars from "./pages/ArchivedCars";
import OfficeExpenseList from "./pages/OfficeExpenseList";
import IncomeList from "./pages/IncomeList";
import DealershipList from "./pages/DealershipList";
import BackupManager from "./pages/BackupManager";
import SellCarModal from "./pages/SellCarModal";
import CustomerList from "./pages/CustomerList";
import CustomerForm from "./pages/CustomerForm";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("login");
  const [editingCar, setEditingCar] = useState(null);
  const [selectedCarForSale, setSelectedCarForSale] = useState(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setCurrentPage("dashboard");
        checkOfflineData(user.uid);
      } else {
        setCurrentPage("login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const checkOfflineData = (uid) => {
    const saved = localStorage.getItem(`offline_cars_${uid}`);
    if (saved) {
      const offlineCars = JSON.parse(saved);
      setOfflineCount(offlineCars.length);
    }
  };

  const handleAddCar = () => {
    setEditingCar(null);
    setCurrentPage("addCar");
  };

  const handleEditCar = (car) => {
    setEditingCar(car);
    setCurrentPage("addCar");
  };

  const handleBackFromAddCar = () => {
    setCurrentPage("dashboard");
    setEditingCar(null);
  };

  const handleSellCar = (car) => {
    setSelectedCarForSale(car);
    setSellModalOpen(true);
  };

  const handleSold = () => {
    setSellModalOpen(false);
    setSelectedCarForSale(null);
    if (currentPage === "carList") {
      setCurrentPage("carList");
    }
  };

  if (loading) {
    return (
      <div style={loadingContainer}>
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

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const sidebarWidth = sidebarOpen ? "200px" : "50px";

  return (
    <div style={appContainer}>
      {/* نوار کناری (منو) - سمت راست */}
      <div style={{...sidebarStyle, width: sidebarWidth, right: 0, left: "auto"}}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={hamburgerBtn}>
          {sidebarOpen ? "▶" : "◀"}
        </button>

        <div style={sidebarHeader}>
          {sidebarOpen ? (
            <>
              <h2 style={sidebarTitle}>🚗 مدیریت خودرو</h2>
              <p style={sidebarUser}>{user?.email}</p>
            </>
          ) : (
            <div style={sidebarMiniLogo}>🚗</div>
          )}
        </div>
        
        <div style={sidebarMenu}>
          <button
            onClick={() => setCurrentPage("dashboard")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "dashboard" ? "#f59e0b" : "#334155",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px"
            }}
            title="داشبورد"
          >
            {sidebarOpen && <span style={menuText}>📊 داشبورد</span>}
            <span style={menuIcon}>📊</span>
          </button>
          
          <button
            onClick={() => setCurrentPage("carList")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "carList" ? "#f59e0b" : "#334155",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px"
            }}
            title="خودروهای فعال"
          >
            {sidebarOpen && <span style={menuText}>🚗 خودروهای فعال</span>}
            <span style={menuIcon}>🚗</span>
          </button>
          
          <button
            onClick={() => setCurrentPage("archived")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "archived" ? "#f59e0b" : "#334155",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px"
            }}
            title="بایگانی"
          >
            {sidebarOpen && <span style={menuText}>📦 بایگانی</span>}
            <span style={menuIcon}>📦</span>
          </button>
          
          <button
            onClick={() => setCurrentPage("officeExpenses")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "officeExpenses" ? "#f59e0b" : "#334155",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px"
            }}
            title="هزینه‌های دفتری"
          >
            {sidebarOpen && <span style={menuText}>💰 هزینه‌های دفتری</span>}
            <span style={menuIcon}>💰</span>
          </button>
          
          <button
            onClick={() => setCurrentPage("incomes")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "incomes" ? "#f59e0b" : "#334155",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px"
            }}
            title="درآمدها"
          >
            {sidebarOpen && <span style={menuText}>💵 درآمدها</span>}
            <span style={menuIcon}>💵</span>
          </button>
          
          <button
            onClick={() => setCurrentPage("dealerships")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "dealerships" ? "#f59e0b" : "#334155",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px"
            }}
            title="نمایندگی‌ها"
          >
            {sidebarOpen && <span style={menuText}>🏢 نمایندگی‌ها</span>}
            <span style={menuIcon}>🏢</span>
          </button>

          {/* دکمه مشتریان */}
          <button
            onClick={() => setCurrentPage("customers")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "customers" ? "#f59e0b" : "#334155",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px"
            }}
            title="مشتریان"
          >
            {sidebarOpen && <span style={menuText}>👥 مشتریان</span>}
            <span style={menuIcon}>👥</span>
          </button>

          {/* دکمه بکاپ */}
          <button
            onClick={() => setCurrentPage("backup")}
            style={{
              ...menuBtnStyle,
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px",
              backgroundColor: currentPage === "backup" ? "#f59e0b" : "#334155",
              marginTop: "20px"
            }}
            title="مدیریت بکاپ"
          >
            {sidebarOpen && <span style={menuText}>💾 بکاپ</span>}
            <span style={menuIcon}>💾</span>
          </button>
        </div>
        
        <div style={sidebarFooter}>
          {offlineCount > 0 && sidebarOpen && (
            <div style={offlineBadge}>
              📱 {offlineCount} خودرو در صف همگام‌سازی
            </div>
          )}
          {!sidebarOpen && offlineCount > 0 && (
            <div style={offlineBadgeMini} title={`${offlineCount} خودرو در صف همگام‌سازی`}>
              📱
            </div>
          )}
        </div>
      </div>

      {/* محتوای اصلی */}
      <div style={{...contentStyle, marginRight: sidebarWidth, marginLeft: 0}}>
        {currentPage === "dashboard" && (
          <Dashboard user={user} />
        )}
        {currentPage === "carList" && (
          <CarList
            user={user}
            onBack={() => setCurrentPage("dashboard")}
            onAddCar={handleAddCar}
            onEditCar={handleEditCar}
            onSellCar={handleSellCar}
          />
        )}
        {currentPage === "addCar" && (
          <AddCar
            user={user}
            onBack={handleBackFromAddCar}
            editingCar={editingCar}
          />
        )}
        {currentPage === "archived" && (
          <ArchivedCars
            user={user}
            onBack={() => setCurrentPage("dashboard")}
          />
        )}
        {currentPage === "officeExpenses" && (
          <OfficeExpenseList
            user={user}
            onBack={() => setCurrentPage("dashboard")}
          />
        )}
        {currentPage === "incomes" && (
          <IncomeList
            user={user}
            onBack={() => setCurrentPage("dashboard")}
          />
        )}
        {currentPage === "dealerships" && (
          <DealershipList
            user={user}
            onBack={() => setCurrentPage("dashboard")}
          />
        )}
        {currentPage === "customers" && (
          <CustomerList
            user={user}
            onBack={() => setCurrentPage("dashboard")}
            onAddCustomer={() => setCurrentPage("addCustomer")}
          />
        )}
        {currentPage === "addCustomer" && (
          <CustomerForm
            user={user}
            onSaved={() => setCurrentPage("customers")}
            onCancel={() => setCurrentPage("customers")}
          />
        )}
        {currentPage === "backup" && (
          <BackupManager
            user={user}
            onBack={() => setCurrentPage("dashboard")}
          />
        )}
      </div>

      {/* مودال فروش خودرو */}
      <SellCarModal
        isOpen={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        car={selectedCarForSale}
        user={user}
        onSold={handleSold}
      />

      {/* Toast Notification */}
      {toast && (
        <div style={{
          ...toastStyle,
          backgroundColor: toast.type === "success" ? "#10b981" : toast.type === "info" ? "#3b82f6" : "#ef4444",
          animation: "slideIn 0.3s ease-out"
        }}>
          <span>{toast.type === "success" ? "✅" : toast.type === "info" ? "🔄" : "❌"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// استایل‌ها
const appContainer = {
  display: "flex",
  minHeight: "100vh",
  backgroundColor: "#f1f5f9",
  position: "relative"
};

const hamburgerBtn = {
  position: "absolute",
  top: "10px",
  left: "10px",
  right: "auto",
  zIndex: 200,
  background: "#f59e0b",
  border: "none",
  width: "26px",
  height: "26px",
  borderRadius: "6px",
  fontSize: "11px",
  cursor: "pointer",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
  transition: "all 0.3s"
};

const sidebarStyle = {
  backgroundColor: "#1e293b",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  height: "100vh",
  overflow: "hidden",
  zIndex: 100,
  justifyContent: "space-between",
  transition: "width 0.3s ease",
  top: 0,
  boxShadow: "-2px 0 10px rgba(0,0,0,0.1)"
};

const sidebarHeader = {
  padding: "14px 10px",
  borderBottom: "1px solid #334155",
  textAlign: "center",
  marginTop: "32px"
};

const sidebarTitle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "bold",
  color: "#fff"
};

const sidebarUser = {
  margin: "4px 0 0 0",
  fontSize: "9px",
  color: "#94a3b8",
  wordBreak: "break-all"
};

const sidebarMiniLogo = {
  fontSize: "24px",
  textAlign: "center"
};

const sidebarMenu = {
  flex: 1,
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  overflow: "hidden"
};

const menuBtnStyle = {
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "bold",
  color: "#fff",
  textAlign: "left",
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  width: "100%"
};

const menuIcon = {
  fontSize: "14px"
};

const menuText = {
  fontSize: "11px"
};

const sidebarFooter = {
  padding: "8px",
  borderTop: "1px solid #334155"
};

const offlineBadge = {
  padding: "6px",
  backgroundColor: "#f59e0b",
  borderRadius: "8px",
  textAlign: "center",
  fontSize: "9px",
  fontWeight: "bold",
  marginBottom: "8px",
  color: "#fff"
};

const offlineBadgeMini = {
  padding: "6px",
  backgroundColor: "#f59e0b",
  borderRadius: "8px",
  textAlign: "center",
  fontSize: "12px",
  marginBottom: "8px",
  color: "#fff",
  cursor: "pointer"
};

const contentStyle = {
  flex: 1,
  padding: "20px",
  overflowY: "auto",
  minHeight: "100vh",
  transition: "margin-right 0.3s ease"
};

const toastStyle = {
  position: "fixed",
  top: "20px",
  right: "20px",
  padding: "10px 16px",
  borderRadius: "10px",
  color: "#fff",
  fontSize: "13px",
  fontWeight: "500",
  zIndex: 10000,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const loadingContainer = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  backgroundColor: "#f1f5f9"
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
  marginTop: "16px",
  color: "#64748b",
  fontSize: "14px"
};

export default App;