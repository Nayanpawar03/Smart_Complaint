import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// SIGNUP
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        if (!email.endsWith("@vit.edu.in")) {
            return res.status(400).json({ message: "Only VIT Email-id is allowed" });
        }

        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, role",
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "User created",
            user: newUser.rows[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// LOGIN
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password_hash
        );

        if (!validPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // true in production
            sameSite: "lax"
        });

        res.json({
            message: "Login successful"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// LOGOUT
export const logout = (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
};