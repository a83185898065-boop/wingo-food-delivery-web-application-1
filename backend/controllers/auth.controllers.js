import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import gentoken from "../utils/gentoken.js";
import { sendotpMail } from "../utils/mail.js";

export const signup = async (req, res) => {
    try {
        const { fullName, email, password, mobile, role } = req.body;
        const city = typeof req.body.city === 'string' ? req.body.city.trim() : '';
        const state = typeof req.body.state === 'string' ? req.body.state.trim() : '';
        if (role === 'deliveryBoy' && (!city || !state || city.length > 80 || state.length > 80)) {
            return res.status(400).json({
                message: 'City and state (up to 80 characters each) are required for delivery partners.',
            });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }
        if (mobile.length < 10) {
            return res.status(400).json({ message: "Mobile number must be at least 10 digits long" });
        }
        const hashpassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            fullName,
            email,
            mobile,
            role,
            city,
            state,
            password: hashpassword,
        });

        const token = await gentoken(newUser._id);
        const cookieOptions = {
            secure: process.env.NODE_ENV === 'production',
            // Use 'lax' in development to make the cookie available to XHR from different ports on localhost.
            // For production across domains set SameSite='none' and secure=true.
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
        };

        res.cookie('token', token, cookieOptions);
        if(!token){
            return res.status(500).json({ message: "Token generation failed" });
        }
        return res.status(201).json({ message: "User created successfully", token });  

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ message: "sign up error" }); 
    }
}

export const signin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }
        const token = await gentoken(user._id);
        const cookieOptionsSignin = {
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
        };

        res.cookie('token', token, cookieOptionsSignin);
        if(!token){
            return res.status(500).json({ message: "Token generation failed" });
        }
        return res.status(200).json({ message: "User signed in successfully", token });

    } catch (error) {
        console.error('Signin error:', error);
        return res.status(500).json({ message: "Signin error" });
    }
}
export const signout = async (req, res) => {
    try {
        // Clear cookie using same attributes
        res.clearCookie('token', { path: '/', httpOnly: true });
        return res.status(200).json({ message: "User signed out successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Signout error" });
    }   
}
export const sendotp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.resetotp = otp;
        user.otpExpires = Date.now() + 5 * 60 * 1000;
        user.isotpverified = false;
        await user.save();

        const devMode = process.env.NODE_ENV !== 'production';
        if (devMode) {
            console.log(`[DEV OTP] ${email} -> ${otp}`);
        }

        try {
            await sendotpMail(email, otp);
            return res.status(200).json({
                message: "OTP sent successfully",
                ...(devMode ? { debugOtp: otp } : {}),
            });
        } catch (error) {
            console.error('Send OTP error:', error);
            const devMode = process.env.NODE_ENV !== 'production';
            if (devMode) {
                return res.status(200).json({
                    message: `OTP email failed: ${error.message}. Use code ${otp} instead.`,
                    fallbackOtp: otp,
                });
            }
            return res.status(500).json({ message: error?.message || "Send OTP error" });
        }
    } catch (error) {
        console.error('Send OTP error:', error);
        return res.status(500).json({ message: "Send OTP error" });
    }
}

export const verifyotp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.resetotp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.isotpverified = true;
        user.resetotp = undefined;
        user.otpExpires = undefined;
        await user.save();

        return res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({ message: "OTP verification error" });
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { email, newpassword } = req.body;
        const user = await User.findOne({ email });
        if (!user || !user.isotpverified) {
            return res.status(400).json({ message: "OTP verification required" });
        }

        const hashedPassword = await bcrypt.hash(newpassword, 10);
        user.password = hashedPassword;
        user.isotpverified = false;
        await user.save();

        return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ message: "Reset password error" });
    }
}