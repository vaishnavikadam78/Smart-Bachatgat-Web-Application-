import { useAuth } from "../../context/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const adminLinks = [
  { to: "/admin/dashboard",      icon: "▣", label: "Dashboard"      },
  { to: "/admin/manage-leaders", icon: "◈", label: "Manage Leaders" },
  { to: "/admin/manage-groups",  icon: "◉", label: "Manage Groups"  },
  { to: "/admin/schemes",        icon: "📋", label: "Scheme Apps"    },
  { to: "/admin/reports",        icon: "📊", label: "Reports"        },
  { to: "/admin/meetings",       icon: "📅", label: "Meetings"       },
  { to: "/admin/tools",          icon: "⚙️", label: "Admin Tools"    },
];

const leaderLinks = [
  { to: "/leader/dashboard",    icon: "▣", label: "Dashboard"    },
  { to: "/leader/members",      icon: "👥", label: "Members"      },
  { to: "/leader/loans",        icon: "🏦", label: "Loan Approvals" },
  { to: "/leader/transactions", icon: "💳", label: "Transactions" },
  { to: "/leader/meetings",     icon: "📅", label: "Meetings"    },
];

const memberLinks = [
  { to: "/member/dashboard",    icon: "▣",  label: "Dashboard"       },
  { to: "/member/my-savings",   icon: "💰", label: "My Savings"      },
  { to: "/member/my-loans",     icon: "🏦", label: "My Loans"        },
  { to: "/member/schemes",      icon: "📋", label: "Schemes"         },
  { to: "/member/scheme-apps",  icon: "✓", label: "My Applications" },
  { to: "/member/transactions", icon: "📈", label: "Transactions"    },
  { to: "/member/payment",      icon: "💳", label: "Payment"         },
  { to: "/member/my-reports",   icon: "📄", label: "My Reports"      },
];

const roleLinks = { admin: adminLinks, leader: leaderLinks, member: memberLinks };
const roleTag   = { admin: "Admin",    leader: "Leader",    member: "Member"   };

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = roleLinks[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">B</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">Bachatgat</span>
          <span className="sidebar-logo-tag">{roleTag[user?.role]}</span>
        </div>
      </div>

      <div className="sidebar-section-label">NAVIGATION</div>

      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <span className="link-icon">{l.icon}</span>
            <span className="link-label">{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-user">
          <div className="sidebar-footer-avatar">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="sidebar-footer-info">
            <span className="sidebar-footer-name">{user?.name || "User"}</span>
            <span className="sidebar-footer-role">{roleTag[user?.role]}</span>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          ⎋ Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;