
import { useState } from "react";
import {
  previewBranchExcel,
  importBranchExcel,
} from "../../services/branchService";

const BranchImportModal = ({ show, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!show) return null;

  const resetModal = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setLoading(false);
    onClose();
  };

  const handlePreview = async () => {
    if (!file) {
      setError("Please select an Excel file");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await previewBranchExcel(file);
      setPreview(response);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to preview Excel file"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const confirmed = window.confirm(
      "Are you sure you want to import these branches?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");

      const response = await importBranchExcel(file);
      setResult(response);
      onSuccess();
    } catch (err) {
      setError(
        err.response?.data?.message || "Excel import failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="branch-modal-overlay" onClick={resetModal}>
      <div
        className="branch-modal branch-import-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="branch-modal-header">
          <div>
            <h5>Import Branches from Excel</h5>
            <p>Upload your branch master Excel or CSV file</p>
          </div>

          <button
            className="branch-modal-close"
            onClick={resetModal}
            disabled={loading}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="branch-modal-body">
          {error && (
            <div className="alert alert-danger py-2">{error}</div>
          )}

          {!result ? (
            <>
              <div className="branch-import-upload">
                <i className="bi bi-file-earmark-spreadsheet"></i>
                <h6>Select Excel File</h6>
                <p>Supported formats: XLSX, XLS and CSV</p>

                <input
                  type="file"
                  className="form-control"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={loading}
                />

                {file && (
                  <div className="branch-selected-file">
                    <i className="bi bi-file-earmark-excel"></i>
                    {file.name}
                  </div>
                )}
              </div>

              {preview && (
                <div className="branch-import-preview mt-4">
                  <div className="d-flex justify-content-between mb-3">
                    <h6>Excel Preview</h6>
                    <strong>
                      {preview.totalRows} Total Rows
                    </strong>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          {(preview.headers || []).map((header, index) => (
                            <th key={index}>{header}</th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {(preview.preview || []).map((row, index) => (
                          <tr key={index}>
                            {(preview.headers || []).map((header, colIndex) => (
                              <td key={colIndex}>
                                {row[header] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <small className="text-muted">
                    Showing the first 10 rows.
                  </small>
                </div>
              )}
            </>
          ) : (
            <div className="branch-import-result">
              <div className="text-center mb-4">
                <i className="bi bi-check-circle-fill text-success fs-1"></i>
                <h5 className="mt-2">Import Completed</h5>
                <p className="text-muted">
                  {result.message}
                </p>
              </div>

              <div className="branch-import-stats">
                {[
                  ["Total Rows", result.totalRows],
                  ["Inserted", result.insertedCount],
                  ["Updated", result.updatedCount],
                  ["Unchanged", result.unchangedCount],
                  ["Skipped", result.skippedCount],
                  ["Duplicate Rows", result.duplicateRows],
                ].map(([label, value]) => (
                  <div className="branch-import-stat" key={label}>
                    <span>{label}</span>
                    <strong>{value ?? 0}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="branch-modal-footer">
          {!result ? (
            <>
              <button
                className="btn btn-light"
                onClick={resetModal}
                disabled={loading}
              >
                Cancel
              </button>

              {!preview ? (
                <button
                  className="btn btn-primary"
                  onClick={handlePreview}
                  disabled={!file || loading}
                >
                  {loading ? "Loading..." : "Preview Excel"}
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setPreview(null);
                      setFile(null);
                    }}
                    disabled={loading}
                  >
                    Choose Another File
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={handleImport}
                    disabled={loading}
                  >
                    {loading ? "Importing..." : "Confirm Import"}
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={resetModal}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchImportModal;
