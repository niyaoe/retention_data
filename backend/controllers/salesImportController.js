const XLSX = require("xlsx");
const SalesData = require("../models/SalesData");

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

const getSalesExcelRows = (req) => {
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

  if (!Object.keys(rows[0]).includes("Chassis_No")) {
    throw new Error("Required Excel header missing: Chassis_No");
  }

  return { rows, sheetName, sheetNames };
};

const valuesAreEqual = (oldValue, newValue) => {
  if (oldValue instanceof Date || newValue instanceof Date) {
    const oldTime = oldValue ? new Date(oldValue).getTime() : null;
    const newTime = newValue ? new Date(newValue).getTime() : null;

    return oldTime === newTime;
  }

  return (oldValue ?? null) === (newValue ?? null);
};

// ------------------------------
// SALES EXCEL PREVIEW
// ------------------------------

const previewSalesExcel = async (req, res) => {
  try {
    const { rows, sheetName, sheetNames } = getSalesExcelRows(req);

    const headers = Object.keys(rows[0]);

    return res.json({
      message: "Sales Excel preview generated successfully",
      importType: "sales",
      fileName: req.file.originalname,
      availableSheets: sheetNames,
      selectedSheet: sheetName,
      headers,
      totalRows: rows.length,
      preview: rows.slice(0, 10),
    });
  } catch (error) {
    console.error("Sales preview error:", error);

    return res.status(400).json({
      message: error.message,
    });
  }
};

// ------------------------------
// IMPORT SALES FROM EXCEL
// ------------------------------

const importSalesData = async (req, res) => {
  try {
    const { rows, sheetName } = getSalesExcelRows(req);

    const uniqueRecords = new Map();

    let skippedCount = 0;
    let duplicateRows = 0;

    rows.forEach((row) => {
      const chassisNumber = normalizeChassis(row.Chassis_No);

      if (!chassisNumber) {
        skippedCount++;
        return;
      }

      if (uniqueRecords.has(chassisNumber)) {
        duplicateRows++;
      }

      // Start with chassis number only.
      const record = { chassisNumber };

      // Add only fields that have actual values.
      const stringFields = {
        saleBranch: row["Sale Branch"],
        registrationNumber: row["Registration_Number"],
        modelGroup: row["Model_Group"],
        customerName: row["Cust Name"] ?? row["Customer_Name"],
        pinCode: row["PostalCode"] ?? row["PIN_Code"],
        city: row["City"],
        tehsil: row["Tehsil"],
        district: row["District"],
        financier: row["Financier"],
        segment: row["Segment"],
        mobileNo: row["Mobile no"],
      };

      for (const [dbField, rawValue] of Object.entries(stringFields)) {
        const value = cleanText(rawValue);

        if (value !== null && value !== "") {
          record[dbField] = value;
        }
      }


      const deliveryDate = toDate(row.Delivery_Date);

      if (deliveryDate) {
        record.deliveryDate = deliveryDate;
      }

      // Last duplicate row wins.
      uniqueRecords.set(chassisNumber, record);
    });

    const records = [...uniqueRecords.values()];

    let insertedCount = 0;
    let matchedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      const chassisNumbers = chunk.map(
        (record) => record.chassisNumber
      );

      const existingRecords = await SalesData.find({
        chassisNumber: { $in: chassisNumbers },
      }).lean();

      const existingMap = new Map(
        existingRecords.map((record) => [
          record.chassisNumber,
          record,
        ])
      );

      const operations = [];

      for (const record of chunk) {
        const existing = existingMap.get(record.chassisNumber);

        // New chassis: insert only the available fields.
        if (!existing) {
          operations.push({
            insertOne: {
              document: record,
            },
          });

          insertedCount++;
          continue;
        }

        matchedCount++;

        const changedFields = {};

        // Compare only fields supplied by Excel.
        // Missing fields will never overwrite existing values.
        for (const [field, newValue] of Object.entries(record)) {
          if (field === "chassisNumber") continue;

          if (!valuesAreEqual(existing[field], newValue)) {
            changedFields[field] = newValue;
          }
        }

        if (Object.keys(changedFields).length > 0) {
          operations.push({
            updateOne: {
              filter: { chassisNumber: record.chassisNumber },
              update: { $set: changedFields },
            },
          });

          updatedCount++;
        } else {
          unchangedCount++;
        }
      }

      if (operations.length > 0) {
        await SalesData.bulkWrite(operations, {
          ordered: true,
        });
      }
    }

    return res.json({
      message: "Sales Data imported successfully",
      sheetName,
      totalRows: rows.length,
      processedRecords: records.length,
      insertedCount,
      matchedCount,
      updatedCount,
      unchangedCount,
      skippedCount,
      duplicateRows,
    });
  } catch (error) {
    console.error("Sales Excel import error:", error);

    return res.status(500).json({
      message: "Sales Data import failed",
      error: error.message,
    });
  }
};

