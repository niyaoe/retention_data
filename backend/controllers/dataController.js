
const SalesData = require("../models/SalesData");
const ServiceData = require("../models/ServiceData");
const DmsRetailData = require("../models/DmsRetailData");

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit, 10) || 25)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

// SALES DATA
const getSalesData = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = req.query.search?.trim();

    const match = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      match.$or = [
        { chassisNumber: regex },
        { registrationNumber: regex },
        { customerName: regex },
        { modelGroup: regex },
        { city: regex },
        { mobileNo: regex },
      ];
    }

    const pipeline = [{ $match: match }];

    if (req.user.role === "manager") {
      const locations = req.user.assignedLocations || [];
      const locationNames = locations.map((location) => location.name);

      if (!locationNames.length) {
        return res.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
      }

      pipeline.push(
        {
          $lookup: {
            from: ServiceData.collection.name,
            let: { chassis: "$chassisNumber" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$chassisNumber", "$$chassis"],
                  },
                  dealerLocation: { $in: locationNames },
                },
              },
              { $limit: 1 },
            ],
            as: "assignedService",
          },
        },
        {
          $match: {
            "assignedService.0": { $exists: true },
          },
        }
      );
    }

    pipeline.push(
      { $sort: { deliveryDate: -1, _id: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            { $project: { assignedService: 0 } },
          ],
          total: [{ $count: "count" }],
        },
      }
    );

    const [result] = await SalesData.aggregate(pipeline);

    const total = result.total[0]?.count || 0;

    res.json({
      data: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get sales data error:", error);
    res.status(500).json({ message: "Failed to fetch sales data" });
  }
};

// SERVICE DATA
const getServiceData = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = req.query.search?.trim();

    const filter = {};

    if (req.user.role === "manager") {
      const locations = req.user.assignedLocations || [];
      const locationNames = locations.map((location) => location.name);

      if (!locationNames.length) {
        return res.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
      }

      filter.dealerLocation = { $in: locationNames };
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { chassisNumber: regex },
        { registrationNumber: regex },
        { repairOrderNumber: regex },
        { dealerLocation: regex },
        { roServiceAdvisor: regex },
        { productName: regex },
        { serviceType: regex },
      ];
    }

    const [data, total] = await Promise.all([
      ServiceData.find(filter)
        .sort({ billDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      ServiceData.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get service data error:", error);
    res.status(500).json({ message: "Failed to fetch service data" });
  }
};

// DMS RETAIL DATA
const getDmsRetailData = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = req.query.search?.trim();

    const filter = {};

    if (req.user.role === "manager") {
      const locations = req.user.assignedLocations || [];
      const dealerCodes = locations.map((location) => location.code);

      if (!dealerCodes.length) {
        return res.json({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        });
      }

      filter.dealerCode = { $in: dealerCodes };
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { chassisNumber: regex },
        { modelGroup: regex },
        { pin: regex },
        { emailId: regex },
        { phoneNo: regex },
        { dealerCode: regex },
        { lesseeMobileNumber: regex },
      ];
    }

    const [data, total] = await Promise.all([
      DmsRetailData.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      DmsRetailData.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get DMS retail data error:", error);
    res.status(500).json({ message: "Failed to fetch DMS retail data" });
  }
};

module.exports = {
  getSalesData,
  getServiceData,
  getDmsRetailData,
};
