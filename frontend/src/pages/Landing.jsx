import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Zap, BarChart3 } from "lucide-react";
import "../css/landing.css";

const Landing = () => {
  const navigate = useNavigate();
  const featureRef = useRef(null);

  const scrollToFeatures = () => {
    featureRef.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-container">

      {/* 🔹 NAVBAR */}
      <div className="navbar">
        <div className="logo">
          <img src="/logo.png" alt="logo" />
        </div>
        <div className="nav-buttons">
          <button className="login-btn" onClick={() => navigate("/login")}>
            Login
          </button>
          <button className="primary-btn" onClick={() => navigate("/register")}>
            Get Started
          </button>
        </div>
      </div>

      {/* 🔹 HERO */}
      <div className="hero">
        <div className="hero-left">
          <h1>AI-Powered Complaint Management</h1>
          <p>
            Automatically classify, cluster and prioritize complaints using intelligent machine learning models.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => navigate("/register")}>
              Get Started
            </button>
            <button className="outline-btn" onClick={scrollToFeatures}>
              View Features
            </button>
          </div>
        </div>

        <div className="hero-right">
          <img src="/cover.png" alt="cover" />
        </div>
      </div>

      {/* 🔹 FEATURES */}
      <div className="features" ref={featureRef}>
        <h2>Powerful Features</h2>

        <div className="feature-grid">

          <div className="feature-card">
            <ShieldCheck size={40} />
            <h3>Smart Classification</h3>
            <p>Automatically categorizes complaints using AI models.</p>
          </div>

          <div className="feature-card">
            <Zap size={40} />
            <h3>Real-Time Clustering</h3>
            <p>Groups similar complaints to detect major issues quickly.</p>
          </div>

          <div className="feature-card">
            <BarChart3 size={40} />
            <h3>Priority Prediction</h3>
            <p>Predicts urgency based on multiple real-world factors.</p>
          </div>

        </div>
      </div>

      {/* 🔹 FOOTER */}
      <div className="footer">
        © 2026 Smart Complaint System. All rights reserved.
      </div>

    </div>
  );
};

export default Landing;