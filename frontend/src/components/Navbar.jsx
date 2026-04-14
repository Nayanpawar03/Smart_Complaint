// src/components/Navbar.jsx
import React, { useState } from "react";
import "./navbar.css";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="navbar-main">

      <div className="nav-logo">
        Smart Complaint
      </div>

      <div className="nav-profile" onClick={() => setOpen(!open)}>
        👤

        {open && (
          <div className="dropdown">
            <p onClick={handleLogout}>Logout</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Navbar;