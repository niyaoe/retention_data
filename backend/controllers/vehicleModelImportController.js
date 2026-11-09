
const XLSX = require("xlsx");
const VehicleModel = require("../models/VehicleModel");

const importVehicleModels = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an Excel file",
      });
    }

    // Read Excel directly from Multer memory buffer
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheet = workbook.Sheets["Model_Segment"];

    if (!sheet) {
      return res.status(400).json({
        message: "Model_Segment sheet not found",
      });
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    const normalize = (value) =>
      String(value || "").trim().replace(/\s+/g, " ");

    const excelRecords = new Map();

    let skippedCount = 0;
    let duplicateRows = 0;

    for (const row of rows) {
      const modelGroup = normalize(row["Model Group"]);
      const segment = normalize(row["Segment"]);
      const subSegment = normalize(row["Sub Segment"]);

      if (!modelGroup || !segment || !subSegment) {
        skippedCount++;
        continue;
      }

      const normalizedModelGroup = modelGroup.toLowerCase();

      if (excelRecords.has(normalizedModelGroup)) {
        duplicateRows++;
      }

      excelRecords.set(normalizedModelGroup, {
        modelGroup,
        segment,
        subSegment,
        normalizedModelGroup,
      });
    }

    const records = Array.from(excelRecords.values());

    const keys = records.map(
      (record) => record.normalizedModelGroup
    );

    const existingModels = await VehicleModel.find({
      normalizedModelGroup: { $in: keys },
    }).lean();

    const existingMap = new Map(
      existingModels.map((model) => [
        model.normalizedModelGroup,
        model,
      ])
    );

    const operations = [];

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const record of records) {
      const existing = existingMap.get(
        record.normalizedModelGroup
      );

      if (!existing) {
        operations.push({
          insertOne: {
            document: record,
          },
        });

        insertedCount++;
        continue;
      }

      const hasChanges =
        existing.modelGroup !== record.modelGroup ||
        existing.segment !== record.segment ||
        existing.subSegment !== record.subSegment;

      if (!hasChanges) {
        unchangedCount++;
        continue;
      }

      operations.push({
        updateOne: {
          filter: { _id: existing._id },
          update: {
            $set: {
              modelGroup: record.modelGroup,
              segment: record.segment,
              subSegment: record.subSegment,
              normalizedModelGroup:
                record.normalizedModelGroup,
            },
          },
        },
      });

      updatedCount++;
    }

    if (operations.length > 0) {
      await VehicleModel.bulkWrite(operations, {
        ordered: false,
      });
    }

    return res.status(200).json({
      message: "Vehicle models imported successfully",
      totalRows: rows.length,
      processedRecords: records.length,
      insertedCount,
      updatedCount,
      unchangedCount,
      duplicateRows,
      skippedCount,
    });
  } catch (error) {
    console.error("Vehicle model import error:", error);

    return res.status(500).json({
      message: "Vehicle model import failed",
      error: error.message,
    });
  }
};

module.exports = { importVehicleModels };
