
import express from "express";

import {
    signup,
    signin,
    signout,
    sendotp,
    verifyotp,
    resetPassword,
    googleAuth
} from "../controllers/auth.controllers.js";

const authRouter = express.Router();

// User Signup
authRouter.post("/signup", signup);

// User Signin
authRouter.post("/signin", signin);

// User Signout
authRouter.get("/signout", signout);

// Firebase Google Authentication
authRouter.post("/google", googleAuth);

// Send OTP
authRouter.post("/send-otp", sendotp);

// Verify OTP
authRouter.post("/verify-otp", verifyotp);

// Reset Password
authRouter.post("/reset-otp", resetPassword);

export default authRouter;
