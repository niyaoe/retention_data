
const SalesData = require("../models/SalesData");
const ServiceData = require("../models/ServiceData");
const DmsRetailData = require("../models/DmsRetailData");
const Branch = require("../models/Branch");
const VehicleModel = require("../models/VehicleModel");


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

    // Manager access restriction
    if (req.user.role === "manager") {
      const locations = req.user.assignedLocations || [];

      const locationNames = locations.map(
        (location) => location.name
      );

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

            // Get Branch details
            {
              $lookup: {
                from: Branch.collection.name,
                localField: "branch",
                foreignField: "_id",
                as: "branchDetails",
              },
            },
            {
              $unwind: {
                path: "$branchDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                assignedService: 0,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      }
    );

    const [result] = await SalesData.aggregate(pipeline).allowDiskUse(true);

    const total = result.total[0]?.count || 0;

    return res.json({
      data: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get sales data error:", error);
    return res.status(500).json({
      message: "Failed to fetch sales data",
    });
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



// PIN Code API cache (24 hours)
const pinCodeCache = new Map();

const getVillageByPincode = async (pincode) => {
  if (!pincode) return "";

  const pin = String(pincode).trim();

  if (!/^\d{6}$/.test(pin)) return "";

  // Check cache
  const cached = pinCodeCache.get(pin);

  if (cached && Date.now() < cached.expiry) {
    return cached.villages;
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pin}`,
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return "";
    }

    const result = await response.json();

    if (
      result[0]?.Status !== "Success" ||
      !Array.isArray(result[0]?.PostOffice)
    ) {
      return "";
    }

    // Take the first 3 post office names
    const villages = result[0].PostOffice
      .slice(0, 3)
      .map((office) => office.Name)
      .filter(Boolean)
      .join(", ");

    // Cache successful lookup for 24 hours
    pinCodeCache.set(pin, {
      villages,
      expiry: Date.now() + 24 * 60 * 60 * 1000,
    });

    return villages;
  } catch (error) {
    console.error(`PIN lookup failed for ${pin}:`, error.message);
    return "";
  }
};


// MASTER DATA - SALES
const getSalesMasterData = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = req.query.search?.trim();
    const branchId = req.query.branchId;

    const subSegment = req.query.subSegment;
    const saleBranch = req.query.saleBranch;
    const district = req.query.district;
    const city = req.query.city;
    const village = req.query.village;


    const dateField = req.query.dateField || "saleDate";
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    let dateFilter = {};

    if (!["saleDate", "serviceDate"].includes(dateField)) {
      return res.status(400).json({ message: "Invalid date field" });
    }

    // IST is UTC + 05:30
    if (fromDate) {
      const date = new Date(`${fromDate}T00:00:00.000+05:30`);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid from date" });
      }
      dateFilter.$gte = date;
    }

    if (toDate) {
      const date = new Date(`${toDate}T00:00:00.000+05:30`);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid to date" });
      }
      date.setUTCDate(date.getUTCDate() + 1);
      dateFilter.$lt = date;
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        message: "From date cannot be after To date",
      });
    }

    const match = {};

    // Header filters: District and City
    if (district) {
      match.district = district;
    }

    if (city) {
      match.city = city;
    }

    // Filter by Sales delivery date
    if (dateField === "saleDate" && Object.keys(dateFilter).length) {
      match.deliveryDate = dateFilter;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      match.$or = [
        { chassisNumber: regex },
        { registrationNumber: regex },
        { customerName: regex },
        { modelGroup: regex },
        { mobileNo: regex },
        { city: regex },
        { district: regex },
        { pinCode: regex },
      ];
    }

    // Optional branch filter
    if (branchId) {
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }
      match.branch = new mongoose.Types.ObjectId(branchId);
    }

    const pipeline = [{ $match: match }];

    // Manager access restriction
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
                  $expr: { $eq: ["$chassisNumber", "$$chassis"] },
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

    // Get latest Paid/Free Service before pagination (ALL ROLES)
    pipeline.push({
      $lookup: {
        from: ServiceData.collection.name,
        let: { chassis: "$chassisNumber" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$chassisNumber", "$$chassis"] },
              serviceCategory: { $in: ["Paid Service", "Free Service"] },
              billDate: { $ne: null },
            },
          },
          { $sort: { billDate: -1, _id: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 0,
              serviceCategory: 1,
              billDate: 1,
              dealerLocation: 1,
            },
          },
        ],
        as: "lastPaidFreeService",
      },
    });

    // Filter by latest Paid/Free Service bill date (ALL ROLES)
    if (dateField === "serviceDate" && Object.keys(dateFilter).length) {
      pipeline.push({
        $match: {
          "lastPaidFreeService.0.billDate": dateFilter,
        },
      });
    }

    // Village filter BEFORE pagination
    if (village) {
      // Get all distinct PIN codes from the currently matching records
      const pincodeResults = await SalesData.aggregate([
        ...pipeline,
        {
          $group: {
            _id: "$pinCode",
          },
        },
      ]).allowDiskUse(true);

      const pincodes = [
        ...new Set(
          pincodeResults
            .map((item) => String(item._id || "").trim())
            .filter((pin) => /^\d{6}$/.test(pin))
        ),
      ];

      const matchingPincodes = [];
      const selectedVillage = village.trim().toLowerCase();

      // Fetch PIN Code API results in batches of 10
      for (let i = 0; i < pincodes.length; i += 10) {
        const batch = pincodes.slice(i, i + 10);

        const results = await Promise.all(
          batch.map(async (pin) => ({
            pin,
            villages: await getVillageByPincode(pin),
          }))
        );

        results.forEach(({ pin, villages }) => {
          const villageNames = villages
            .split(",")
            .map((name) => name.trim().toLowerCase());

          if (villageNames.includes(selectedVillage)) {
            matchingPincodes.push(pin);
          }
        });
      }

      // Apply matching PIN codes before pagination
      pipeline.push({
        $match: {
          pinCode: {
            $in: matchingPincodes,
          },
        },
      });
    }


    pipeline.push(
      // Branch lookup BEFORE pagination
      {
        $lookup: {
          from: Branch.collection.name,
          localField: "branch",
          foreignField: "_id",
          as: "branchDetails",
        },
      },
      {
        $unwind: {
          path: "$branchDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Vehicle Model lookup BEFORE pagination
      {
        $lookup: {
          from: VehicleModel.collection.name,
          let: {
            modelName: {
              $toLower: {
                $trim: {
                  input: { $ifNull: ["$modelGroup", ""] },
                },
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$normalizedModelGroup", "$$modelName"],
                },
              },
            },
            {
              $project: {
                _id: 0,
                segment: 1,
                subSegment: 1,
              },
            },
            { $limit: 1 },
          ],
          as: "modelDetails",
        },
      },

      // Apply Sub Segment filter BEFORE pagination
      ...(subSegment
        ? [
          {
            $match: {
              "modelDetails.subSegment": subSegment,
            },
          },
        ]
        : []),

      // Apply Sales Branch filter BEFORE pagination
      ...(saleBranch
        ? [
          {
            $match: {
              $expr: {
                $eq: [
                  {
                    $ifNull: ["$branchDetails.branchName", "$saleBranch"],
                  },
                  saleBranch,
                ],
              },
            },
          },
        ]
        : []),

      { $sort: { deliveryDate: -1, _id: -1 } },

      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },

            {
              $project: {
                _id: 1,
                chassisNumber: 1,
                registrationNumber: 1,
                saleDate: "$deliveryDate",
                saleBranch: {
                  $ifNull: ["$branchDetails.branchName", "$saleBranch"],
                },
                model: "$modelGroup",
                segment: {
                  $ifNull: [
                    { $arrayElemAt: ["$modelDetails.subSegment", 0] },
                    null,
                  ],
                },
                subSegment: {
                  $ifNull: [
                    { $arrayElemAt: ["$modelDetails.subSegment", 0] },
                    null,
                  ],
                },
                customerName: 1,
                phoneNumber: "$mobileNo",
                customerLocation: {
                  district: "$district",
                  city: "$city",
                  pincode: "$pinCode",
                  village: null,
                },
                lastPaidFreeService: {
                  $ifNull: [
                    { $arrayElemAt: ["$lastPaidFreeService.serviceCategory", 0] },
                    null,
                  ],
                },
                lastPaidFreeServiceDate: {
                  $ifNull: [
                    { $arrayElemAt: ["$lastPaidFreeService.billDate", 0] },
                    null,
                  ],
                },
                dealerLocation: {
                  $ifNull: [
                    { $arrayElemAt: ["$lastPaidFreeService.dealerLocation", 0] },
                    null,
                  ],
                },
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      }
    );

    const [result] = await SalesData.aggregate(pipeline).allowDiskUse(true);
    const total = result.total[0]?.count || 0;
    const rawData = result.data || [];

    // OPTIMIZED: Bulk fetch villages for the current page instead of N+1 queries
    const pincodes = [...new Set(rawData.map((r) => r.customerLocation?.pincode).filter(Boolean))];
    const villageMap = new Map();

    if (pincodes.length > 0 && typeof getVillageByPincodesBulk === "function") {
      // Assuming a bulk helper exists or can be implemented, fallback to individual if needed
      // const villages = await getVillageByPincodesBulk(pincodes);
      // villages.forEach(v => villageMap.set(v.pincode, v.villageName));
    }

    const enrichedData = await Promise.all(
      rawData.map(async (record) => {
        const pincode = record.customerLocation?.pincode;
        let village = pincode ? villageMap.get(pincode) : null;

        if (!village && pincode) {
          village = await getVillageByPincode(pincode);
        }

        return {
          ...record,
          customerLocation: {
            ...record.customerLocation,
            village: village || null,
          },
        };
      })
    );

    return res.json({
      data: enrichedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get Sales Master Data error:", error);
    return res.status(500).json({
      message: "Failed to fetch Sales Master Data",
      error: error.message,
    });
  }
};

// SALES MASTER FILTER OPTIONS
const getSalesMasterFilterOptions = async (req, res) => {
  try {
    const pipeline = [];

    // Respect manager access restrictions
    if (req.user.role === "manager") {
      const locations = req.user.assignedLocations || [];
      const locationNames = locations.map((location) => location.name);

      if (!locationNames.length) {
        return res.json({
          subSegments: [],
          saleBranches: [],
          districts: [],
          cities: [],
          villages: [],
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

    // Get branch names
    pipeline.push(
      {
        $lookup: {
          from: Branch.collection.name,
          localField: "branch",
          foreignField: "_id",
          as: "branchDetails",
        },
      },
      {
        $unwind: {
          path: "$branchDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Get vehicle sub-segment
      {
        $lookup: {
          from: VehicleModel.collection.name,
          let: {
            modelName: {
              $toLower: {
                $trim: {
                  input: { $ifNull: ["$modelGroup", ""] },
                },
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$normalizedModelGroup", "$$modelName"],
                },
              },
            },
            {
              $project: {
                _id: 0,
                subSegment: 1,
              },
            },
            { $limit: 1 },
          ],
          as: "modelDetails",
        },
      },

      // Collect unique filter values across all accessible records
      {
        $group: {
          _id: null,
          districts: { $addToSet: "$district" },
          cities: { $addToSet: "$city" },
          pincodes: { $addToSet: "$pinCode" },
          saleBranches: {
            $addToSet: {
              $ifNull: ["$branchDetails.branchName", "$saleBranch"],
            },
          },
          subSegments: {
            $addToSet: {
              $arrayElemAt: ["$modelDetails.subSegment", 0],
            },
          },
        },
      }
    );

    const [result] = await SalesData.aggregate(pipeline).allowDiskUse(true);

    const cleanOptions = (values = []) =>
      [...new Set(
        values
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value).trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));

    const subSegments = cleanOptions(result?.subSegments);
    const saleBranches = cleanOptions(result?.saleBranches);
    const districts = cleanOptions(result?.districts);
    const cities = cleanOptions(result?.cities);

    // Convert all unique PIN codes into village options
    const pincodes = [
      ...new Set(
        (result?.pincodes || [])
          .map((pin) => String(pin || "").trim())
          .filter((pin) => /^\d{6}$/.test(pin))
      ),
    ];

    const villageSet = new Set();

    // Fetch PIN-code results in batches of 10
    for (let i = 0; i < pincodes.length; i += 10) {
      const batch = pincodes.slice(i, i + 10);

      const results = await Promise.all(
        batch.map((pin) => getVillageByPincode(pin))
      );

      results.forEach((villageNames) => {
        villageNames
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .forEach((name) => villageSet.add(name));
      });
    }

    const villages = [...villageSet].sort((a, b) =>
      a.localeCompare(b)
    );

    return res.json({
      subSegments,
      saleBranches,
      districts,
      cities,
      villages,
    });
  } catch (error) {
    console.error("Get Sales Master filter options error:", error);

    return res.status(500).json({
      message: "Failed to fetch Sales Master filter options",
      error: error.message,
    });
  }
};


module.exports = {
  getSalesData,
  getServiceData,
  getDmsRetailData,
  getSalesMasterData,
  getSalesMasterFilterOptions,
};
