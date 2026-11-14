import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../../services/api";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type":"application/json","Authorization":`Bearer ${getToken()}` });

const ONLINE_MODES = ["UPI", "Net Banking", "Debit Card", "Credit Card"];
const DEMO_UPI = "bachatgat@sbi";
const DEMO_ACCOUNT = { acc:"1234567890123", ifsc:"SBIN0001234", name:"Smart Bachatgat Group" };

export default function Payment() {
  const [step,      setStep]    = useState(1); // 1=select, 2=details, 3=processing, 4=success
  const [type,      setType]    = useState("Online");
  const [mode,      setMode]    = useState("UPI");
  const [amount,    setAmount]  = useState("");
  const [purpose,   setPurpose] = useState("Monthly Savings");
  const [receipt,   setReceipt] = useState(null);
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState("");
  const nav = useNavigate();

  const handlePay = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) { setError("Enter valid amount"); return; }
    setLoading(true);
    setError("");
    if (type === "Online") { setStep(3); await new Promise(r=>setTimeout(r,2500)); }
    try {
      const res = await fetch(`${API}/payments/initiate`, {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({ amount:parseFloat(amount), payment_type:type, payment_mode:mode, purpose })
      });
      const d = await res.json();
      if (res.ok) { setReceipt(d); setStep(4); }
      else setError(d.detail || "Payment failed");
    } catch { setError("Cannot connect to server"); }
    finally { setLoading(false); }
  };

  if (step === 4 && receipt) return (
    <div className="page-container">
      <div style={{maxWidth:480,margin:"0 auto",textAlign:"center"}}>
        <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:20,padding:40,boxShadow:"0 4px 24px rgba(0,0,0,.08)"}}>
          <div style={{width:72,height:72,background:"#dcfce7",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px"}}>
            {receipt.status==="Success"?"✓":"⏳"}
          </div>
          <h2 style={{color:receipt.status==="Success"?"#10b981":"#f59e0b",marginBottom:8}}>
            {receipt.status==="Success"?"Payment Successful!":"Payment Recorded"}
          </h2>
          <p style={{color:"#64748b",marginBottom:24,fontSize:14}}>
            {receipt.status==="Success"?"Your payment has been processed successfully.":"Your offline payment has been recorded and is awaiting verification."}
          </p>

          <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:20,textAlign:"left",marginBottom:24}}>
            {[
              ["Transaction ID", receipt.transaction_id],
              ["Amount",         `₹${receipt.amount}`],
              ["Payment Type",   receipt.payment_type],
              ["Mode",           receipt.payment_mode||"—"],
              ["Purpose",        receipt.purpose],
              ["Date",           receipt.timestamp],
              ["Status",         receipt.status],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f1f5f9",fontSize:13}}>
                <span style={{color:"#64748b"}}>{k}</span>
                <strong style={{color:k==="Status"?(receipt.status==="Success"?"#10b981":"#f59e0b"):"#0f172a"}}>{v}</strong>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setStep(1);setAmount("");setReceipt(null);}} style={{flex:1,padding:"10px",border:"1.5px solid #e2e8f0",borderRadius:10,background:"white",cursor:"pointer",fontWeight:600}}>New Payment</button>
            <button onClick={()=>nav("/member/dashboard")} style={{flex:1,padding:"10px",border:"none",borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"white",cursor:"pointer",fontWeight:700}}>Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (step === 3) return (
    <div className="page-container">
      <div style={{maxWidth:400,margin:"60px auto",textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:"50%",border:"4px solid #e2e8f0",borderTopColor:"#3b82f6",animation:"spin 1s linear infinite",margin:"0 auto 24px"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <h3 style={{color:"#0f172a"}}>Processing Payment…</h3>
        <p style={{color:"#64748b"}}>Please wait, connecting to payment gateway</p>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{marginBottom:24}}>
        <div>
          <h2>💳 Make Payment</h2>
          <p>Online & Offline payment options</p>
        </div>
      </div>

      <div style={{maxWidth:520,margin:"0 auto"}}>
        <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:16,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>

          {/* Payment Type Toggle */}
          <div style={{display:"flex",borderBottom:"1.5px solid #e2e8f0"}}>
            {["Online","Offline"].map(t=>(
              <button key={t} onClick={()=>{setType(t);setStep(1);setError("");}} style={{
                flex:1,padding:"16px",border:"none",cursor:"pointer",fontWeight:700,fontSize:15,
                background:type===t?"#3b82f6":"white",color:type===t?"white":"#64748b",
                transition:"all .2s"
              }}>{t==="Online"?"💻 Online Payment":"🏦 Offline Payment"}</button>
            ))}
          </div>

          <div style={{padding:28}}>
            {/* Amount */}
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontWeight:700,fontSize:13,marginBottom:8,color:"#374151"}}>Amount (₹) *</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontWeight:700,color:"#64748b",fontSize:16}}>₹</span>
                <input type="number" min="1" placeholder="Enter amount" value={amount}
                  onChange={e=>{setAmount(e.target.value);setError("");}}
                  style={{width:"100%",padding:"12px 12px 12px 32px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:16,fontWeight:700,outline:"none",boxSizing:"border-box"}} />
              </div>
            </div>

            {/* Purpose */}
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontWeight:700,fontSize:13,marginBottom:8,color:"#374151"}}>Purpose</label>
              <select value={purpose} onChange={e=>setPurpose(e.target.value)}
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none"}}>
                {["Monthly Savings","Loan Repayment","Insurance Premium","Other"].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>

            {type === "Online" ? (
              <>
                <div style={{marginBottom:20}}>
                  <label style={{display:"block",fontWeight:700,fontSize:13,marginBottom:8,color:"#374151"}}>Payment Mode</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {ONLINE_MODES.map(m=>(
                      <button key={m} onClick={()=>setMode(m)} style={{
                        padding:"10px",border:`1.5px solid ${mode===m?"#3b82f6":"#e2e8f0"}`,borderRadius:10,
                        background:mode===m?"#eff6ff":"white",color:mode===m?"#3b82f6":"#64748b",
                        cursor:"pointer",fontWeight:600,fontSize:13
                      }}>{m}</button>
                    ))}
                  </div>
                </div>
                {mode === "UPI" && (
                  <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:14,marginBottom:20,fontSize:13}}>
                    <div style={{fontWeight:700,color:"#166534",marginBottom:4}}>Demo UPI ID</div>
                    <div style={{fontFamily:"monospace",fontSize:15,color:"#15803d",fontWeight:700}}>{DEMO_UPI}</div>
                  </div>
                )}
                {(mode==="Net Banking"||mode==="Debit Card"||mode==="Credit Card") && (
                  <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:14,marginBottom:20,fontSize:13}}>
                    <div style={{fontWeight:700,color:"#1e40af",marginBottom:8}}>Demo Bank Details</div>
                    {[["Account No",DEMO_ACCOUNT.acc],["IFSC",DEMO_ACCOUNT.ifsc],["Name",DEMO_ACCOUNT.name]].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:"#64748b"}}>{k}:</span><strong style={{color:"#1e40af"}}>{v}</strong></div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:10,padding:14,marginBottom:20,fontSize:13}}>
                <div style={{fontWeight:700,color:"#92400e",marginBottom:8}}>📍 Offline Payment Instructions</div>
                <p style={{color:"#78350f",lineHeight:1.6,margin:0}}>
                  1. Visit your Group Leader with cash payment<br/>
                  2. Record this payment request below<br/>
                  3. Leader will verify and approve in the system<br/>
                  4. Your account will be updated automatically
                </p>
              </div>
            )}

            {error && <div style={{background:"#fee2e2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginBottom:16,color:"#dc2626",fontSize:13,fontWeight:600}}>⚠️ {error}</div>}

            <button onClick={handlePay} disabled={loading} style={{
              width:"100%",padding:"14px",border:"none",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:16,
              background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"white",
              boxShadow:"0 4px 12px rgba(59,130,246,.4)",transition:"opacity .2s",opacity: loading ? 0.7 : 1
            }}>
              {loading ? "Processing…" : type==="Online" ? `Pay ₹${amount||"0"}` : "Record Offline Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}