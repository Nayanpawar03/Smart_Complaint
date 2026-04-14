// src/services/complaint.js

const API = "http://localhost:5000/api/complaints";

export const createComplaint = async (data) => {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include", 
    body: JSON.stringify(data)
  });

  return res.json();
};