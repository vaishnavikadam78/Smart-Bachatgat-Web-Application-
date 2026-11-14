import { useState } from "react";
import "./Members.css";

const initialMembers = [
  { id: 1, name: "Sunita Kadam",   phone: "9876543210", savings: "₹4,500",  joinDate: "2024-01-10", status: "Active" },
  { id: 2, name: "Rekha Shinde",   phone: "9876543211", savings: "₹3,200",  joinDate: "2024-02-15", status: "Active" },
  { id: 3, name: "Meena Patil",    phone: "9876543212", savings: "₹5,100",  joinDate: "2024-01-20", status: "Active" },
  { id: 4, name: "Anita Jadhav",   phone: "9876543213", savings: "₹1,800",  joinDate: "2024-03-05", status: "Inactive" },
];

const Members = () => {
  const [members, setMembers]   = useState(initialMembers);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: "", phone: "" });

  const handleAdd = (e) => {
    e.preventDefault();
    const newMember = { id: Date.now(), ...form, savings: "₹0", joinDate: new Date().toISOString().split("T")[0], status: "Active" };
    setMembers([...members, newMember]);
    setForm({ name: "", phone: "" });
    setShowForm(false);
  };

  const handleDelete = (id) => setMembers(members.filter((m) => m.id !== id));

  return (
    <div className="members-page">
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2>Members</h2>
          <p>Manage members of your Bachatgat group</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Member"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, color: "var(--primary)" }}>Add New Member</h3>
          <form onSubmit={handleAdd} className="member-form">
            <div className="form-group">
              <label>Full Name</label>
              <input placeholder="Member name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input placeholder="Phone number" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary">Add Member</button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Name</th><th>Phone</th><th>Total Savings</th><th>Join Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id}>
                <td>{i + 1}</td>
                <td>{m.name}</td>
                <td>{m.phone}</td>
                <td>{m.savings}</td>
                <td>{m.joinDate}</td>
                <td><span className={`badge ${m.status === "Active" ? "badge-success" : "badge-danger"}`}>{m.status}</span></td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Members;