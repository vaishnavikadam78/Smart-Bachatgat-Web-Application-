import "./MyLoans.css";
 
const loans = [
  {
    loan_id: "L001",
    amount: 5000,
    disbursed: "2025-08-01",
    due: "2026-02-01",
    paid: 1800,
    balance: 3200,
    status: "Active",
  },
];
 
export default function MyLoans() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Loans</h1>
          <p className="page-sub">Your loan history and repayment status</p>
        </div>
      </div>
 
      {loans.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 48 }}>🎉</p>
          <h3>No Active Loans</h3>
          <p>You have no loans. Keep saving!</p>
        </div>
      ) : (
        loans.map(loan => (
          <div key={loan.loan_id} className="loan-card">
            <div className="loan-header">
              <div>
                <h2>Loan #{loan.loan_id}</h2>
                <p>Disbursed: {loan.disbursed} &nbsp;|&nbsp; Due: {loan.due}</p>
              </div>
              <span className={`badge ${loan.status.toLowerCase()}`}>{loan.status}</span>
            </div>
 
            <div className="loan-stats">
              <div className="loan-stat">
                <p>Loan Amount</p>
                <h3>₹{loan.amount.toLocaleString()}</h3>
              </div>
              <div className="loan-stat">
                <p>Amount Paid</p>
                <h3 style={{ color: "var(--success)" }}>₹{loan.paid.toLocaleString()}</h3>
              </div>
              <div className="loan-stat">
                <p>Balance</p>
                <h3 style={{ color: "var(--danger)" }}>₹{loan.balance.toLocaleString()}</h3>
              </div>
            </div>
 
            <div className="progress-bar-wrap">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "var(--text-gray)" }}>
                <span>Repayment Progress</span>
                <span>{Math.round((loan.paid / loan.amount) * 100)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(loan.paid / loan.amount) * 100}%` }} />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
 