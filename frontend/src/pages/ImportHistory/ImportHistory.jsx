
import { useEffect, useState } from "react";
import api from "../../services/api";
import "./ImportHistory.css";

const ImportHistory = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalImports: 0,
    successfulImports: 0,
    failedImports: 0,
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
  });

  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/import-history", {
        params: { page, limit: 20, source, status },
      });

      setRecords(response.data.records || []);
      setSummary(response.data.summary || {});
      setPagination(response.data.pagination || {});
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load import history"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [source, status]);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatDuration = (milliseconds) => {
    if (milliseconds == null) return "-";

    const seconds = Math.floor(milliseconds / 1000);

    if (seconds < 60) return `${seconds}s`;

    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="import-history-page">
      <div className="import-history-header">
        <div>
          <h2>Import History</h2>
          <p>Monitor scheduled and manual data imports.</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => fetchHistory(pagination.currentPage || 1)}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="import-history-summary">
        <div className="history-summary-card">
          <span>Total Imports</span>
          <h3>{summary.totalImports || 0}</h3>
        </div>

        <div className="history-summary-card success">
          <span>Successful</span>
          <h3>{summary.successfulImports || 0}</h3>
        </div>

        <div className="history-summary-card failed">
          <span>Failed</span>
          <h3>{summary.failedImports || 0}</h3>
        </div>
      </div>

      <div className="import-history-filters">
        <select
          className="form-select"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">All Sources</option>
          <option value="Sales Data">Sales Data</option>
          <option value="Service PHP API">Service PHP API</option>
          <option value="DMS Retail">DMS Retail</option>
        </select>

        <select
          className="form-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="import-history-table-wrapper">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Source</th>
              <th>Trigger</th>
              <th>Status</th>
              <th>Started At</th>
              <th>Duration</th>
              <th>Total Rows</th>
              <th>Inserted</th>
              <th>Updated</th>
              <th>Unchanged</th>
              <th>Duplicates</th>
              <th>Error</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" className="text-center py-4">
                  Loading import history...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center py-4">
                  No import history found.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record._id}>
                  <td className="fw-semibold">{record.source}</td>

                  <td>
                    <span className="history-trigger">
                      {record.trigger}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`history-status ${
                        record.status === "success"
                          ? "status-success"
                          : "status-failed"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>

                  <td>{formatDate(record.startedAt)}</td>
                  <td>{formatDuration(record.duration)}</td>
                  <td>{record.totalRows ?? 0}</td>
                  <td>{record.insertedCount ?? 0}</td>
                  <td>{record.updatedCount ?? 0}</td>
                  <td>{record.unchangedCount ?? 0}</td>
                  <td>{record.duplicateRows ?? 0}</td>

                  <td className="history-error">
                    {record.errorMessage || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="import-history-pagination">
        <span>
          Page {pagination.currentPage || 1} of{" "}
          {pagination.totalPages || 1}
        </span>

        <div>
          <button
            className="btn btn-outline-secondary btn-sm me-2"
            disabled={
              loading || (pagination.currentPage || 1) <= 1
            }
            onClick={() => fetchHistory(pagination.currentPage - 1)}
          >
            Previous
          </button>

          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={
              loading ||
              (pagination.currentPage || 1) >=
                (pagination.totalPages || 1)
            }
            onClick={() => fetchHistory(pagination.currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportHistory;
