
const XLSX = require("xlsx");
const Branch = require("../models/Branch");

const cleanText = (value) => {
  if (value === null || value === undefined) return "";

  return String(value).trim();
};

const normalizeLocationCode = (value) =>
  cleanText(value).toUpperCase();

const getBranchExcelRows = (req) => {
  if (!req.file) {
    throw new Error("Please upload an Excel file");
  }

  const workbook = XLSX.read(req.file.buffer, {
    type: "buffer",
  });

  const sheetName = req.body.sheetName || "Branch_list";

  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error("Branch_list sheet not found");
  }

  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: true,
  });

  if (!rows.length) {
    throw new Error("Excel sheet is empty");
  }

  if (!Object.keys(rows[0]).includes("Location code")) {
    throw new Error("Required header missing: Location code");
  }

  return { rows, sheetName };
};

// EXCEL PREVIEW
const previewBranchExcel = async (req, res) => {
  try {
    const { rows, sheetName } = getBranchExcelRows(req);

    return res.json({
      message: "Branch Excel preview generated successfully",
      sheetName,
      totalRows: rows.length,
      headers: Object.keys(rows[0]),
      preview: rows.slice(0, 10),
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

// EXCEL IMPORT
const importBranchExcel = async (req, res) => {
  try {
    const { rows, sheetName } = getBranchExcelRows(req);

    const uniqueRecords = new Map();

    let skippedCount = 0;
    let duplicateRows = 0;

    for (const row of rows) {
      const locationCode = normalizeLocationCode(
        row["Location code"]
      );

      if (!locationCode) {
        skippedCount++;
        continue;
      }

      if (uniqueRecords.has(locationCode)) {
        duplicateRows++;
      }

      uniqueRecords.set(locationCode, {
        locationCode,
        district: cleanText(row["District"]),
        branchName: cleanText(row["Branch name"]),
        dmsName: cleanText(row["DMS Name"]),
        forMDReport: cleanText(row["For MD Report"]),
        branchShort: cleanText(row["Branch-Short"]),
        slC: cleanText(row["Sl.C"]),
        slB: cleanText(row["Sl.B"]),
        aopDistrict: cleanText(row["AOP-District"]),
        bsZone: cleanText(row["BS Zone"]),
        dCode: cleanText(row["D-Code"]),
        preH2: cleanText(row["PRE-H2"]),
      });
    }

    const records = [...uniqueRecords.values()];

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const record of records) {
      if (!record.branchName) {
        skippedCount++;
        continue;
      }

      const existing = await Branch.findOne({
        locationCode: record.locationCode,
      }).lean();

      if (!existing) {
        await Branch.create({
          ...record,
          isActive: true,
          createdBy: req.user?._id || null,
          updatedBy: req.user?._id || null,
        });

        insertedCount++;
        continue;
      }

      const changedFields = {};

      for (const [field, newValue] of Object.entries(record)) {
        // Preserve existing values for blank Excel cells.
        if (newValue === "") continue;

        if ((existing[field] ?? "") !== newValue) {
          changedFields[field] = newValue;
        }
      }

      if (Object.keys(changedFields).length > 0) {
        await Branch.updateOne(
          { _id: existing._id },
          {
            $set: {
              ...changedFields,
              updatedBy: req.user?._id || null,
            },
          }
        );

        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    return res.json({
      message: "Branch Excel imported successfully",
      sheetName,
      totalRows: rows.length,
      processedRecords: records.length,
      insertedCount,
      updatedCount,
      unchangedCount,
      skippedCount,
      duplicateRows,
    });
  } catch (error) {
    console.error("Branch Excel import error:", error);

    return res.status(500).json({
      message: "Branch Excel import failed",
      error: error.message,
    });
  }
};

module.exports = {
  previewBranchExcel,
  importBranchExcel,
};
