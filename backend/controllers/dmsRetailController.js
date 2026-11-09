const { parse } = require("csv-parse/sync");
const DmsRetailData = require("../models/DmsRetailData");

const CHUNK_SIZE = 1000;

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";

  return String(value).trim();
};

const normalizeChassis = (value) =>
  normalizeText(value).replace(/\s+/g, "").toUpperCase();

// CSV invoice date format: DD-MM-YY or DD-MM-YYYY
const parseInvoiceDate = (value) => {
  const text = normalizeText(value);

  if (!text) return null;

  const match = text.match(
    /^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);

    let year = Number(match[3]);

    if (year < 100) {
      year += year <= 69 ? 2000 : 1900;
    }

    const hours = Number(match[4] || 0);
    const minutes = Number(match[5] || 0);
    const seconds = Number(match[6] || 0);

    const date = new Date(
      Date.UTC(year, month - 1, day, hours, minutes, seconds)
    );

    // Reject invalid calendar dates
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // Support ISO-formatted dates if the feed changes format
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const importDmsRetail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a CSV file",
      });
    }

    // The source CSV contains Windows-1252 characters.
    const csvText = req.file.buffer.toString("latin1");

    const csvRows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: false,
    });

    if (!csvRows.length) {
      return res.status(400).json({
        message: "CSV file contains no records",
      });
    }

    const availableHeaders = Object.keys(csvRows[0]);

    const requiredHeaders = [
      "chassis_number",
      "invoice_date_time",
      "invoice_status",
    ];

    const missingHeaders = requiredHeaders.filter(
      (header) => !availableHeaders.includes(header)
    );

    if (missingHeaders.length) {
      return res.status(400).json({
        message: "Required CSV headers are missing",
        missingHeaders,
      });
    }

    // Only keep invoiced records
    const filteredRows = csvRows.filter(
      (row) =>
        normalizeText(row.invoice_status).toLowerCase() === "invoiced"
    );

    const filteredOutRows = csvRows.length - filteredRows.length;

    // Keep the latest invoice for each chassis in this CSV.
    // On equal invoice dates, the later CSV row wins.
    const latestRecords = new Map();

    let skippedCount = 0;
    let duplicateRows = 0;

    for (const row of filteredRows) {
      const chassisNumber = normalizeChassis(
        row.chassis_number
      );

      if (!chassisNumber) {
        skippedCount++;
        continue;
      }

      const invoiceDateTime = parseInvoiceDate(
        row.invoice_date_time
      );

      if (!invoiceDateTime) {
        skippedCount++;
        continue;
      }

      // Preserve all 154 original columns, including empty values.
      const details = {};

      for (const header of availableHeaders) {
        details[header] = normalizeText(row[header]);
      }

      const record = {
        chassisNumber,
        invoiceDateTime,
        details,

        // Frequently used fields for existing API compatibility
        modelGroup: details.model_group || null,
        pin: details.pin || null,
        emailId: details.email_id || null,
        phoneNo: details.phone_no || null,
        dealerCode: details.dealer_code || null,
        lesseeMobileNumber:
          details.lessee_mobile_number || null,
      };

      if (latestRecords.has(chassisNumber)) {
        duplicateRows++;

        const previous = latestRecords.get(chassisNumber);

        if (invoiceDateTime < previous.invoiceDateTime) {
          continue;
        }
      }

      latestRecords.set(chassisNumber, record);
    }

    const records = [...latestRecords.values()];

    if (!records.length) {
      return res.status(400).json({
        message: "No valid chassis and invoice date records found",
        skippedCount,
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    // Process in chunks to control memory and database load.
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      const chassisNumbers = chunk.map(
        (record) => record.chassisNumber
      );

      const existingRecords = await DmsRetailData.find({
        chassisNumber: { $in: chassisNumbers },
      })
        .select("chassisNumber invoiceDateTime")
        .lean();

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

        const existingDate = existing.invoiceDateTime
          ? new Date(existing.invoiceDateTime)
          : null;

        if (
          !existingDate ||
          record.invoiceDateTime > existingDate
        ) {
          operations.push({
            updateOne: {
              filter: {
                chassisNumber: record.chassisNumber,
              },
              update: {
                $set: record,
              },
            },
          });

          updatedCount++;
        } else {
          unchangedCount++;
        }
      }

      if (operations.length) {
        await DmsRetailData.bulkWrite(operations, {
          ordered: true,
        });
      }

      console.log(
        `DMS Retail processed: ${Math.min(
          i + CHUNK_SIZE,
          records.length
        )} / ${records.length}`
      );
    }

    return res.json({
      message: "DMS Retail data imported successfully",
      fileName: req.file.originalname,

      totalRows: csvRows.length,
      invoicedRows: filteredRows.length,
      filteredOutRows,

      processedRecords: records.length,
      duplicateRows,
      skippedCount,

      insertedCount,
      updatedCount,
      unchangedCount,

      totalHeaders: availableHeaders.length,
    });
  } catch (error) {
    console.error("DMS Retail import error:", error);

    return res.status(500).json({
      message: "DMS Retail import failed",
      error: error.message,
    });
  }
};

// IMPORT DMS RETAIL DIRECTLY FROM URL
const importDmsRetailFromUrl = async (req, res) => {
  try {
    const csvUrl = process.env.DMS_RETAIL_CSV_URL;

    if (!csvUrl) {
      return res.status(500).json({
        message: "DMS Retail CSV URL is not configured",
      });
    }

    console.log("Downloading DMS Retail CSV...");

    const response = await fetch(csvUrl, {
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      throw new Error(
        `CSV download failed: HTTP ${response.status}`
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json")
    ) {
      throw new Error(
        `Expected CSV but received ${contentType}`
      );
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    if (!buffer.length) {
      throw new Error("Downloaded CSV is empty");
    }

    console.log(
      `Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
    );

    return await importDmsRetail(
      {
        file: {
          buffer,
          originalname: "dms_retail_full_feed.csv",
        },
      },
      res
    );
  } catch (error) {
    console.error("DMS Retail URL import error:", error);

    return res.status(500).json({
      message: "DMS Retail URL import failed",
      error: error.message,
    });
  }
};

module.exports = {
  importDmsRetail,
  importDmsRetailFromUrl,
};