import { useEffect, useState } from "react";
import { getBranches, deleteBranch } from "../../services/branchService";
import "./BranchManagement.css";
import BranchFormModal from "./BranchFormModal";
import BranchImportModal from "./BranchImportModal";

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);

  const [showImportModal, setShowImportModal] = useState(false);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getBranches({
        search,
        status,
        page,
        limit,
      });

      console.log("BRANCH API RESPONSE:", response);

      setBranches(response.data || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      console.error("Fetch branches error:", err);
      setError(err.response?.data?.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [search, status, page]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleDelete = async (branch) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${branch.branchName}?`,
    );

    if (!confirmed) return;

    try {
      await deleteBranch(branch._id);
      fetchBranches();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to deactivate branch");
    }
  };

  const handleAddBranch = () => {
    setEditBranch(null);
    setShowModal(true);
  };

  const handleEditBranch = (branch) => {
    setEditBranch(branch);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditBranch(null);
  };

  return (
    <div className="branch-management">
      <div className="branch-page-header">
        <div>
          <h3>Branch Management</h3>
          <p>Manage all company branches</p>
        </div>

        <div className="branch-header-actions">
          <button
            className="btn btn-outline-success"
            onClick={() => setShowImportModal(true)}
          >
            <i className="bi bi-file-earmark-excel me-2"></i>
            Import Excel
          </button>

          <button className="btn btn-primary" onClick={handleAddBranch}>
            <i className="bi bi-plus-lg me-2"></i>
            Add Branch
          </button>
        </div>
      </div>

      <div className="branch-filter-card">
        <div className="branch-search">
          <i className="bi bi-search"></i>
          <input
            type="text"
            className="form-control"
            placeholder="Search branch, code, district..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select branch-status-filter"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="all">All Branches</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <div className="branch-total">
          Total: <strong>{total}</strong>
        </div>
      </div>

      <div className="branch-table-card">
        {error && <div className="alert alert-danger m-3">{error}</div>}

        <div className="table-responsive">
          <table className="table branch-table align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Branch Name</th>
                <th>Location Code</th>
                <th>District</th>
                <th>DMS Name</th>
                <th>Branch Short</th>
                <th>BS Zone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm me-2"></div>
                    Loading branches...
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    No branches found
                  </td>
                </tr>
              ) : (
                branches.map((branch, index) => (
                  <tr key={branch._id}>
                    <td>{(page - 1) * limit + index + 1}</td>
                    <td className="fw-semibold">{branch.branchName || "-"}</td>
                    <td>{branch.locationCode || "-"}</td>
                    <td>{branch.district || "-"}</td>
                    <td>{branch.dmsName || "-"}</td>
                    <td>{branch.branchShort || "-"}</td>
                    <td>{branch.bsZone || "-"}</td>
                    <td>
                      <span
                        className={`branch-status ${
                          branch.isActive ? "active" : "inactive"
                        }`}
                      >
                        {branch.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          title="Edit branch"
                          onClick={() => handleEditBranch(branch)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        {branch.isActive && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Deactivate branch"
                            onClick={() => handleDelete(branch)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="branch-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => prev - 1)}
            >
              Previous
            </button>

            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <BranchFormModal
        show={showModal}
        onClose={handleModalClose}
        onSuccess={fetchBranches}
        editBranch={editBranch}
      />
      <BranchImportModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchBranches}
      />
    </div>
  );
};

export default BranchManagement;
