import { useState } from "react";
import api from "../../services/api";
import "./ManualImport.css";

const excelConfig = {
  sales: {
    title: "Sales Data",
    previewUrl: "/import/preview/sales",
    importUrl: "/import/sales",
    icon: "bi-graph-up-arrow",
  },
  service: {
    title: "Service Data",
    previewUrl: "/import/preview/service",
    importUrl: "/import/service",
    icon: "bi-tools",
  },
};

const initialExcelState = {
  sales: {
    file: null,
    sheets: [],
    selectedSheet: "",
    preview: null,
    report: null,
    error: "",
  },
  service: {
    file: null,
    sheets: [],
    selectedSheet: "",
    preview: null,
    report: null,
    error: "",
  },
};

const ManualImport = () => {
  const [importing, setImporting] = useState("");
  const [urlResults, setUrlResults] = useState({
    sales: null,
    dms: null,
    serviceUrl: null,
  });

  const [urlErrors, setUrlErrors] = useState({
    sales: "",
    dms: "",
    serviceUrl: "",
  });

  const [excel, setExcel] = useState(initialExcelState);
  const [previewLoading, setPreviewLoading] = useState("");

  // --------------------------------
  // URL IMPORT
  // --------------------------------

  const handleUrlImport = async (type) => {
    if (importing || previewLoading) return;

    const endpoints = {
      sales: "/import/sales-url",
      dms: "/dms-retail/import-url",
      serviceUrl: "/import/service-url",
    };

    const endpoint = endpoints[type];

    if (!endpoint) return;

    try {
      setImporting(type);

      setUrlErrors((prev) => ({
        ...prev,
        [type]: "",
      }));

      setUrlResults((prev) => ({
        ...prev,
        [type]: null,
      }));

      const response = await api.post(endpoint);

      setUrlResults((prev) => ({
        ...prev,
        [type]: response.data,
      }));
    } catch (error) {
      setUrlErrors((prev) => ({
        ...prev,
        [type]:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Import failed.",
      }));
    } finally {
      setImporting("");
    }
  };

  // --------------------------------
  // EXCEL FILE SELECTION
  // --------------------------------

  const handleFileChange = (type, event) => {
    const file = event.target.files?.[0];

    setExcel((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        file: file || null,
        sheets: [],
        selectedSheet: "",
        preview: null,
        report: null,
        error: "",
      },
    }));
  };

  // --------------------------------
  // EXCEL PREVIEW
  // --------------------------------

  const handlePreview = async (type) => {
    const config = excelConfig[type];
    const current = excel[type];

    if (!current.file || importing || previewLoading) return;

    try {
      setPreviewLoading(type);

      setExcel((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          error: "",
          preview: null,
          report: null,
        },
      }));

      const formData = new FormData();
      formData.append("file", current.file);

      if (current.selectedSheet) {
        formData.append("sheetName", current.selectedSheet);
      }

      const response = await api.post(config.previewUrl, formData);

      setExcel((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          sheets: response.data.availableSheets || [],
          selectedSheet: response.data.selectedSheet || "",
          preview: response.data,
        },
      }));
    } catch (error) {
      setExcel((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          preview: null,
          error:
            error.response?.data?.error ||
            error.response?.data?.message ||
            "Excel preview failed.",
        },
      }));
    } finally {
      setPreviewLoading("");
    }
  };

  // --------------------------------
  // EXCEL IMPORT
  // --------------------------------

  const handleExcelImport = async (type) => {
    const config = excelConfig[type];
    const current = excel[type];

    if (!current.file || !current.selectedSheet || !current.preview) {
      return;
    }

    if (importing || previewLoading) return;

    const confirmed = window.confirm(
      `Import ${config.title} from sheet "${current.selectedSheet}"?`,
    );

    if (!confirmed) return;

    try {
      setImporting(type);

      setExcel((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          error: "",
          report: null,
        },
      }));

      const formData = new FormData();
      formData.append("file", current.file);
      formData.append("sheetName", current.selectedSheet);

      const response = await api.post(config.importUrl, formData);

      setExcel((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          report: response.data,
        },
      }));
    } catch (error) {
      setExcel((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          error:
            error.response?.data?.error ||
            error.response?.data?.message ||
            "Excel import failed.",
        },
      }));
    } finally {
      setImporting("");
    }
  };

  // --------------------------------
  // IMPORT REPORT
  // --------------------------------

  const renderReport = (result, title) => {
    if (!result) return null;

    const metrics = [
      {
        label: "Total Rows",
        value: result.totalRows,
        icon: "bi-list-ol",
      },
      {
        label: "Processed",
        value: result.processedRecords,
        icon: "bi-check2-square",
      },
      {
        label: "Inserted",
        value: result.insertedCount,
        icon: "bi-plus-circle",
      },
      {
        label: "Matched",
        value: result.matchedCount,
        icon: "bi-link",
      },
      {
        label: "Updated",
        value: result.updatedCount ?? result.modifiedCount,
        icon: "bi-pencil-square",
      },
      {
        label: "Unchanged",
        value: result.unchangedCount,
        icon: "bi-check-circle",
      },
      {
        label: "Skipped",
        value: result.skippedCount,
        icon: "bi-skip-forward",
      },
      {
        label: "Duplicate Rows",
        value: result.duplicateRows,
        icon: "bi-copy",
      },

      {
        label: "Invoiced Rows",
        value: result.invoicedRows,
        icon: "bi-receipt",
      },
      {
        label: "Filtered Out",
        value: result.filteredOutRows,
        icon: "bi-funnel",
      },
    ].filter((item) => item.value !== undefined);

    return (
      <div className="ret-import-report">
        <div className="ret-import-report-header">
          <div>
            <span className="ret-import-report-label">IMPORT REPORT</span>
            <h6>{title}</h6>
          </div>

          <span className="ret-import-success">
            <i className="bi bi-check-circle-fill"></i>
            Completed
          </span>
        </div>

        <p className="ret-import-report-message">
          {result.message || "Import completed successfully."}
        </p>

        <div className="ret-import-report-grid">
          {metrics.map((item) => (
            <div className="ret-import-report-metric" key={item.label}>
              <div>
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </div>

              <strong>{Number(item.value).toLocaleString("en-IN")}</strong>
            </div>
          ))}
        </div>

        {result.sheetName && (
          <div className="ret-import-report-footer">
            Imported sheet: <strong>{result.sheetName}</strong>
          </div>
        )}

        {result.source && (
          <div className="ret-import-report-footer">
            Source: <strong>{result.source}</strong>
          </div>
        )}
      </div>
    );
  };

  // --------------------------------
  // EXCEL IMPORT CARD
  // --------------------------------

  const renderExcelCard = (type) => {
    const config = excelConfig[type];
    const data = excel[type];

    return (
      <div className="ret-manual-card ret-excel-card" key={type}>
        <div className="ret-manual-card-icon ret-manual-service-icon">
          <i className={`bi ${config.icon}`}></i>
        </div>

        <h5>{config.title} Excel Import</h5>

        <p>
          Upload an Excel file, select a worksheet, preview the records and
          import them into MongoDB.
        </p>

        <div className="ret-excel-upload">
          <label htmlFor={`ret-${type}-file`}>
            <i className="bi bi-file-earmark-spreadsheet"></i>
            Select Excel File
          </label>

          <input
            id={`ret-${type}-file`}
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => handleFileChange(type, event)}
            disabled={!!importing || !!previewLoading}
          />

          {data.file && (
            <div className="ret-excel-file-name">
              <i className="bi bi-file-earmark-excel"></i>
              <span>{data.file.name}</span>
            </div>
          )}
        </div>

        <button
          className="ret-manual-button ret-excel-preview-button"
          onClick={() => handlePreview(type)}
          disabled={!data.file || !!importing || !!previewLoading}
        >
          {previewLoading === type ? (
            <>
              <span className="spinner-border spinner-border-sm"></span>
              Loading Preview...
            </>
          ) : (
            <>
              <i className="bi bi-eye"></i>
              Preview Excel
            </>
          )}
        </button>

        {data.sheets.length > 0 && (
          <div className="ret-excel-sheet">
            <label htmlFor={`ret-${type}-sheet`}>Select Worksheet</label>

            <select
              id={`ret-${type}-sheet`}
              value={data.selectedSheet}
              disabled={!!importing || !!previewLoading}
              onChange={(event) => {
                setExcel((prev) => ({
                  ...prev,
                  [type]: {
                    ...prev[type],
                    selectedSheet: event.target.value,
                    preview: null,
                    report: null,
                  },
                }));
              }}
            >
              {data.sheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          </div>
        )}

        {data.preview && (
          <div className="ret-excel-preview">
            <div className="ret-excel-preview-title">
              <i className="bi bi-table"></i>
              Excel Preview
            </div>

            <div className="ret-excel-summary">
              <div>
                <span>Worksheet</span>
                <strong>{data.preview.selectedSheet}</strong>
              </div>

              <div>
                <span>Total Rows</span>
                <strong>
                  {data.preview.totalRows?.toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Columns</span>
                <strong>{data.preview.headers?.length || 0}</strong>
              </div>
            </div>

            <div className="ret-excel-table-wrapper">
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    {data.preview.headers?.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.preview.preview?.map((row, index) => (
                    <tr key={index}>
                      {data.preview.headers?.map((header) => (
                        <td key={header}>
                          {row[header] === null || row[header] === undefined
                            ? "-"
                            : String(row[header])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="ret-excel-preview-note">
              Showing the first {data.preview.preview?.length || 0} rows. Check
              the worksheet and headers before importing.
            </p>

            <button
              className="ret-manual-button ret-excel-import-button"
              onClick={() => handleExcelImport(type)}
              disabled={!!importing || !!previewLoading}
            >
              {importing === type ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Importing {config.title}...
                </>
              ) : (
                <>
                  <i className="bi bi-database-add"></i>
                  Import {config.title}
                </>
              )}
            </button>
          </div>
        )}

        {data.error && (
          <div className="ret-manual-error">
            <i className="bi bi-exclamation-circle"></i>
            {data.error}
          </div>
        )}

        {renderReport(data.report, config.title)}
      </div>
    );
  };

  // --------------------------------
  // PAGE
  // --------------------------------

  return (
    <div className="ret-manual-page">
      <div className="ret-manual-header">
        <div>
          <h4>Manual Import</h4>
          <p>
            Import Sales, Service and DMS Retail data. View detailed reports
            after every import.
          </p>
        </div>
      </div>

      {/* URL IMPORTS */}

      <div className="ret-manual-section">
        <div className="ret-manual-section-heading">
          <i className="bi bi-cloud-download"></i>
          <h5>URL Imports</h5>
        </div>

        <div className="ret-manual-cards">
          {/* SALES URL */}

          <div className="ret-manual-card">
            <div className="ret-manual-card-icon ret-manual-sales-icon">
              <i className="bi bi-graph-up-arrow"></i>
            </div>

            <h5>Sales Data</h5>
            <p>
              Fetch the latest Sales Data from the ERAM Sales CSV feed and
              update MongoDB.
            </p>

            <button
              className="ret-manual-button ret-manual-sales-button"
              onClick={() => handleUrlImport("sales")}
              disabled={!!importing || !!previewLoading}
            >
              {importing === "sales" ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Importing Sales...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat"></i>
                  Import Sales URL
                </>
              )}
            </button>

            {urlErrors.sales && (
              <div className="ret-manual-error">{urlErrors.sales}</div>
            )}

            {renderReport(urlResults.sales, "Sales URL Import")}
          </div>

          {/* DMS URL */}

          <div className="ret-manual-card">
            <div className="ret-manual-card-icon ret-manual-dms-icon">
              <i className="bi bi-database"></i>
            </div>

            <h5>DMS Retail Data</h5>
            <p>
              Fetch the latest DMS Retail CSV feed, filter invoiced records and
              import the latest record per chassis.
            </p>

            <button
              className="ret-manual-button ret-manual-dms-button"
              onClick={() => handleUrlImport("dms")}
              disabled={!!importing || !!previewLoading}
            >
              {importing === "dms" ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Importing DMS...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat"></i>
                  Import DMS Retail
                </>
              )}
            </button>

            {urlErrors.dms && (
              <div className="ret-manual-error">{urlErrors.dms}</div>
            )}

            {renderReport(urlResults.dms, "DMS Retail URL Import")}
          </div>

          {/* SERVICE PHP API IMPORT */}

          <div className="ret-manual-card">
            <div className="ret-manual-card-icon ret-manual-service-icon">
              <i className="bi bi-database-gear"></i>
            </div>

            <h5>Service Data – PHP API</h5>

            <p>
              Fetch Service Bill Status records from the PHP API, filter
              invoiced records and append them to MongoDB.
            </p>

            <button
              className="ret-manual-button ret-manual-service-button"
              onClick={() => handleUrlImport("serviceUrl")}
              disabled={!!importing || !!previewLoading}
            >
              {importing === "serviceUrl" ? (
                <>
                  <span className="spinner-border spinner-border-sm"></span>
                  Importing Service API...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat"></i>
                  Import Service API
                </>
              )}
            </button>

            {urlErrors.serviceUrl && (
              <div className="ret-manual-error">
                <i className="bi bi-exclamation-circle"></i>
                {urlErrors.serviceUrl}
              </div>
            )}

            {renderReport(urlResults.serviceUrl, "Service PHP API Import")}
          </div>
        </div>
      </div>

      {/* EXCEL IMPORTS */}

      <div className="ret-manual-section">
        <div className="ret-manual-section-heading">
          <i className="bi bi-file-earmark-excel"></i>
          <h5>Excel Imports</h5>
        </div>

        <div className="ret-manual-cards">
          {renderExcelCard("sales")}
          {renderExcelCard("service")}
        </div>
      </div>
    </div>
  );
};

export default ManualImport;
