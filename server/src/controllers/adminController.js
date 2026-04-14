import pool from "../config/db.js";

export const getAllComplaints = async (req, res) => {
    try {
        const result = await pool.query(`
            
            WITH latest_per_cluster AS (
                SELECT DISTINCT ON (cluster_id)
                    id,
                    cluster_id,
                    description,
                    department,
                    duration,
                    affected_count,
                    cluster_count,
                    urgency,
                    status,
                    created_at
                FROM complaints
                ORDER BY cluster_id, created_at DESC
            )

            SELECT 
                l.*,

                -- 🔥 collect all images per cluster
                ARRAY_AGG(c.image_url) FILTER (WHERE c.image_url IS NOT NULL) AS images

            FROM latest_per_cluster l
            JOIN complaints c ON l.cluster_id = c.cluster_id

            GROUP BY 
                l.id, l.cluster_id, l.description, l.department,
                l.duration, l.affected_count, l.cluster_count,
                l.urgency, l.status, l.created_at

            ORDER BY 
                CASE l.urgency
                    WHEN 'High' THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Low' THEN 3
                END,
                l.cluster_count DESC,
                l.created_at DESC

        `);

        res.json({ complaints: result.rows });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'seen', 'in_progress', 'resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        //Get cluster_id first
        const complaint = await pool.query(
            "SELECT cluster_id FROM complaints WHERE id = $1",
            [id]
        );

        if (complaint.rows.length === 0) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        const cluster_id = complaint.rows[0].cluster_id;

        //Update ALL in cluster
        await pool.query(
            `UPDATE complaints 
             SET status = $1, updated_at = NOW()
             WHERE cluster_id = $2`,
            [status, cluster_id]
        );

        res.json({ message: "Cluster status updated" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
