
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./MainLayout.css";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/sales-data": "Sales Data",
  "/service-data": "Service Data",
  "/dms-retail": "DMS Retail Data",
  "/master-data": "Master Data",
  "/managers": "Managers",
  "/locations": "Dealer Locations",
};

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = pageTitles[location.pathname] || "Retention Data";

  return (
    <div className="ret-main-layout">
      <Sidebar
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
      />

      <div className="ret-main-content">
        <Topbar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="ret-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
