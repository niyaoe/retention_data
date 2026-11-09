const XLSX = require("xlsx");
const ServiceData = require("../models/ServiceData");

const CHUNK_SIZE = 1000;

// ------------------------------
// HELPERS
// ------------------------------

const normalizeChassis = (value) =>
  String(value || "").replace(/\s+/g, "").trim().toUpperCase();

const cleanText = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value).trim();
};

const toDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return null;

    return new Date(
      Date.UTC(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H,
        parsed.M,
        parsed.S
      )
    );
  }

  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
};

const getServiceExcelRows = (req) => {
  if (!req.file) {
    throw new Error("Please upload an Excel file");
  }

  const workbook = XLSX.read(req.file.buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetNames = workbook.SheetNames;
  const sheetName = req.body.sheetName || sheetNames[0];

  if (!sheetNames.includes(sheetName)) {
    throw new Error("Invalid Excel sheet selected");
  }

  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: true,
  });

  if (!rows.length) {
    throw new Error("Excel sheet is empty");
  }

  if (!Object.keys(rows[0]).includes("Chassis Number")) {
    throw new Error("Required Excel header missing: Chassis Number");
  }

  return { rows, sheetName, sheetNames };
};

// ------------------------------
// SERVICE EXCEL PREVIEW
// ------------------------------

const previewServiceExcel = async (req, res) => {
  try {
    const { rows, sheetName, sheetNames } =
      getServiceExcelRows(req);

    return res.json({
      message: "Service Excel preview generated successfully",
      importType: "service",
      fileName: req.file.originalname,
      availableSheets: sheetNames,
      selectedSheet: sheetName,
      headers: Object.keys(rows[0]),
      totalRows: rows.length,
      preview: rows.slice(0, 10),
    });
  } catch (error) {
    console.error("Service preview error:", error);

    return res.status(400).json({
      message: error.message,
    });
  }
};

// ------------------------------
// IMPORT SERVICE DATA FROM EXCEL
// ------------------------------

const importServiceData = async (req, res) => {
  try {
    const { rows, sheetName } = getServiceExcelRows(req);

    const uniqueRecords = new Map();

    let skippedCount = 0;
    let duplicateRows = 0;

    rows.forEach((row) => {
      const chassisNumber = normalizeChassis(
        row["Chassis Number"]
      );

      const dealerLocation = cleanText(
        row["Dealer Location"]
      );

      const repairOrderNumber = cleanText(
        row["Repair Order Number"]
      );

      if (!chassisNumber || !dealerLocation || !repairOrderNumber) {
        skippedCount++;
        return;
      }

      const key = `${dealerLocation.toUpperCase()}_${repairOrderNumber}`;

      if (uniqueRecords.has(key)) {
        duplicateRows++;
      }

      uniqueRecords.set(key, {
        chassisNumber,
        dealerLocation,
        repairOrderNumber,
        billDate: toDate(row["Bill Date"]),
        roDate: toDate(row["RO Date"]),
        registrationNumber: cleanText(
          row["Registration Number"]
        ),
        serviceCategory: cleanText(
          row["Service Category"]
        ),
        serviceType: cleanText(row["Service Type"]),
        roServiceAdvisor: cleanText(
          row["RO Service Advisor"]
        ),
        productName: cleanText(row["Product Name"]),
      });
    });

    const records = [...uniqueRecords.values()];

    if (!records.length) {
      return res.status(400).json({
        message: "No valid Service records found",
        totalRows: rows.length,
        skippedCount,
        duplicateRows,
      });
    }

    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          dealerLocation: record.dealerLocation,
          repairOrderNumber: record.repairOrderNumber,
        },
        update: {
          $set: record,
        },
        upsert: true,
      },
    }));

    let insertedCount = 0;
    let matchedCount = 0;
    let modifiedCount = 0;

    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);

      const result = await ServiceData.bulkWrite(chunk, {
        ordered: true,
      });

      insertedCount += result.upsertedCount || 0;
      matchedCount += result.matchedCount || 0;
      modifiedCount += result.modifiedCount || 0;

      console.log(
        `Service processed: ${Math.min(
          i + CHUNK_SIZE,
          operations.length
        )} / ${operations.length}`
      );
    }

    return res.json({
      message: "Service Data imported successfully",
      sheetName,
      totalRows: rows.length,
      processedRecords: records.length,
      insertedCount,
      matchedCount,
      modifiedCount,
      skippedCount,
      duplicateRows,
    });
  } catch (error) {
    console.error("Service import error:", error);

    return res.status(500).json({
      message: "Service Data import failed",
      error: error.message,
    });
  }
};


