import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import SalesData from "../pages/SalesData/SalesData";
import ServiceData from "../pages/ServiceData/ServiceData";
import DmsRetail from "../pages/DmsRetail/DmsRetail";
import MasterData from "../pages/MasterData/MasterData";
import Managers from "../pages/Managers/Managers";

import ManualImport from "../pages/ManualImport/ManualImport";
import ImportHistory from "../pages/ImportHistory/ImportHistory";
import VehicleModels from "../pages/VehicleModels/VehicleModels";
import BranchManagement from "../pages/BranchManagement/BranchManagement";

import MainLayout from "../components/layout/MainLayout";

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;

  return user ? <MainLayout /> : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();

  return isAdmin ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sales-data" element={<SalesData />} />
        <Route path="/service-data" element={<ServiceData />} />
        <Route path="/dms-retail" element={<DmsRetail />} />
        <Route path="/master-data" element={<MasterData />} />
        <Route path="/manual-import" element={<ManualImport />} />
        <Route path="/import-history" element={<ImportHistory />} />
        <Route path="/vehicle-models" element={<VehicleModels />} />
        <Route
          path="/branch-management"
          element={
            <AdminRoute>
              <BranchManagement />
            </AdminRoute>
          }
        />

        <Route
          path="/managers"
          element={
            <AdminRoute>
              <Managers />
            </AdminRoute>
          }
        />

       
      </Route>

      <Route
        path="/"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />

      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
};

export default AppRoutes;
