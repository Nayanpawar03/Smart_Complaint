import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../css/studentDashboard.css";
import { PlusCircle, FileText } from "lucide-react";

const StudentDashboard = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <div className="student-dashboard">

        <div className="dashboard-header">
          <h1>Welcome Back</h1>
          <p>Manage your complaints efficiently</p>
        </div>

        <div className="dashboard-actions">

          <div 
            className="action-card"
            onClick={() => navigate("/add-complaint")}
          >
            <PlusCircle size={40} />
            <h3>Add Complaint</h3>
            <p>Submit a new complaint</p>
          </div>

          <div 
            className="action-card"
            onClick={() => navigate("/my-complaints")}
          >
            <FileText size={40} />
            <h3>View Complaints</h3>
            <p>Track your complaints</p>
          </div>

        </div>

      </div>
    </>
  );
};

export default StudentDashboard;