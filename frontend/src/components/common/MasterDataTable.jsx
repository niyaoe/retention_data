import React from "react";
import "./MasterDataTable.css";

const MasterDataTable = ({
  columns = [],
  data = [],
  loading = false,
  error = "",
  search = "",
  onSearchChange,
  page = 1,
  total = 0,
  totalPages = 1,
  limit = 25,
  onPageChange,
  onLimitChange,
}) => {
  return (
    <div className="master-table-container">
      <div className="master-table-toolbar">
        <div>
          <h3>Sales Master</h3>
          <span>{total.toLocaleString("en-IN")} records</span>
        </div>

        <input
          type="text"
          placeholder="Search chassis, customer, phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {error && <div className="master-table-error">{error}</div>}

      <div className="master-table-scroll">
        <table className="master-data-table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={`${column.key}-${column.label}-${index}`}>
                  <div className="master-header-cell">
                    <span>{column.label}</span>

                    {column.filterKey && (
                      <select
                        value={column.filterValue || ""}
                        onChange={(e) =>
                          column.onFilterChange(
                            column.filterKey,
                            e.target.value,
                          )
                        }
                      >
                        <option value="">All</option>

                        {column.filterOptions?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="master-table-message">
                  Loading records...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="master-table-message">
                  No records found
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr key={record._id || index}>
                  {columns.map((column, columnIndex) => (
                    <td key={`${column.key}-${column.label}-${columnIndex}`}>
                      {column.render
                        ? column.render(record[column.key], record, index)
                        : (record[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="master-table-pagination">
        <div className="master-page-size">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            {[25, 50, 100, 200].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <span>
          Page {page} of {totalPages}
        </span>

        <div className="master-page-buttons">
          <button
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>

          <button
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterDataTable;
