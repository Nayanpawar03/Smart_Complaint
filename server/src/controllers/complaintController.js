import axios from "axios";
import pool from "../config/db.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const createComplaint = async (req, res) => {
    try {
        const { description, duration, affected_count, image_url } = req.body;
        const user_id = req.user.id;

        if (!description || !duration || !affected_count) {
            return res.status(400).json({ message: "All fields required" });
        }

        //IMAGE UPLOAD (Cloudinary)
        let uploaded_image_url = image_url || null;

        console.log("USER:", req.user);
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        if (req.file) {
            const streamUpload = () =>
                new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: "image" },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });

            const result = await streamUpload();
            uploaded_image_url = result.secure_url;
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
            [user_id, description, department, duration, affected_count, cluster_id, cluster_count, urgency, uploaded_image_url]
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