import React, { useState } from "react";
import { signin, googleSignIn } from "./authService.js";
import { FcGoogle } from "react-icons/fc";
import { navigateTo } from "./utils/router.js";
import "./authPages.css";

function SignIn() {
  const primaryColor = "#ff4d2d";
  const bgColor = "#fff9f6";
  const borderColor = "#ddd";
  const inputStyle = {
    width: "100%",
    border: `1px solid ${borderColor}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: 14,
    boxSizing: "border-box",
  };
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await signin({ email, password }, true);
      const payload = res?.data ?? res;
      setMessage(payload.message || "Signed in successfully");
      if (payload?.token) {
        localStorage.setItem("token", payload.token);
        window.dispatchEvent(new Event('authChange'));
        navigateTo('/home');
      }
      console.log('Signin payload:', payload);
      console.log('Signin token:', payload?.token);
      setPassword("");
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Signin failed";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setMessage("");
    setLoading(true);

    try {
      const payload = await googleSignIn();
      localStorage.setItem("token", payload.token);
      setMessage(payload.message || "Signed in with Google successfully");
      console.log('Google signin payload:', payload);
    } catch (err) {
      const errorMsg = err?.message || "Google sign-in failed";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: bgColor,
      }}
    >
      <div
        className="auth-card"
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          width: "90%",
          maxWidth: 420,
          padding: 24,
          border: `1px solid ${borderColor}`,
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: primaryColor,
          }}
        >
          wingoo
        </h1>
        <p style={{ color: "#666", marginBottom: 18 }}>
          Sign in to your account to continue
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6, color: "#333", fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16, position: "relative" }}>
            <label style={{ display: "block", marginBottom: 6, color: "#333", fontWeight: 500 }}>
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 10, top: 23, background: "transparent", border: "none", cursor: "pointer", padding: 6, fontSize: 20, zIndex: 2 }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="auth-actions" style={{ display: "flex", gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{ background: primaryColor, color: "white", flex: 1, padding: 10, borderRadius: 8, border: "none", cursor: loading ? "not-allowed" : "pointer", fontSize: 16, fontWeight: 600, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              style={{ background: "white", color: "#333", flex: 1, padding: 10, borderRadius: 8, border: `2px solid ${borderColor}`, cursor: "pointer", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <FcGoogle size={24} />
              <span>Sign in with Google</span>
            </button>
          </div>
        </form>

        <p style={{ marginTop: 12, textAlign: "right" }}>
          <a
            href="/forget-password"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/forget-password');
            }}
            style={{ color: primaryColor, fontWeight: 700, textDecoration: "none" }}
          >
            Forgot password?
          </a>
        </p>

        {message && (
          <p
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 6,
              color: message.includes("successful") ? "#157f1f" : "#d32f2f",
              backgroundColor:
                message.includes("successful") ? "#f1f8f4" : "#fce8e6",
            }}
          >
            {message}
          </p>
        )}

        <p style={{ marginTop: 16, textAlign: "center", color: "#555" }}>
          Create an account?{' '}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/signup');
            }}
            style={{ color: primaryColor, fontWeight: 700, textDecoration: "none" }}
          >
            Sign Up
          </a>
        </p>
      </div>
    </div>

  );
}

export default SignIn;