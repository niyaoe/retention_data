import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { user, isAdmin } = useAuth();

  const menuItems = [
    { title: "Dashboard", path: "/dashboard", icon: "bi-grid" },
    { title: "Sales Data", path: "/sales-data", icon: "bi-cart3" },
    { title: "Service Data", path: "/service-data", icon: "bi-tools" },
    { title: "DMS Retail", path: "/dms-retail", icon: "bi-receipt" },
    { title: "Master Data", path: "/master-data", icon: "bi-database" },
    {
      title: "Manual Import",
      path: "/manual-import",
      icon: "bi-cloud-arrow-up",
    },
    {
      title: "Import History",
      path: "/import-history",
      icon: "bi-clock-history",
    },
    {
      title: "Vehicle Models",
      path: "/vehicle-models",
      icon: "bi-car-front",
    },
  ];

  const adminItems = [
    { title: "Managers", path: "/managers", icon: "bi-people" },
    {
      title: "Branch Management",
      path: "/branch-management",
      icon: "bi-diagram-3",
    },
  ];

  const renderLink = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) =>
        `ret-sidebar-link ${isActive ? "active" : ""}`
      }
      onClick={closeSidebar}
    >
      <i className={`bi ${item.icon}`}></i>
      <span>{item.title}</span>
    </NavLink>
  );

  return (
    <>
      <div
        className={`ret-sidebar-overlay ${isOpen ? "show" : ""}`}
        onClick={closeSidebar}
      ></div>

      <aside className={`ret-sidebar ${isOpen ? "open" : ""}`}>
        <div className="ret-sidebar-brand">
          <div className="ret-sidebar-logo">
            <i className="bi bi-bar-chart-line-fill"></i>
          </div>
          <div>
            <h4>Retention Data</h4>
            <span>Management System</span>
          </div>
        </div>

        <div className="ret-sidebar-menu">
          <p className="ret-sidebar-section-title">MAIN MENU</p>

          {menuItems.map(renderLink)}

          {isAdmin && (
            <>
              <p className="ret-sidebar-section-title ret-sidebar-admin-title">
                ADMINISTRATION
              </p>

              {adminItems.map(renderLink)}
            </>
          )}
        </div>

        <div className="ret-sidebar-user">
          <div className="ret-sidebar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="ret-sidebar-user-info">
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
