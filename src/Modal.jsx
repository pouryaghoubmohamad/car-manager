import React, { useEffect } from "react";
import ReactDOM from "react-dom";

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  color = "#3b82f6", 
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = false,  // ← همینطور بمونه (بسته نمیشه)
  closeOnEsc = true,
  animation = "fade",
  showFooter = false,
  footerContent = null,
  zIndex = 99999
}) => {
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeOnEsc, onClose]);

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getModalWidth = () => {
    switch(size) {
      case "sm": return "500px";
      case "lg": return "800px";
      case "xl": return "1000px";
      default: return "600px";
    }
  };

  const getAnimationStyle = () => {
    switch(animation) {
      case "slide":
        return { animation: "modalFadeIn 0.3s ease-out" };
      case "scale":
        return { animation: "modalScaleIn 0.2s ease-out" };
      default:
        return { animation: "modalFadeIn 0.3s ease-out" };
    }
  };

  return ReactDOM.createPortal(
    <>
      <style>
        {`
          @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalScaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      
      <div style={{...overlayStyle, zIndex: zIndex}} onClick={handleOverlayClick}>
        <div className="app-modal-box" style={{...modalBoxStyle, width: getModalWidth(), ...getAnimationStyle()}} onClick={(e) => e.stopPropagation()}>
          
          <div className="app-modal-header" style={{...headerStyle, backgroundColor: color }}>
            <h3 style={headerTitleStyle}>{title}</h3>
            {showCloseButton && (
              <button onClick={onClose} style={closeBtnStyle}>✕</button>
            )}
          </div>

          <div className="app-modal-content" style={modalContentStyle}>
            {children}
          </div>

          {showFooter && (
            <div style={footerStyle}>
              {footerContent || (
                <>
                  <button onClick={onClose} style={footerCancelBtn}>انصراف</button>
                  <button style={footerConfirmBtn}>تایید</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

// ===== استایل‌ها (بدون blur) =====
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",  // ← blur حذف شد
  // backdropFilter: "blur(4px)",  // ← این خط رو حذف کن یا کامنت کن
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modalBoxStyle = {
  position: "relative",
  maxWidth: "90%",
  maxHeight: "90vh",
  backgroundColor: "#fff",
  borderRadius: "20px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden"
};

const modalContentStyle = { 
  padding: "24px",
  overflowY: "auto",
  flex: 1,
  scrollbarWidth: "thin",
  scrollbarColor: "#cbd5e1 #f1f5f9"
};

const headerStyle = {
  padding: "16px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid rgba(255,255,255,0.1)"
};

const headerTitleStyle = { 
  margin: 0, 
  color: "#fff", 
  fontSize: "18px", 
  fontWeight: "600"
};

const closeBtnStyle = {
  background: "rgba(255,255,255,0.2)",
  border: "none",
  color: "#fff",
  borderRadius: "10px",
  width: "30px",
  height: "30px",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "16px",
  transition: "all 0.2s"
};

const footerStyle = {
  padding: "16px 24px",
  borderTop: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  backgroundColor: "#f8fafc"
};

const footerCancelBtn = {
  padding: "8px 20px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  backgroundColor: "#e2e8f0",
  color: "#475569"
};

const footerConfirmBtn = {
  padding: "8px 20px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  backgroundColor: "#3b82f6",
  color: "#fff"
};

export default Modal;