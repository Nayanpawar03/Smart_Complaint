import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/addComplaint.css";
import Navbar from "../components/Navbar";
import { createComplaint } from "../services/complaint";

const AddComplaint = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    description: "",
    duration: "",
    affected_count: "",
    image_url: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 MAPPINGS
  const durationMap = {
    "Today": 0,
    "From last 2 or lesser days": 2,
    "From last week": 7,
    "From last month": 30,
    "More than a month": 60
  };

  const affectedMap = {
    "Only me": 1,
    "2-5": 3,
    "5-20": 10,
    "20+": 25
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 IMAGE → BASE64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        image_url: reader.result
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        description: form.description,
        duration: durationMap[form.duration],
        affected_count: affectedMap[form.affected_count],
        image_url: form.image_url || null
      };

      const res = await createComplaint(payload);

      if (res.message === "Complaint submitted") {
        setMessage("Complaint submitted successfully!");

        setForm({
          description: "",
          duration: "",
          affected_count: "",
          image_url: ""
        });

        setTimeout(() => navigate("/student"), 1200);
      } else {
        setMessage(res.message || "Error submitting complaint");
      }

    } catch (err) {
      setMessage("Server error");
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar />

      <div className="add-complaint-container">

        <div className="complaint-card">
          <h2>Submit Complaint</h2>

          <form onSubmit={handleSubmit}>

            {/* DESCRIPTION */}
            <label>Description</label>
            <textarea
              name="description"
              placeholder="Describe your issue..."
              value={form.description}
              onChange={handleChange}
              required
            />

            {/* DURATION */}
            <label>Duration of Issue</label>
            <select
              name="duration"
              value={form.duration}
              onChange={handleChange}
              required
            >
              <option value="">Select duration</option>
              <option>Today</option>
              <option>From last 2 or lesser days</option>
              <option>From last week</option>
              <option>From last month</option>
              <option>More than a month</option>
            </select>

            {/* AFFECTED */}
            <label>People Affected</label>
            <select
              name="affected_count"
              value={form.affected_count}
              onChange={handleChange}
              required
            >
              <option value="">Select range</option>
              <option>Only me</option>
              <option>2-5</option>
              <option>5-20</option>
              <option>20+</option>
            </select>

            {/* IMAGE */}
            <label>Upload Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />

            {message && <p className="message">{message}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Complaint"}
            </button>

          </form>
        </div>

      </div>
    </>
  );
};

export default AddComplaint;