const SERVICE_API_URL =
  process.env.SERVICE_BILL_STATUS_API_URL ||
  "https://service.eramsales.in/api.php?table=service_bill_status";

const SERVICE_API_CHUNK_SIZE = 1000;

const parseServiceApiDate = (value) => {
  if (!value) return null;

  // API date format: YYYY-MM-DD
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const [, year, month, day] = match;
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day))
    );

    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

const serviceValuesEqual = (oldValue, newValue) => {
  if (oldValue instanceof Date || newValue instanceof Date) {
    const oldTime = oldValue ? new Date(oldValue).getTime() : null;
    const newTime = newValue ? new Date(newValue).getTime() : null;

    return oldTime === newTime;
  }

  return (oldValue ?? null) === (newValue ?? null);
};

// --------------------------------
// IMPORT SERVICE DATA FROM PHP API
// --------------------------------

const importServiceFromUrl = async (req, res) => {
  try {
    console.log("Downloading Service Bill Status API...");

    const response = await fetch(SERVICE_API_URL, {
      signal: AbortSignal.timeout(120000),
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Service API request failed. HTTP status: ${response.status}`
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("json")) {
      throw new Error(
        `Expected JSON from Service API but received ${contentType}`
      );
    }

    const responseData = await response.json();

    // Support either a direct JSON array or a common wrapped response.
    const apiRows = Array.isArray(responseData)
      ? responseData
      : Array.isArray(responseData.data)
      ? responseData.data
      : Array.isArray(responseData.records)
      ? responseData.records
      : null;

    if (!apiRows) {
      throw new Error(
        "Invalid Service API response. Expected an array of records."
      );
    }

    const totalRows = apiRows.length;

    console.log(`Service API fetched ${totalRows} rows.`);

    // --------------------------------
    // FILTER INVOICED / NON-CLAIM ROWS
    // --------------------------------

    const eligibleRows = apiRows.filter((row) => {
      const invoiceStatus = String(row.invoice_status || "")
        .trim()
        .toLowerCase();

      const invoiceType = String(row.invoice_type || "")
        .trim()
        .toLowerCase();

      return (
        invoiceStatus === "invoiced" &&
        invoiceType !== "claim invoice"
      );
    });

    const filteredOutRows = totalRows - eligibleRows.length;

    // --------------------------------
    // NORMALIZE AND DEDUPLICATE
    // KEEP HIGHEST MYSQL ID
    // --------------------------------

    const latestRecords = new Map();

    let duplicateRows = 0;
    let skippedCount = 0;

    for (const row of eligibleRows) {
      const chassisNumber = String(row.chassis_number || "")
        .replace(/\s+/g, "")
        .trim()
        .toUpperCase();

      const dealerLocation = String(row.dealer_location || "").trim();
      const repairOrderNumber = String(
        row.work_order_number || ""
      ).trim();

      if (!chassisNumber || !dealerLocation || !repairOrderNumber) {
        skippedCount++;
        continue;
      }

      const key =
        `${dealerLocation.toUpperCase()}_${repairOrderNumber}`;

      const record = {
        sourceId: Number(row.id) || 0,
        chassisNumber,
        dealerLocation,
        repairOrderNumber,
        billDate: parseServiceApiDate(row.bill_date),
        roDate: parseServiceApiDate(row.ro_date),
        registrationNumber: cleanText(row.registration_number),
        serviceCategory: cleanText(row.service_category),
        serviceType: cleanText(row.service_type),
        roServiceAdvisor: cleanText(row.ro_service_advisor),
        productName: cleanText(row.product_name),
      };

      const existing = latestRecords.get(key);

      if (existing) {
        duplicateRows++;

        // Highest MySQL ID wins.
        if (record.sourceId > existing.sourceId) {
          latestRecords.set(key, record);
        }
      } else {
        latestRecords.set(key, record);
      }
    }

    const records = [...latestRecords.values()];

    if (!records.length) {
      return res.status(400).json({
        message: "No valid Service API records found",
        totalRows,
        invoicedRows: eligibleRows.length,
        filteredOutRows,
        processedRecords: 0,
        duplicateRows,
        skippedCount,
      });
    }

    // --------------------------------
    // APPEND / UPDATE MONGODB
    // --------------------------------

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (
      let i = 0;
      i < records.length;
      i += SERVICE_API_CHUNK_SIZE
    ) {
      const chunk = records.slice(
        i,
        i + SERVICE_API_CHUNK_SIZE
      );

      const existingRecords = await ServiceData.find({
        $or: chunk.map((record) => ({
          dealerLocation: record.dealerLocation,
          repairOrderNumber: record.repairOrderNumber,
        })),
      }).lean();

      const existingMap = new Map(
        existingRecords.map((record) => [
          `${record.dealerLocation.toUpperCase()}_${record.repairOrderNumber}`,
          record,
        ])
      );

      const operations = [];

      for (const record of chunk) {
        const key =
          `${record.dealerLocation.toUpperCase()}_${record.repairOrderNumber}`;

        const existing = existingMap.get(key);

        // Do not overwrite existing fields with empty API values.
        const fields = {
          chassisNumber: record.chassisNumber,
          dealerLocation: record.dealerLocation,
          repairOrderNumber: record.repairOrderNumber,
        };

        const optionalFields = [
          "billDate",
          "roDate",
          "registrationNumber",
          "serviceCategory",
          "serviceType",
          "roServiceAdvisor",
          "productName",
        ];

        optionalFields.forEach((field) => {
          if (
            record[field] !== null &&
            record[field] !== undefined &&
            record[field] !== ""
          ) {
            fields[field] = record[field];
          }
        });

        if (!existing) {
          operations.push({
            insertOne: {
              document: fields,
            },
          });

          insertedCount++;
          continue;
        }

        const changedFields = {};

        for (const [field, value] of Object.entries(fields)) {
          if (!serviceValuesEqual(existing[field], value)) {
            changedFields[field] = value;
          }
        }

        if (Object.keys(changedFields).length > 0) {
          operations.push({
            updateOne: {
              filter: {
                dealerLocation: record.dealerLocation,
                repairOrderNumber: record.repairOrderNumber,
              },
              update: {
                $set: changedFields,
              },
            },
          });

          updatedCount++;
        } else {
          unchangedCount++;
        }
      }

      if (operations.length > 0) {
        await ServiceData.bulkWrite(operations, {
          ordered: true,
        });
      }

      console.log(
        `Service API processed: ${Math.min(
          i + SERVICE_API_CHUNK_SIZE,
          records.length
        )} / ${records.length}`
      );
    }

    return res.json({
      message: "Service API data imported successfully",
      source: "Service Bill Status PHP API",
      totalRows,
      invoicedRows: eligibleRows.length,
      filteredOutRows,
      processedRecords: records.length,
      insertedCount,
      updatedCount,
      unchangedCount,
      duplicateRows,
      skippedCount,
    });
  } catch (error) {
    console.error("Service API import error:", error);

    return res.status(500).json({
      message: "Service API import failed",
      error: error.message,
    });
  }
};


module.exports = {
  previewServiceExcel,
  importServiceData,
  importServiceFromUrl,
};