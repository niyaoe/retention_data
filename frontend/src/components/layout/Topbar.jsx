import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Topbar.css";

const Topbar = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="ret-topbar">
      <div className="ret-topbar-left">
        <button
          className="ret-topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <i className="bi bi-list"></i>
        </button>

        <h5>{title}</h5>
      </div>

      <div className="ret-topbar-right">
        <div className="ret-topbar-user">
          <i className="bi bi-person-circle"></i>
          <span>{user?.name}</span>
        </div>

        <button
          className="ret-topbar-logout"
          onClick={handleLogout}
          title="Logout"
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;