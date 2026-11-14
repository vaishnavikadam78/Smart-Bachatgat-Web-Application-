import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ✅ FIXED: App.jsx passes role="admin" (string) but old code checked allowedRoles (array).
// Now supports BOTH: <ProtectedRoute role="admin"> and <ProtectedRoute allowedRoles={["admin"]}>
const ProtectedRoute = ({ children, role, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const allowed = allowedRoles ? allowedRoles : role ? [role] : null;

  if (allowed && !allowed.includes(user.role))
    return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;