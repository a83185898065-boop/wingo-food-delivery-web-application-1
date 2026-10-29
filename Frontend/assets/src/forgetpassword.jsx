import React, { useState } from "react";
import axios from "axios";
import { IoArrowBack } from "react-icons/io5";
import { API_BASE_URL } from "./utils/apiBaseUrl.js";
import { navigateTo } from "./utils/router.js";
import "./authPages.css";

function ForgetPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [fallbackOtp, setFallbackOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result = await axios.post(
        `${API_BASE_URL}/api/auth/send-otp`,
        { email },
        { withCredentials: true }
      );
      setMessage(result.data?.message || "OTP sent. Check your email.");
      setFallbackOtp(result.data?.fallbackOtp || "");
      setStep(2);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result = await axios.post(
        `${API_BASE_URL}/api/auth/verify-otp`,
        { email, otp },
        { withCredentials: true }
      );
      setMessage(result.data?.message || "OTP verified.");
      setStep(3);
    } catch (error) {
      setMessage(error?.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const result = await axios.post(
        `${API_BASE_URL}/api/auth/reset-otp`,
        { email, newpassword: newPassword },
        { withCredentials: true }
      );
      setMessage(result.data?.message || "Password reset successfully.");
      navigateTo('/signin');
    } catch (error) {
      setMessage(error?.response?.data?.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#fff9f6" }}>
      <div className="auth-card" style={{ background: "white", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.08)", width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => { navigateTo('/signin'); }}
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
            aria-label="Back to sign in"
          >
            <IoArrowBack size={28} style={{ color: "#ff4d2d" }} />
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Forgot Password</h1>
        </div>

        {message && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: "#f9f5f2", color: "#333" }}>
            {message}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                style={{ width: "95%", border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", fontSize: 15 }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: "#ff4d2d", color: "white", border: "none", borderRadius: 12, padding: "12px 16px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            {fallbackOtp && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: "#eef6ff", color: "#0f3d91" }}>
                Use OTP: <strong>{fallbackOtp}</strong>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter the OTP"
                style={{ width: "90%", border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", fontSize: 15 }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: "95%", background: "#ff4d2d", color: "white", border: "none", borderRadius: 12, padding: "12px 16px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                style={{ width: "100%", border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", fontSize: 15 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                style={{ width: "100%", border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", fontSize: 15 }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: "#ff4d2d", color: "white", border: "none", borderRadius: 12, padding: "12px 16px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgetPassword;
