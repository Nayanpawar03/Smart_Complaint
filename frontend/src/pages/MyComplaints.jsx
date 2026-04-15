import React, { useEffect, useState } from "react";
import "../css/myComplaints.css";
import Navbar from "../components/Navbar";
import { getMyComplaints } from "../services/complaint";
import { getAllComplaints } from "../services/complaint";

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await getMyComplaints();
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

return (
  <>
    <Navbar />

    <div className="my-complaints-container">
      <h2>My Complaints</h2>

      {loading ? (
        <p>Loading...</p>
      ) : complaints.length === 0 ? (
        <p>No complaints found</p>
      ) : (
        <div className="complaints-grid">

          {complaints.map((c) => (
            <div className="complaint-card" key={c.id}>

              <p className="desc">{c.description}</p>

              <div className="row">
                <span>Department:</span> {c.department}
              </div>

              <div className="row">
                <span>Duration:</span> {c.duration} days
              </div>

              <div className="row">
                <span>Affected:</span> {c.affected_count}
              </div>

              
              
              <div className={`row urgency ${c.urgency.toLowerCase()}`}>
                <span>Urgency:</span> {c.urgency}
              </div>

              <div className="row status">
                <span>Status:</span> {c.status}
              </div>

              {c.image_url && (
                <button
                  className="view-image-btn"
                  onClick={() => setSelectedImage(c.image_url)}
                >
                  View Image
                </button>
              )}

            </div>
          ))}

        </div>
      )}

      {/* 🔥 IMAGE MODAL */}
      {selectedImage && (
        <div
          className="image-modal"
          onClick={() => setSelectedImage(null)}
        >
          {/* ❌ prevent closing when clicking image */}
          <img
            src={selectedImage}
            alt="preview"
            onClick={(e) => e.stopPropagation()}
          />

          {/* ✅ close button */}
          <span
            className="close-btn"
            onClick={() => setSelectedImage(null)}
          >
            ✖
          </span>
        </div>
      )}

    </div>
  </>
);
};

export default MyComplaints;