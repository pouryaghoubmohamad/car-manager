import React, { useState } from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getDatabase, ref, set, serverTimestamp } from "firebase/database";
import { app, db } from "./firebaseConfig";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const Login = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // ذخیره اطلاعات کاربر در دیتابیس
      const userRef = ref(db, `users/${user.uid}`);
      await set(userRef, {
        email: user.email,
        name: user.displayName,
        photo: user.photoURL || "",
        lastLogin: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      
      onLogin(user);
    } catch (error) {
      console.error("خطا:", error);
      setError("❌ خطا در ورود! لطفاً دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>🚗 مدیریت نمایشگاه خودرو</h1>
        <p style={subtitleStyle}>برای ورود، از حساب گوگل خود استفاده کنید</p>
        
        {error && <div style={errorStyle}>{error}</div>}
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? "⏳ در حال اتصال..." : "🔐 ورود با گوگل"}
        </button>
      </div>
    </div>
  );
};

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  fontFamily: "'Vazir', 'IRANSans', Tahoma",
};

const cardStyle = {
  background: "#fff",
  padding: "40px",
  borderRadius: "20px",
  textAlign: "center",
  maxWidth: "400px",
  width: "90%",
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
};

const titleStyle = {
  margin: "0 0 10px 0",
  fontSize: "24px",
  color: "#1e293b"
};

const subtitleStyle = {
  margin: "0 0 30px 0",
  fontSize: "14px",
  color: "#64748b"
};

const errorStyle = {
  background: "#fee2e2",
  color: "#dc2626",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "20px",
  fontSize: "14px"
};

const buttonStyle = {
  background: "#4285f4",
  color: "#fff",
  border: "none",
  padding: "14px 28px",
  fontSize: "16px",
  borderRadius: "30px",
  cursor: "pointer",
  fontWeight: "bold",
  width: "100%",
  transition: "all 0.3s"
};

export default Login;