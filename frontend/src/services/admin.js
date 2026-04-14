export const getAllComplaints = async () => {
  const res = await fetch("/api/admin/complaints", {
    credentials: "include"
  });
  return res.json();
};

export const updateStatus = async (id, status) => {
  const res = await fetch(`/api/admin/complaints/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ status })
  });

  return res.json();
};