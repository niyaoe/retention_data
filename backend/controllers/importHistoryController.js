
const ImportHistory = require("../models/ImportHistory");

const getImportHistory = async (req, res) => {
  try {
    const {
      source,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (source && source !== "all") {
      filter.source = source;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    const [records, totalRecords, totalImports, successfulImports, failedImports] =
      await Promise.all([
        ImportHistory.find(filter)
          .sort({ startedAt: -1 })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        ImportHistory.countDocuments(filter),

        ImportHistory.countDocuments(),

        ImportHistory.countDocuments({ status: "success" }),

        ImportHistory.countDocuments({ status: "failed" }),
      ]);

    res.status(200).json({
      message: "Import history fetched successfully",

      summary: {
        totalImports,
        successfulImports,
        failedImports,
      },

      pagination: {
        currentPage: pageNumber,
        limit: limitNumber,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNumber),
      },

      records,
    });
  } catch (error) {
    console.error("Get import history error:", error);

    res.status(500).json({
      message: "Failed to fetch import history",
      error: error.message,
    });
  }
};

module.exports = { getImportHistory };
