import "./MySavings.css";
 
const savings = [
  { month: "Aug 2025", amount: 500, status: "Paid" },
  { month: "Sep 2025", amount: 500, status: "Paid" },
  { month: "Oct 2025", amount: 500, status: "Paid" },
  { month: "Nov 2025", amount: 500, status: "Paid" },
  { month: "Dec 2025", amount: 500, status: "Paid" },
  { month: "Jan 2026", amount: 500, status: "Paid" },
  { month: "Feb 2026", amount: 500, status: "Paid" },
  { month: "Mar 2026", amount: 500, status: "Pending" },
];
 
export default function MySavings() {
  const total = savings.filter(s => s.status === "Paid").reduce((a, b) => a + b.amount, 0);
 
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Savings</h1>
          <p className="page-sub">Monthly savings contribution history</p>
        </div>
        <div className="total-badge">Total: ₹{total.toLocaleString()}</div>
      </div>
 
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Month</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {savings.map((s, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{s.month}</td>
                <td>₹{s.amount}</td>
                <td>
                  <span className={`badge ${s.status === "Paid" ? "active" : "pending"}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
 