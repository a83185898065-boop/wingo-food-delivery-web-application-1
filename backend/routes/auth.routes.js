import express from "express";
import { signup, signin, signout, sendotp, verifyotp, resetPassword, googleAuth } from "../controllers/auth.controllers.js";
const authRouter = express.Router();
authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.post("/google", googleAuth);
authRouter.get("/signout", signout);

authRouter.post("/send-otp", sendotp);
authRouter.post("/verify-otp", verifyotp);
authRouter.post("/reset-otp", resetPassword);

// Placeholder GET for Google OAuth route so direct browser GETs don't show "Cannot GET"
authRouter.get("/google", (req, res) => {
	return res.status(501).json({
		message: "Google OAuth not configured on server. Implement OAuth flow or remove calls to /api/auth/google.",
	});
});

export default authRouter;  