// ------------------------------
// IMPORT SALES DIRECTLY FROM CSV URL
// ------------------------------

const importSalesFromUrl = async (req, res) => {
  try {
    const csvUrl = process.env.SALES_CSV_URL;

    if (!csvUrl) {
      return res.status(500).json({
        message: "Sales CSV URL is not configured",
      });
    }

    console.log("Downloading Sales CSV...");

    const response = await fetch(csvUrl, {
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(
        `CSV download failed. HTTP status: ${response.status}`
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json")
    ) {
      throw new Error(`Expected CSV but received ${contentType}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length) {
      throw new Error("Downloaded CSV file is empty");
    }

    console.log("CSV downloaded. Processing records...");

    const workbook = XLSX.read(buffer, {
      type: "buffer",
      raw: true,
    });

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: true,
    });

    if (rows.length < 2) {
      throw new Error("CSV contains no data records");
    }

    const headers = rows[0].map((header) => String(header).trim());

    const requiredHeaders = [
      "Delivery_Date",
      "Chassis_No",
      "Registration_Number",
      "Model_Group",
      "Customer_Name",
      "PIN_Code",
      "City",
      "Tehsil",
      "District",
      "Financier",
    ];

    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header)
    );

    if (missingHeaders.length) {
      throw new Error(
        `Missing CSV headers: ${missingHeaders.join(", ")}`
      );
    }

    const headerIndex = {};

    headers.forEach((header, index) => {
      headerIndex[header] = index;
    });

    const getValue = (row, header) => row[headerIndex[header]];

    const uniqueRecords = new Map();

    let skippedCount = 0;
    let duplicateRows = 0;

    for (const row of rows.slice(1)) {
      const chassisNumber = normalizeChassis(
        getValue(row, "Chassis_No")
      );

      if (!chassisNumber) {
        skippedCount++;
        continue;
      }

      if (uniqueRecords.has(chassisNumber)) {
        duplicateRows++;
      }

      // Only update fields containing actual CSV values.
      const record = { chassisNumber };

      const stringFields = {
        registrationNumber: "Registration_Number",
        modelGroup: "Model_Group",
        customerName: "Customer_Name",
        pinCode: "PIN_Code",
        city: "City",
        tehsil: "Tehsil",
        district: "District",
        financier: "Financier",
      };

      for (const [dbField, csvField] of Object.entries(stringFields)) {
        const value = cleanText(getValue(row, csvField));

        if (value !== null) {
          record[dbField] = value;
        }
      }

      const deliveryDate = toDate(getValue(row, "Delivery_Date"));

      if (deliveryDate) {
        record.deliveryDate = deliveryDate;
      }

      // Later CSV row wins for duplicate chassis numbers.
      uniqueRecords.set(chassisNumber, record);
    }

    const records = [...uniqueRecords.values()];

    if (!records.length) {
      return res.status(400).json({
        message: "No valid chassis records found",
      });
    }

    let insertedCount = 0;
    let matchedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    console.log(`Importing ${records.length} Sales records...`);

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      const chassisNumbers = chunk.map(
        (record) => record.chassisNumber
      );

      const existingRecords = await SalesData.find({
        chassisNumber: { $in: chassisNumbers },
      }).lean();

      const existingMap = new Map(
        existingRecords.map((record) => [
          record.chassisNumber,
          record,
        ])
      );

      const operations = [];

      for (const record of chunk) {
        const existing = existingMap.get(record.chassisNumber);

        if (!existing) {
          operations.push({
            insertOne: {
              document: record,
            },
          });

          insertedCount++;
          continue;
        }

        matchedCount++;

        const changedFields = {};

        for (const [field, newValue] of Object.entries(record)) {
          if (field === "chassisNumber") continue;

          if (!valuesAreEqual(existing[field], newValue)) {
            changedFields[field] = newValue;
          }
        }

        if (Object.keys(changedFields).length > 0) {
          operations.push({
            updateOne: {
              filter: { chassisNumber: record.chassisNumber },
              update: { $set: changedFields },
            },
          });

          updatedCount++;
        } else {
          unchangedCount++;
        }
      }

      if (operations.length > 0) {
        await SalesData.bulkWrite(operations, {
          ordered: true,
        });
      }

      console.log(
        `Sales processed: ${Math.min(
          i + CHUNK_SIZE,
          records.length
        )} / ${records.length}`
      );
    }

    return res.json({
      message: "Sales CSV imported successfully",
      source: "ERAM Sales CSV API",
      totalRows: rows.length - 1,
      processedRecords: records.length,
      insertedCount,
      matchedCount,
      updatedCount,
      unchangedCount,
      skippedCount,
      duplicateRows,
    });
  } catch (error) {
    console.error("Sales CSV import error:", error);

    return res.status(500).json({
      message: "Sales CSV import failed",
      error: error.message,
    });
  }
};

module.exports = {
  previewSalesExcel,
  importSalesData,
  importSalesFromUrl,
};