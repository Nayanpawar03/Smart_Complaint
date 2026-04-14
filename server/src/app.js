import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Smart Complaint Backend Running 🚀");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});