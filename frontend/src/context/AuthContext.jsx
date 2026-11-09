
import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing login
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("retentionToken");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
      } catch (error) {
        console.error("Authentication check failed:", error);
        localStorage.removeItem("retentionToken");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login
  const login = async (username, password) => {
    const response = await api.post("/auth/login", {
      username,
      password,
    });

    const { token, user } = response.data;

    localStorage.setItem("retentionToken", token);
    setUser(user);

    return user;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("retentionToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === "admin",
        isManager: user?.role === "manager",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
