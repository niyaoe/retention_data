import { useEffect, useState } from "react";
import api from "../../services/api";
import "./VehicleModels.css";

const VehicleModels = () => {
  const [models, setModels] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);

  const [form, setForm] = useState({
    modelGroup: "",
    segment: "",
    subSegment: "",
  });

  const [saving, setSaving] = useState(false);

  const [excelFile, setExcelFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchModels = async (currentPage = page) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/vehicle-models", {
        params: {
          search,
          page: currentPage,
          limit: 20,
        },
      });

      setModels(response.data.vehicleModels || []);
      setPagination(response.data.pagination || {});
      setPage(currentPage);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch vehicle models");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchModels(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchModels(page);
  }, []);

  const handleDelete = async (model) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${model.modelGroup}"?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/vehicle-models/${model._id}`);

      alert("Vehicle model deleted successfully");

      const remainingRecords = models.length - 1;

      const targetPage = remainingRecords === 0 && page > 1 ? page - 1 : page;

      await fetchModels(targetPage);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete vehicle model");
    }
  };

  const openAddModal = () => {
    setEditingModel(null);
    setForm({
      modelGroup: "",
      segment: "",
      subSegment: "",
    });
    setShowModal(true);
  };

  const openEditModal = (model) => {
    setEditingModel(model);
    setForm({
      modelGroup: model.modelGroup,
      segment: model.segment,
      subSegment: model.subSegment,
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (editingModel) {
        await api.put(`/vehicle-models/${editingModel._id}`, form);
      } else {
        await api.post("/vehicle-models", form);
      }

      setShowModal(false);
      await fetchModels(editingModel ? page : 1);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save vehicle model");
    } finally {
      setSaving(false);
    }
  };

  const handleExcelImport = async (e) => {
    e.preventDefault();

    if (!excelFile) {
      alert("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      setImporting(true);
      setImportResult(null);

      const response = await api.post("/vehicle-models/import", formData);

      setImportResult(response.data);
      setExcelFile(null);

      e.target.reset();

      await fetchModels(1);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Excel import failed",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="vehicle-models-page">
      <div className="vehicle-models-header">
        <div>
          <h2>Vehicle Models</h2>
          <p>Manage vehicle model groups and their segments.</p>
        </div>

        <button className="btn btn-primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-2"></i>
          Add Model
        </button>
      </div>

      {/* Excel Import */}
      <div className="vehicle-models-import-card">
        <div>
          <h5>
            <i className="bi bi-file-earmark-excel me-2"></i>
            Import Vehicle Models
          </h5>
          <p>Upload your Model-Segment Excel file.</p>
        </div>

        <form onSubmit={handleExcelImport}>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="form-control"
            onChange={(e) => setExcelFile(e.target.files[0] || null)}
          />

          <button
            type="submit"
            className="btn btn-success"
            disabled={importing || !excelFile}
          >
            {importing ? "Importing..." : "Import Excel"}
          </button>
        </form>

        {importResult && (
          <div className="vehicle-models-import-result">
            <strong>{importResult.message}</strong>

            <div className="vehicle-models-import-metrics">
              <span>Total: {importResult.totalRows}</span>
              <span>Inserted: {importResult.insertedCount}</span>
              <span>Updated: {importResult.updatedCount}</span>
              <span>Unchanged: {importResult.unchangedCount}</span>
              <span>Duplicates: {importResult.duplicateRows}</span>
              <span>Skipped: {importResult.skippedCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Search and Summary */}
      <div className="vehicle-models-toolbar">
        <input
          type="text"
          className="form-control"
          placeholder="Search model, segment or sub segment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <span>
          Total Models: <strong>{pagination.totalRecords || 0}</strong>
        </span>

        <button
          className="btn btn-outline-secondary"
          onClick={() => fetchModels(page)}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Models Table */}
      <div className="vehicle-models-table-wrapper">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Model Group</th>
              <th>Segment</th>
              <th>Sub Segment</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  Loading vehicle models...
                </td>
              </tr>
            ) : models.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  No vehicle models found.
                </td>
              </tr>
            ) : (
              models.map((model, index) => (
                <tr key={model._id}>
                  <td>{(page - 1) * 20 + index + 1}</td>
                  <td className="fw-semibold">{model.modelGroup}</td>
                  <td>{model.segment}</td>
                  <td>{model.subSegment}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openEditModal(model)}
                        title="Edit Model"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(model)}
                        title="Delete Model"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="vehicle-models-pagination">
        <span>
          Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
        </span>

        <div>
          <button
            className="btn btn-outline-secondary btn-sm me-2"
            disabled={loading || page <= 1}
            onClick={() => fetchModels(page - 1)}
          >
            Previous
          </button>

          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={loading || page >= (pagination.totalPages || 1)}
            onClick={() => fetchModels(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="vehicle-models-modal-overlay">
          <div className="vehicle-models-modal">
            <div className="vehicle-models-modal-header">
              <h5>
                {editingModel ? "Edit Vehicle Model" : "Add Vehicle Model"}
              </h5>

              <button type="button" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label className="form-label">Model Group</label>
                <input
                  type="text"
                  name="modelGroup"
                  className="form-control"
                  value={form.modelGroup}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Segment</label>
                <input
                  type="text"
                  name="segment"
                  className="form-control"
                  value={form.segment}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Sub Segment</label>
                <input
                  type="text"
                  name="subSegment"
                  className="form-control"
                  value={form.subSegment}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="vehicle-models-modal-actions">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Model"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleModels;
