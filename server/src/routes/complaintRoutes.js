import express from "express";
import { createComplaint } from "../controllers/complaintController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createComplaint);

export default router;
