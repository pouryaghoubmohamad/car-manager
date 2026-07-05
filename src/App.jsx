import React, { useState, useEffect } from "react";
import useIsMobile from "./hooks/useIsMobile";
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
import ProfitManager from "./pages/ProfitManager";


function App() {
  // کاربر ثابت - بدون لاگین
  const [user, setUser] = useState({ 
    uid: "single-user", 
    email: "admin@carmanager.com" 
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [editingCar, setEditingCar] = useState(null);
  const [selectedCarForSale, setSelectedCarForSale] = useState(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const isMobile = useIsMobile(768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [toast, setToast] = useState(null);

  // در موبایل، منو به‌صورت پیش‌فرض بسته باشه؛ در دسکتاپ باز باشه
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // بعد از انتخاب یک صفحه در موبایل، منو خودکار بسته بشه
  const goToPage = (page) => {
    setCurrentPage(page);
    if (isMobile) setSidebarOpen(false);
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
    setCurrentPage("carList");
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

  // در دسکتاپ: عرض متغیر (باز/جمع) که کل صفحه رو هل می‌ده
  // در موبایل: عرض ثابت که به‌صورت کشو (drawer) روی محتوا می‌شینه
  const sidebarWidth = isMobile ? "220px" : (sidebarOpen ? "180px" : "45px");

  return (
    <div className="app-shell-height" style={appContainer}>
      {/* نوار بالای موبایل با دکمه همبرگر */}
      {isMobile && (
        <div style={mobileTopBar}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={mobileHamburgerBtn}>
            ☰
          </button>
          <h2 style={mobileTopBarTitle}>🚗 مدیریت خودرو</h2>
        </div>
      )}

      {/* پس‌زمینه تیره پشت منو در حالت موبایل */}
      {isMobile && sidebarOpen && (
        <div style={backdropStyle} onClick={() => setSidebarOpen(false)} />
      )}

      {/* نوار کناری (منو) - سمت راست */}
      <div
        className="app-sidebar-full-height"
        style={{
          ...sidebarStyle,
          width: sidebarWidth,
          right: 0,
          left: "auto",
          ...(isMobile
            ? {
                transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
                boxShadow: sidebarOpen ? "-4px 0 20px rgba(0,0,0,0.3)" : "none",
              }
            : {}),
        }}
      >
        {!isMobile && (
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={hamburgerBtn}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        )}

        <div style={sidebarHeader}>
          {sidebarOpen ? (
            <>
              <h2 style={sidebarTitle}>🚗 مدیریت خودرو</h2>
            </>
          ) : (
            <div style={sidebarMiniLogo}>🚗</div>
          )}
        </div>
        
        <div style={sidebarMenu}>
          <button
            onClick={() => goToPage("dashboard")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "dashboard" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="داشبورد"
          >
            {sidebarOpen && <span style={menuText}>📊 داشبورد</span>}
            <span style={menuIcon}>📊</span>
          </button>
          
          <button
            onClick={() => goToPage("carList")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "carList" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="خودروهای فعال"
          >
            {sidebarOpen && <span style={menuText}>🚗 خودروهای فعال</span>}
            <span style={menuIcon}>🚗</span>
          </button>
          
          <button
            onClick={() => goToPage("archived")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "archived" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="بایگانی"
          >
            {sidebarOpen && <span style={menuText}>📦 بایگانی</span>}
            <span style={menuIcon}>📦</span>
          </button>
          
          <button
            onClick={() => goToPage("officeExpenses")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "officeExpenses" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="هزینه‌های دفتری"
          >
            {sidebarOpen && <span style={menuText}>💰 هزینه‌های دفتری</span>}
            <span style={menuIcon}>💰</span>
          </button>
          
          <button
            onClick={() => goToPage("incomes")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "incomes" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="درآمدها"
          >
            {sidebarOpen && <span style={menuText}>💵 درآمدها</span>}
            <span style={menuIcon}>💵</span>
          </button>
          
          <button
            onClick={() => goToPage("dealerships")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "dealerships" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="نمایندگی‌ها"
          >
            {sidebarOpen && <span style={menuText}>🏢 نمایندگی‌ها</span>}
            <span style={menuIcon}>🏢</span>
          </button>

          <button
            onClick={() => goToPage("customers")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "customers" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="مشتریان"
          >
            {sidebarOpen && <span style={menuText}>👥 مشتریان</span>}
            <span style={menuIcon}>👥</span>
          </button>

          <button
            onClick={() => goToPage("profit")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "profit" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px"
            }}
            title="مدیریت سود"
          >
            {sidebarOpen && <span style={menuText}>📈 سود و گزارش</span>}
            <span style={menuIcon}>📈</span>
          </button>

          <button
            onClick={() => goToPage("backup")}
            style={{
              ...menuBtnStyle,
              backgroundColor: currentPage === "backup" ? "#f59e0b" : "transparent",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "6px 8px" : "4px",
              marginTop: "auto",
              marginBottom: "4px"
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
              📱 {offlineCount} در صف
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
      <div
        className="app-content-min-height"
        style={{
          ...contentStyle,
          marginRight: isMobile ? 0 : sidebarWidth,
          marginLeft: 0,
          marginTop: isMobile ? "48px" : 0,
        }}
      >
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
            onSaved={handleBackFromAddCar}
            editingCar={editingCar}
          />
        )}
        {currentPage === "archived" && (
          <ArchivedCars
            user={user}
            onBack={() => setCurrentPage("dashboard")}
            onRestoreSuccess={() => {
              console.log("خودرو بازیابی شد");
            }}
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
          />
        )}
        {currentPage === "profit" && (
          <ProfitManager user={user} onBack={() => setCurrentPage("dashboard")} />
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

// ===== استایل‌ها =====
const appContainer = {
  display: "flex",
  backgroundColor: "#f1f5f9",
  position: "relative"
};

const hamburgerBtn = {
  position: "absolute",
  top: "8px",
  left: "8px",
  right: "auto",
  zIndex: 200,
  background: "#f59e0b",
  border: "none",
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  fontSize: "10px",
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
  overflow: "hidden",
  zIndex: 200,
  justifyContent: "flex-start",
  transition: "width 0.3s ease, transform 0.3s ease",
  top: 0,
  boxShadow: "-2px 0 10px rgba(0,0,0,0.1)"
};

const mobileTopBar = {
  position: "fixed",
  top: 0,
  right: 0,
  left: 0,
  height: "48px",
  backgroundColor: "#1e293b",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "0 12px",
  zIndex: 150,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
};

const mobileHamburgerBtn = {
  background: "#f59e0b",
  border: "none",
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  fontSize: "16px",
  cursor: "pointer",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};

const mobileTopBarTitle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "bold",
  color: "#fff"
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: 190
};

const sidebarHeader = {
  padding: "10px 8px",
  borderBottom: "1px solid #334155",
  textAlign: "center",
  marginTop: "28px"
};

const sidebarTitle = {
  margin: 0,
  fontSize: "12px",
  fontWeight: "bold",
  color: "#fff"
};

const sidebarMiniLogo = {
  fontSize: "20px",
  textAlign: "center"
};

const sidebarMenu = {
  flex: 1,
  padding: "6px",
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  overflow: "hidden"
};

const menuBtnStyle = {
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "500",
  color: "#fff",
  textAlign: "left",
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  width: "100%",
  minHeight: "28px",
  whiteSpace: "nowrap"
};

const menuIcon = {
  fontSize: "14px"
};

const menuText = {
  fontSize: "11px"
};

const sidebarFooter = {
  padding: "4px 6px",
  borderTop: "1px solid #334155"
};

const offlineBadge = {
  padding: "4px 6px",
  backgroundColor: "#f59e0b",
  borderRadius: "6px",
  textAlign: "center",
  fontSize: "8px",
  fontWeight: "bold",
  color: "#fff"
};

const offlineBadgeMini = {
  padding: "4px",
  backgroundColor: "#f59e0b",
  borderRadius: "6px",
  textAlign: "center",
  fontSize: "10px",
  color: "#fff",
  cursor: "pointer"
};

const contentStyle = {
  flex: 1,
  padding: "16px",
  overflowY: "auto",
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

// اضافه کردن انیمیشن
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

export default App;