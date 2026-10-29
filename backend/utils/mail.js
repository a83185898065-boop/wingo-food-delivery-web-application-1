import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

// Strip possible surrounding quotes from env values and normalize Gmail app password formatting
const SMTP_USER = process.env.EMAIL
  ? process.env.EMAIL.trim().replace(/^['"]|['"]$/g, '')
  : undefined;
const rawPass = process.env.PASS
  ? process.env.PASS.trim().replace(/^['"]|['"]$/g, '')
  : undefined;
const SMTP_PASS = rawPass && rawPass.includes(" ") && rawPass.replace(/\s+/g, '').length === 16
  ? rawPass.replace(/\s+/g, '')
  : rawPass;

let transporter = null;
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  // No SMTP credentials provided — in dev mode we'll skip real emails and log the OTP
  console.warn("SMTP credentials not found. Emails will not be sent — OTPs will be logged to the server console.");
}

export const sendotpMail = async (to, otp) => {
  const html = `<p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>`;

  if (!transporter) {
    console.log(`DEV EMAIL: to=${to} otp=${otp}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to,
      subject: "Reset Your Password",
      html,
    });
  } catch (error) {
    const message = error?.response?.code === 535 || error?.code === "EAUTH"
      ? "Gmail SMTP login failed. Use a valid Gmail app password and ensure EMAIL/PASS are correct."
      : error?.message || "OTP email send failed.";
    console.error("OTP email send failed:", error);
    throw new Error(message);
  }
};
