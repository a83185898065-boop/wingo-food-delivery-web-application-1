
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

// Signup
authRouter.post("/signup", signup);

// Signin
authRouter.post("/signin", signin);

// Signout
authRouter.get("/signout", signout);

// Google Authentication
authRouter.post("/google", googleAuth);

authRouter.get("/google", (req, res) => {
    return res.status(501).json({
        message: "Google OAuth is not configured yet."
    });
});

// OTP Routes
authRouter.post("/send-otp", sendotp);
authRouter.post("/verify-otp", verifyotp);
authRouter.post("/reset-otp", resetPassword);

export default authRouter;
