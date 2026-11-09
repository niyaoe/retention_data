
import "./DataTable.css";

const DataTable = ({
  columns,
  data,
  loading,
  error,
  search,
  onSearchChange,
  page,
  total,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  return (
    <div className="ret-data-table">
      <div className="ret-table-toolbar">
        <div className="ret-table-search">
          <i className="bi bi-search"></i>
          <input
            type="search"
            placeholder="Search records..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="ret-table-toolbar-right">
          <span className="ret-table-total">
            {total.toLocaleString("en-IN")} records
          </span>

          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
      </div>

      <div className="ret-table-scroll">
        <table className="ret-compact-table">
          <thead>
            <tr>
              <th className="ret-table-index">#</th>

              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="ret-table-message">
                    <div className="spinner-border spinner-border-sm"></div>
                    <span>Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="ret-table-message ret-table-error">
                    <i className="bi bi-exclamation-circle"></i>
                    {error}
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="ret-table-message">
                    <i className="bi bi-inbox"></i>
                    No records found
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item._id}>
                  <td className="ret-table-index">
                    {(page - 1) * limit + index + 1}
                  </td>

                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(item[column.key], item)
                        : item[column.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="ret-table-pagination">
        <span>
          Page {page} of {totalPages || 1}
        </span>

        <div className="ret-table-pagination-actions">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            <i className="bi bi-chevron-left"></i>
            Previous
          </button>

          <button
            type="button"
            disabled={page >= totalPages || loading || totalPages === 0}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
