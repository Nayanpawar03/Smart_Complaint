import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/login.css";
import { loginUser } from "../services/auth";

const Login = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginUser(form);

      if (res.message === "Login successful") {

        // 🔥 ROLE BASED REDIRECT
        if (res.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/student");
        }
        localStorage.setItem("user", JSON.stringify({
  role: res.role
}));

      } else {
        setError(res.message || "Login failed");
      }

    } catch (err) {
      setError("Server error");
    }

    setLoading(false);
  };

  return (
    <div className="login-container">

      <div className="login-card">
        <h2>Welcome Back</h2>

        <form onSubmit={handleSubmit}>

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="switch">
          New here?{" "}
          <span onClick={() => navigate("/register")}>
            Create account
          </span>
        </p>

      </div>

    </div>
  );
};

export default Login;