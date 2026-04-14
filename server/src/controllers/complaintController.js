import axios from "axios";
import pool from "../config/db.js";

export const createComplaint = async (req, res) => {
    try {
        const { description, duration, affected_count, image_url } = req.body;
        const user_id = req.user.id;

        if (!description || !duration || !affected_count) {
            return res.status(400).json({ message: "All fields required" });
        }

        // Call FastAPI ML service
        const mlResponse = await axios.post("http://localhost:8000/predict", {
            complaint_text: description,
            duration,
            affected_count
        });

        const { category, cluster_id, cluster_count, urgency } = mlResponse.data;

        // Update cluster_count for all existing complaints in same cluster
        await pool.query(
            "UPDATE complaints SET cluster_count = $1 WHERE cluster_id = $2",
            [cluster_count, cluster_id]
        );

        const DEPARTMENT_MAP = {
            "Technical": "Technical Issues",
            "Mess": "Mess/Food"
        };
        const department = DEPARTMENT_MAP[category] || category;


        // Insert new complaint
        const result = await pool.query(
            `INSERT INTO complaints 
            (user_id, description, department, duration, affected_count, cluster_id, cluster_count, urgency, image_url, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
            RETURNING *`,
            [user_id, description, category, duration, affected_count, cluster_id, cluster_count, urgency, image_url || null]
        );

        res.status(201).json({
            message: "Complaint submitted",
            complaint: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


export const getMyComplaints = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT * FROM complaints 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [user_id]
        );

        res.json({ complaints: result.rows });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
