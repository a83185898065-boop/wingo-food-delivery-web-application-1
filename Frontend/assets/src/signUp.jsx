import React, { useState } from "react";
import { signup, googleSignIn } from "./authService.js";
import { FcGoogle } from "react-icons/fc";
import { navigateTo } from "./utils/router.js";
import "./authPages.css";

function SignUp() {
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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const handleGoogleAuth = async () => {

    setMessage("");
    setLoading(true);

    try {
      const payload = await googleSignIn();
      localStorage.setItem('token', payload.token);
      setMessage(payload.message || "Signed in with Google successfully");
      if (payload?.token) {
        localStorage.setItem('token', payload.token);
        window.dispatchEvent(new Event('authChange'));
        navigateTo('/home');
      }
      console.log('Google signup payload:', payload);
    } catch (err) {
      const errorMsg = err?.message || "Google sign-in failed";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission
    setMessage("");
    setLoading(true);

    // Collect user-entered data in a single object for logging and API use
    const formData = {
      fullName,
      email,
      mobile,
      password,
      role,
      ...(role === "deliveryBoy" ? { city, state } : {}),
    };

    // Log the raw form data object if it is stored as one
    console.log('formData object:', formData);

    // Log the structured registration payload before the API call
    console.log('========================');
    console.log('User Registration Data');
    console.log('========================');
    console.log(`Full Name: ${formData.fullName}`);
    console.log(`Email: ${formData.email}`);
    console.log(`Mobile: ${formData.mobile}`);
    console.log(`Password: ${'*'.repeat(formData.password.length)}`);
    console.log(`Role: ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}`);

    try {
      const result = await signup(formData, true);
      const payload = result?.data ?? result;
      setMessage(payload.message || "Signup successful! You can now sign in.");
      if (payload?.token) {
        localStorage.setItem('token', payload.token);
        window.dispatchEvent(new Event('authChange'));
        navigateTo('/home');
      }
      // Show token and response payload in browser console for debugging
      console.log('Signup payload:', payload);
      console.log('Signup token:', payload?.token);
      // Reset form
      setFullName("");
      setEmail("");
      setMobile("");
      setPassword("");
      setCity("");
      setState("");
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || "Signup failed";
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
          Create your account to get started with delicious food delivery
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                color: "#333",
                fontWeight: 500,
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your fullname"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                color: "#333",
                fontWeight: 500,
              }}
            >
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

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                color: "#333",
                fontWeight: 500,
              }}
            >
              Mobile Number
            </label>
            <input
              type="tel"
              name="mobile"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter your mobile number"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16, position: "relative" }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                color: "#333",
                fontWeight: 500,
              }}
            >
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
              style={{
                position: "absolute",
                right: 10,
                top: 23,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                fontSize: 20,
                zIndex: 2,
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                color: "#333",
                fontWeight: 500,
              }}
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setCity("");
                setState("");
              }}
              style={inputStyle}
            >
              <option key="user" value="user">User</option>
              <option key="deliveryBoy" value="deliveryBoy">Delivery Boy</option>
              <option key="owner" value="owner">Owner</option>
            </select>
          </div>

          {role === "deliveryBoy" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    color: "#333",
                    fontWeight: 500,
                  }}
                >
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  maxLength={80}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter your delivery city"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    color: "#333",
                    fontWeight: 500,
                  }}
                >
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  maxLength={80}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Enter your state"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <div className="auth-actions" style={{ display: "flex", gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: primaryColor,
                color: "white",
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            <button
              type="button"
              onClick={handleGoogleAuth}
              style={{
                background: "white",
                color: "#333",
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: `2px solid ${borderColor}`,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <FcGoogle size={24} />
              <span>Google</span>
            </button>
          </div>
        </form>

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
          Already have an account?{' '}
          <a
            href="/signin"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/signin');
            }}
            style={{ color: primaryColor, fontWeight: 700, textDecoration: "none" }}
          >
            Sign In
          </a>
        </p>
      </div>
    </div>

  );
}

export default SignUp;