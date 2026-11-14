import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import Layout from "./components/Layout/Layout";

import LandingPage    from "./pages/Landing/LandingPage";
import Login          from "./pages/Login/login";
import RegisterSelect from "./pages/Register/RegisterSelect";
import Register       from "./pages/Register/Register";
import LeaderRegister from "./pages/Register/LeaderRegister";
import PasswordReset  from "./pages/PasswordReset/PasswordReset";
import EmailVerification from "./pages/EmailVerification/EmailVerification";

import AdminDashboard from "./pages/admin/Dashboard/Dashboard";
import ManageLeaders  from "./pages/admin/ManageLeaders/ManageLeaders";
import ManageGroups   from "./pages/admin/ManageGroups/ManageGroups";
import AdminReports   from "./pages/admin/Reports/AdminReports";
import AdminMeetings  from "./pages/admin/Meetings/AdminMeetings";
import AdminSchemes   from "./pages/admin/Schemes/AdminSchemes";
import AdminTools     from "./pages/admin/Tools/AdminTools";

import LeaderDashboard from "./pages/leader/Dashboard/LeaderDashboard";
import Members         from "./pages/leader/Members/Members";
import LeaderLoans     from "./pages/leader/Loans/LeaderLoans";
import Transactions    from "./pages/leader/Transactions/Transactions";
import Meetings        from "./pages/leader/Meetings/Meetings";

import MemberDashboard from "./pages/member/Dashboard/MemberDashboard";
import MySavings       from "./pages/member/MySavings/MySavings";
import MyLoans         from "./pages/member/MyLoans/MyLoans";
import MyReports       from "./pages/member/Myreports/MyReports";
import Schemes         from "./pages/member/Schemes/Schemes";
import MySchemeApplications from "./pages/member/Schemes/MySchemeApplications";
import TransactionHistory  from "./pages/member/TransactionHistory/TransactionHistory";
import Payment         from "./pages/member/Payment/Payment";

function App() {
  return (
    <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/"                  element={<LandingPage />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/register"          element={<RegisterSelect />} />
            <Route path="/register/member"   element={<Register />} />
            <Route path="/register/leader"   element={<LeaderRegister />} />
            <Route path="/password-reset"    element={<PasswordReset />} />
            <Route path="/verify-email"      element={<EmailVerification />} />

          {/* Admin */}
          <Route path="/admin/dashboard"      element={<ProtectedRoute role="admin"><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
          <Route path="/admin/manage-leaders" element={<ProtectedRoute role="admin"><Layout><ManageLeaders /></Layout></ProtectedRoute>} />
          <Route path="/admin/manage-groups"  element={<ProtectedRoute role="admin"><Layout><ManageGroups /></Layout></ProtectedRoute>} />
          <Route path="/admin/reports"        element={<ProtectedRoute role="admin"><Layout><AdminReports /></Layout></ProtectedRoute>} />
          <Route path="/admin/meetings"       element={<ProtectedRoute role="admin"><Layout><AdminMeetings /></Layout></ProtectedRoute>} />
          <Route path="/admin/schemes"        element={<ProtectedRoute role="admin"><Layout><AdminSchemes /></Layout></ProtectedRoute>} />
          <Route path="/admin/tools"          element={<ProtectedRoute role="admin"><Layout><AdminTools /></Layout></ProtectedRoute>} />

          {/* Leader */}
          <Route path="/leader/dashboard"    element={<ProtectedRoute role="leader"><Layout><LeaderDashboard /></Layout></ProtectedRoute>} />
          <Route path="/leader/members"      element={<ProtectedRoute role="leader"><Layout><Members /></Layout></ProtectedRoute>} />
          <Route path="/leader/loans"        element={<ProtectedRoute role="leader"><Layout><LeaderLoans /></Layout></ProtectedRoute>} />
          <Route path="/leader/transactions" element={<ProtectedRoute role="leader"><Layout><Transactions /></Layout></ProtectedRoute>} />
          <Route path="/leader/meetings"     element={<ProtectedRoute role="leader"><Layout><Meetings /></Layout></ProtectedRoute>} />

          {/* Member */}
          <Route path="/member/dashboard"      element={<ProtectedRoute role="member"><Layout><MemberDashboard /></Layout></ProtectedRoute>} />
          <Route path="/member/my-savings"     element={<ProtectedRoute role="member"><Layout><MySavings /></Layout></ProtectedRoute>} />
          <Route path="/member/my-loans"       element={<ProtectedRoute role="member"><Layout><MyLoans /></Layout></ProtectedRoute>} />
          <Route path="/member/my-reports"     element={<ProtectedRoute role="member"><Layout><MyReports /></Layout></ProtectedRoute>} />
          <Route path="/member/transactions"   element={<ProtectedRoute role="member"><Layout><TransactionHistory /></Layout></ProtectedRoute>} />
          <Route path="/member/schemes"        element={<ProtectedRoute role="member"><Layout><Schemes /></Layout></ProtectedRoute>} />
          <Route path="/member/scheme-apps"    element={<ProtectedRoute role="member"><Layout><MySchemeApplications /></Layout></ProtectedRoute>} />
          <Route path="/member/payment"        element={<ProtectedRoute role="member"><Layout><Payment /></Layout></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;