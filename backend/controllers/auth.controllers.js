import { getAuth } from "firebase-admin/auth";
import firebaseApp from "../config/firebaseAdmin.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import gentoken from "../utils/gentoken.js";
import { sendotpMail } from "../utils/mail.js";

// ================= SIGNUP =================

export const signup = async (req, res) => {
    try {
        const { fullName, email, password, mobile, role } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        const city = typeof req.body.city === "string"
            ? req.body.city.trim()
            : "";

        const state = typeof req.body.state === "string"
            ? req.body.state.trim()
            : "";

        if (!fullName || !normalizedEmail || !password || !mobile) {
            return res.status(400).json({
                message: "All required fields must be provided"
            });
        }

        if (
            role === "deliveryBoy" &&
            (!city || !state || city.length > 80 || state.length > 80)
        ) {
            return res.status(400).json({
                message: "City and state are required for delivery partners"
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        if (mobile.length < 10) {
            return res.status(400).json({
                message: "Mobile number must be at least 10 digits long"
            });
        }

        const hashpassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            fullName,
            email: normalizedEmail,
            mobile,
            role,
            city,
            state,
            password: hashpassword
        });

        const token = await gentoken(newUser._id);

        if (!token) {
            return res.status(500).json({
                message: "Token generation failed"
            });
        }

        const cookieOptions = {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        };

        res.cookie("token", token, cookieOptions);

        return res.status(201).json({
            message: "User created successfully",
            token
        });

    } catch (error) {
        console.error("Signup error:", error);

        return res.status(500).json({
            message: "Sign up error"
        });
    }
};


// ================= SIGNIN =================

export const signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message: "Please sign in using Google"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid password"
            });
        }

        const token = await gentoken(user._id);

        if (!token) {
            return res.status(500).json({
                message: "Token generation failed"
            });
        }

        const cookieOptions = {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        };

        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            message: "User signed in successfully",
            token
        });

    } catch (error) {
        console.error("Signin error:", error);

        return res.status(500).json({
            message: "Signin error"
        });
    }
};


// ================= SIGNOUT =================

export const signout = async (req, res) => {
    try {
        res.clearCookie("token", {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });

        return res.status(200).json({
            message: "User signed out successfully"
        });

    } catch (error) {
        console.error("Signout error:", error);

        return res.status(500).json({
            message: "Signout error"
        });
    }
};


// ================= SEND OTP =================

export const sendotp = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        user.resetotp = otp;
        user.otpExpires = Date.now() + 5 * 60 * 1000;
        user.isotpverified = false;

        await user.save();

        const devMode = process.env.NODE_ENV !== "production";

        if (devMode) {
            console.log(`[DEV OTP] ${normalizedEmail} -> ${otp}`);
        }

        try {
            await sendotpMail(normalizedEmail, otp);

            return res.status(200).json({
                message: "OTP sent successfully",
                ...(devMode ? { debugOtp: otp } : {})
            });

        } catch (error) {
            console.error("Send OTP email error:", error);

            if (devMode) {
                return res.status(200).json({
                    message: "OTP email failed. Use the fallback OTP.",
                    fallbackOtp: otp
                });
            }

            return res.status(500).json({
                message: "Send OTP error"
            });
        }

    } catch (error) {
        console.error("Send OTP error:", error);

        return res.status(500).json({
            message: "Send OTP error"
        });
    }
};


// ================= VERIFY OTP =================

export const verifyotp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (
            !user ||
            user.resetotp !== otp ||
            !user.otpExpires ||
            user.otpExpires < Date.now()
        ) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        user.isotpverified = true;
        user.resetotp = undefined;
        user.otpExpires = undefined;

        await user.save();

        return res.status(200).json({
            message: "OTP verified successfully"
        });

    } catch (error) {
        console.error("Verify OTP error:", error);

        return res.status(500).json({
            message: "OTP verification error"
        });
    }
};


// ================= RESET PASSWORD =================

export const resetPassword = async (req, res) => {
    try {
        const { email, newpassword } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user || !user.isotpverified) {
            return res.status(400).json({
                message: "OTP verification required"
            });
        }

        if (!newpassword || newpassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        const hashedPassword = await bcrypt.hash(newpassword, 10);

        user.password = hashedPassword;
        user.isotpverified = false;
        user.resetotp = undefined;
        user.otpExpires = undefined;

        await user.save();

        return res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Reset password error"
        });
    }
};


// ================= GOOGLE AUTH =================

export const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken || typeof idToken !== "string") {
            return res.status(400).json({
                message: "Google ID token is required"
            });
        }

        // Verify Firebase ID token
        const decodedToken = await getAuth(firebaseApp).verifyIdToken(idToken);

        const {
            uid,
            email,
            name,
            email_verified
        } = decodedToken;

        if (!uid || !email || !email_verified) {
            return res.status(401).json({
                message: "Google email verification failed"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find account by Firebase UID or email
        let user = await User.findOne({
            $or: [
                { firebaseUid: uid },
                { email: normalizedEmail }
            ]
        });

        if (user) {

            // Prevent linking a different Firebase account
            if (user.firebaseUid && user.firebaseUid !== uid) {
                return res.status(409).json({
                    message: "This email is linked to another Google account"
                });
            }

            // Link Firebase UID to existing account
            if (!user.firebaseUid) {
                user.firebaseUid = uid;
                await user.save();
            }

        } else {

            // Create new Google registered user
            user = await User.create({
                fullName: name || normalizedEmail.split("@")[0],
                email: normalizedEmail,
                firebaseUid: uid,
                role: "user"
            });

        }

        // Generate Wingoo JWT
        const token = await gentoken(user._id);

        if (!token) {
            return res.status(500).json({
                message: "Token generation failed"
            });
        }

        const cookieOptions = {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true
        };

        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            message: "Google authentication successful",
            token,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile || "",
                role: user.role
            }
        });

    } catch (error) {
        console.error("Google authentication error:", error);

        return res.status(401).json({
            message: "Google authentication failed"
        });
    }
};
