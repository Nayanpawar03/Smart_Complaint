import React, { useEffect, useState } from "react";
import "../css/adminDashboard.css";
import Navbar from "../components/Navbar";
import { getAllComplaints, updateStatus } from "../services/admin";

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    const res = await getAllComplaints();
    setComplaints(res.complaints || []);
  };

const handleCardClick = async (c) => {
  let updated = c;

  if (c.status === "pending") {
    await updateStatus(c.id, "seen");
    updated = { ...c, status: "seen" };
  }

  setSelected(updated);
  fetchComplaints();
};

const handleStatusChange = async (status) => {
  await updateStatus(selected.id, status);

  setSelected((prev) => ({
    ...prev,
    status
  }));

  fetchComplaints();
};

  const handleResolve = async () => {
    await updateStatus(selected.id, "resolved");
    setSelected(null);
    fetchComplaints();
  };

  const getUrgencyClass = (urgency) => {
    if (urgency === "High") return "high";
    if (urgency === "Medium") return "medium";
    return "low";
  };

  return (
    <>
      <Navbar />

      <div className="admin-container">
        <h2>Admin Dashboard</h2>

        <div className="grid">
          {complaints.map((c) => (
            <div
              key={c.cluster_id}
              className="card"
              onClick={() => handleCardClick(c)}
            >
              <p className="title">{c.description}</p>

              <div className="meta">
                👥 {c.cluster_count} affected
              </div>

              <div className={`urgency ${getUrgencyClass(c.urgency)}`}>
                {c.urgency}
              </div>

              <div className="status">{c.status}</div>
            </div>
          ))}
        </div>

        {/* 🔥 MODAL */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              
              <h3>{selected.description}</h3>

              <p>👥 {selected.cluster_count} people affected</p>
              <p>⚡ {selected.urgency}</p>
              <p>Status: {selected.status}</p>

              {/* IMAGES */}
              <div className="image-grid">
                {selected.images?.map((img, i) => (
                  <img key={i} src={img} alt="complaint" />
                ))}
              </div>

              <div className="button-group">

  {selected.status !== "in_progress" && selected.status !== "resolved" && (
    <button
      className="progress-btn"
      onClick={() => handleStatusChange("in_progress")}
    >
      Mark In Progress
    </button>
  )}

  {selected.status !== "resolved" && (
    <button
      className="resolve-btn"
      onClick={() => handleStatusChange("resolved")}
    >
      Resolve
    </button>
  )}

</div>

            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;