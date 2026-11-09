
import api from "./api";

// Get branches with search, pagination and status filters
export const getBranches = async (params = {}) => {
  const response = await api.get("/branches", { params });
  return response.data;
};

// Get a single branch
export const getBranchById = async (id) => {
  const response = await api.get(`/branches/${id}`);
  return response.data;
};

// Create branch
export const createBranch = async (data) => {
  const response = await api.post("/branches", data);
  return response.data;
};

// Update branch
export const updateBranch = async (id, data) => {
  const response = await api.put(`/branches/${id}`, data);
  return response.data;
};

// Soft delete branch
export const deleteBranch = async (id) => {
  const response = await api.delete(`/branches/${id}`);
  return response.data;
};

// Preview Excel before import
export const previewBranchExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/branches/excel/preview", formData);
  return response.data;
};

// Import Excel
export const importBranchExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/branches/excel/import", formData);
  return response.data;
};
