import React, { useState } from "react";
import { auth } from "./firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // بررسی معتبر بودن ایمیل (فرمت و دامنه)
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ثبت نام با هشدار ایمیل نامعتبر
  const handleSignUp = async () => {
    if (!email || !password) {
      showToast("❌ لطفاً ایمیل و رمز عبور را وارد کنید", "error");
      return;
    }
    
    if (!isValidEmail(email)) {
      showToast("⚠️ ایمیل وارد شده معتبر نیست! لطفاً یک ایمیل واقعی وارد کنید (مثال: name@gmail.com)", "warning");
      return;
    }
    
    if (password.length < 6) {
      showToast("❌ رمز عبور باید حداقل ۶ کاراکتر باشد", "error");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      showToast(`✅ ثبت نام با موفقیت انجام شد! اکنون می‌توانید وارد شوید`, "success");
      setPassword("");
      setIsLogin(true);
      
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        showToast("❌ این ایمیل قبلاً ثبت نام کرده است. لطفاً وارد شوید", "error");
      } else if (err.code === "auth/invalid-email") {
        showToast("⚠️ فرمت ایمیل نامعتبر است. لطفاً یک ایمیل واقعی وارد کنید", "warning");
      } else if (err.code === "auth/weak-password") {
        showToast("❌ رمز عبور ضعیف است (حداقل ۶ کاراکتر)", "error");
      } else {
        showToast(`❌ خطا: ${err.code}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // ورود
  const handleSignIn = async () => {
    if (!email || !password) {
      showToast("❌ لطفاً ایمیل و رمز عبور را وارد کنید", "error");
      return;
    }
    
    if (!isValidEmail(email)) {
      showToast("⚠️ ایمیل وارد شده معتبر نیست! لطفاً ایمیل صحیح وارد کنید", "warning");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      showToast(`✅ خوش آمدید! در حال انتقال...`, "success");
      setTimeout(() => onLogin(userCredential.user), 1000);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        showToast("❌ کاربری با این ایمیل یافت نشد. لطفاً ثبت نام کنید", "error");
      } else if (err.code === "auth/wrong-password") {
        showToast("❌ رمز عبور اشتباه است. دوباره تلاش کنید", "error");
      } else if (err.code === "auth/invalid-email") {
        showToast("⚠️ فرمت ایمیل نامعتبر است", "warning");
      } else if (err.code === "auth/invalid-credential") {
        showToast("❌ ایمیل یا رمز عبور اشتباه است", "error");
      } else {
        showToast(`❌ خطا: ${err.code}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // بازیابی رمز عبور
  const handleResetPassword = async () => {
    if (!resetEmail) {
      showToast("❌ لطفاً ایمیل خود را وارد کنید", "error");
      return;
    }
    
    if (!isValidEmail(resetEmail)) {
      showToast("⚠️ ایمیل وارد شده معتبر نیست! لطفاً یک ایمیل واقعی وارد کنید", "warning");
      return;
    }
    
    setResetLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      showToast(`✅ لینک بازیابی رمز عبور به ایمیل ${resetEmail} ارسال شد`, "success");
      setShowResetModal(false);
      setResetEmail("");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        showToast("❌ کاربری با این ایمیل یافت نشد", "error");
      } else {
        showToast("❌ خطایی رخ داده است. دوباره تلاش کنید", "error");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLogin) {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          ...toastStyle,
          backgroundColor: toast.type === "success" ? "#10b981" : toast.type === "warning" ? "#f59e0b" : "#ef4444",
          animation: "slideIn 0.3s ease-out"
        }}>
          <span style={{ marginLeft: "10px", fontSize: "18px" }}>
            {toast.type === "success" ? "✅" : toast.type === "warning" ? "⚠️" : "❌"}
          </span>
          {toast.message}
        </div>
      )}

      <div style={styles.container}>
        <div style={styles.bubble1}></div>
        <div style={styles.bubble2}></div>
        <div style={styles.bubble3}></div>
        
        <div style={styles.card}>
          <div style={styles.iconContainer}>
            <div style={styles.iconCircle}>🚗</div>
          </div>
          
          <h1 style={styles.title}>مدیریت خودرو</h1>
          <p style={styles.subtitle}>
            {isLogin ? "ورود به حساب کاربری" : "ثبت نام در سامانه"}
          </p>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <span style={styles.inputIcon}>📧</span>
              <input
                type="email"
                placeholder="ایمیل"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
                required
              />
            </div>
            
            <div style={styles.inputGroup}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="رمز عبور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "در حال پردازش..." : (isLogin ? "ورود" : "ثبت نام")}
            </button>
            
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                style={styles.forgotButton}
              >
                رمز عبور خود را فراموش کرده‌اید؟
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
              }}
              style={styles.switchButton}
            >
              {isLogin ? "حساب کاربری ندارید؟ ثبت نام کنید" : "قبلاً ثبت نام کرده‌اید؟ وارد شوید"}
            </button>
          </form>
          
          <div style={styles.footer}>
            <p style={styles.footerText}>© 2024 مدیریت خودرو</p>
          </div>
        </div>
        
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
            100% { transform: translateY(0px); }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>

      {/* مودال فراموشی رمز عبور */}
      {showResetModal && (
        <div style={modalOverlay} onClick={() => setShowResetModal(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={modalTitle}>🔐 بازیابی رمز عبور</h3>
            <p style={modalText}>
              ایمیل خود را وارد کنید. لینک بازیابی رمز عبور برای شما ارسال می‌شود.
            </p>
            <input
              type="email"
              placeholder="ایمیل خود را وارد کنید"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              style={modalInput}
            />
            <div style={modalButtons}>
              <button onClick={() => setShowResetModal(false)} style={modalCancelBtn}>
                انصراف
              </button>
              <button onClick={handleResetPassword} style={modalConfirmBtn} disabled={resetLoading}>
                {resetLoading ? "در حال ارسال..." : "ارسال لینک بازیابی"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// استایل Toast
const toastStyle = {
  position: "fixed",
  top: "20px",
  right: "20px",
  left: "20px",
  maxWidth: "400px",
  margin: "0 auto",
  padding: "12px 20px",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "500",
  zIndex: 10000,
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  display: "flex",
  alignItems: "center",
  gap: "10px"
};

// استایل‌های اصلی
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    fontFamily: "'Vazirmatn', 'IRANSans', Tahoma, sans-serif"
  },
  bubble1: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    top: "-100px",
    right: "-100px",
    animation: "float 8s ease-in-out infinite"
  },
  bubble2: {
    position: "absolute",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    bottom: "-50px",
    left: "-50px",
    animation: "float 6s ease-in-out infinite reverse"
  },
  bubble3: {
    position: "absolute",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    bottom: "20%",
    right: "10%",
    animation: "float 10s ease-in-out infinite"
  },
  card: {
    background: "#ffffff",
    borderRadius: "32px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    animation: "fadeInUp 0.6s ease-out",
    position: "relative",
    zIndex: 10
  },
  iconContainer: {
    textAlign: "center",
    marginBottom: "24px"
  },
  iconCircle: {
    fontSize: "48px",
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)"
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    textAlign: "center",
    margin: "0 0 8px 0",
    color: "#1e293b"
  },
  subtitle: {
    fontSize: "14px",
    textAlign: "center",
    color: "#64748b",
    margin: "0 0 32px 0"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  inputGroup: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  inputIcon: {
    position: "absolute",
    right: "16px",
    fontSize: "18px",
    color: "#94a3b8",
    zIndex: 1
  },
  input: {
    width: "100%",
    padding: "14px 48px 14px 16px",
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "16px",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.3s",
    fontFamily: "inherit",
    color: "#1e293b",
    boxSizing: "border-box"
  },
  eyeButton: {
    position: "absolute",
    left: "16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    padding: 0,
    zIndex: 1
  },
  button: {
    padding: "14px 20px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s",
    marginTop: "8px",
    fontFamily: "inherit"
  },
  switchButton: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    fontSize: "14px",
    padding: "8px",
    fontFamily: "inherit"
  },
  forgotButton: {
    background: "none",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: "13px",
    padding: "4px",
    textAlign: "left",
    fontFamily: "inherit"
  },
  footer: {
    marginTop: "32px",
    textAlign: "center",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "24px"
  },
  footerText: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0
  }
};

// استایل‌های مودال
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalContent = {
  backgroundColor: "#fff",
  borderRadius: "20px",
  padding: "24px",
  width: "90%",
  maxWidth: "400px"
};

const modalTitle = {
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "12px",
  textAlign: "center",
  color: "#1e293b"
};

const modalText = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "20px",
  textAlign: "center"
};

const modalInput = {
  width: "100%",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  fontSize: "14px",
  marginBottom: "16px",
  boxSizing: "border-box"
};

const modalButtons = {
  display: "flex",
  gap: "12px"
};

const modalCancelBtn = {
  flex: 1,
  padding: "10px",
  backgroundColor: "#64748b",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px"
};

const modalConfirmBtn = {
  flex: 1,
  padding: "10px",
  backgroundColor: "#f59e0b",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "bold"
};

export default Login;