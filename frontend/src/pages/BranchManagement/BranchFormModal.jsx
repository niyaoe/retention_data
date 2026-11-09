
import { useEffect, useState } from "react";
import { createBranch, updateBranch } from "../../services/branchService";
import "./BranchFormModal.css";

const initialForm = {
  district: "",
  branchName: "",
  locationCode: "",
  dmsName: "",
  forMDReport: "",
  branchShort: "",
  slC: "",
  slB: "",
  aopDistrict: "",
  bsZone: "",
  dCode: "",
  preH2: "",
};

const fields = [
  { name: "district", label: "District" },
  { name: "branchName", label: "Branch Name", required: true },
  { name: "locationCode", label: "Location Code", required: true },
  { name: "dmsName", label: "DMS Name" },
  { name: "forMDReport", label: "For MD Report" },
  { name: "branchShort", label: "Branch Short" },
  { name: "slC", label: "Sl.C" },
  { name: "slB", label: "Sl.B" },
  { name: "aopDistrict", label: "AOP District" },
  { name: "bsZone", label: "BS Zone" },
  { name: "dCode", label: "D-Code" },
  { name: "preH2", label: "PRE-H2" },
];

const BranchFormModal = ({ show, onClose, onSuccess, editBranch }) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editBranch) {
      const values = {};
      Object.keys(initialForm).forEach((key) => {
        values[key] = editBranch[key] ?? "";
      });
      setForm(values);
    } else {
      setForm(initialForm);
    }

    setError("");
  }, [editBranch, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (editBranch) {
        await updateBranch(editBranch._id, form);
      } else {
        await createBranch(form);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save branch"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="branch-modal-overlay" onClick={onClose}>
      <div
        className="branch-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="branch-modal-header">
          <div>
            <h5>{editBranch ? "Edit Branch" : "Add New Branch"}</h5>
            <p>Enter branch information below</p>
          </div>

          <button
            type="button"
            className="branch-modal-close"
            onClick={onClose}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="branch-modal-body">
            {error && (
              <div className="alert alert-danger py-2">
                {error}
              </div>
            )}

            <div className="branch-form-grid">
              {fields.map((field) => (
                <div className="branch-form-group" key={field.name}>
                  <label>
                    {field.label}
                    {field.required && (
                      <span className="text-danger"> *</span>
                    )}
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    required={field.required || false}
                    placeholder={`Enter ${field.label}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="branch-modal-footer">
            <button
              type="button"
              className="btn btn-light"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Saving...
                </>
              ) : (
                editBranch ? "Update Branch" : "Save Branch"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchFormModal;
