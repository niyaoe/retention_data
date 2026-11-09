
const Branch = require("../models/Branch");

// GET ALL BRANCHES
const getBranches = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 25,
      status = "all",
    } = req.query;

    const currentPage = Math.max(1, Number(page));
    const pageLimit = Math.min(100, Math.max(1, Number(limit)));

    const filter = {};

    if (search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { branchName: regex },
        { locationCode: regex },
        { district: regex },
        { dmsName: regex },
        { branchShort: regex },
      ];
    }

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const [data, total] = await Promise.all([
      Branch.find(filter)
        .sort({ branchName: 1 })
        .skip((currentPage - 1) * pageLimit)
        .limit(pageLimit)
        .lean(),

      Branch.countDocuments(filter),
    ]);

    return res.json({
      data,
      total,
      page: currentPage,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
    });
  } catch (error) {
    console.error("Get branches error:", error);
    return res.status(500).json({
      message: "Failed to fetch branches",
    });
  }
};

// GET SINGLE BRANCH
const getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    return res.json(branch);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch branch",
    });
  }
};

// CREATE BRANCH
const createBranch = async (req, res) => {
  try {
    const {
      district,
      branchName,
      locationCode,
      dmsName,
      forMDReport,
      branchShort,
      slC,
      slB,
      aopDistrict,
      bsZone,
      dCode,
      preH2,
    } = req.body;

    if (!branchName?.trim() || !locationCode?.trim()) {
      return res.status(400).json({
        message: "Branch name and location code are required",
      });
    }

    const branch = await Branch.create({
      district,
      branchName,
      locationCode,
      dmsName,
      forMDReport,
      branchShort,
      slC,
      slB,
      aopDistrict,
      bsZone,
      dCode,
      preH2,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    return res.status(201).json({
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Location code already exists",
      });
    }

    console.error("Create branch error:", error);
    return res.status(500).json({
      message: "Failed to create branch",
    });
  }
};

// UPDATE BRANCH
const updateBranch = async (req, res) => {
  try {
    const {
      district,
      branchName,
      locationCode,
      dmsName,
      forMDReport,
      branchShort,
      slC,
      slB,
      aopDistrict,
      bsZone,
      dCode,
      preH2,
      isActive,
    } = req.body;

    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    const fields = {
      district,
      branchName,
      locationCode,
      dmsName,
      forMDReport,
      branchShort,
      slC,
      slB,
      aopDistrict,
      bsZone,
      dCode,
      preH2,
      isActive,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        branch[key] = value;
      }
    });

    branch.updatedBy = req.user?._id || null;

    await branch.save();

    return res.json({
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Location code already exists",
      });
    }

    console.error("Update branch error:", error);
    return res.status(500).json({
      message: "Failed to update branch",
    });
  }
};

// DELETE BRANCH (SOFT DELETE)
const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedBy: req.user?._id || null,
      },
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    return res.json({
      message: "Branch deactivated successfully",
      data: branch,
    });
  } catch (error) {
    console.error("Delete branch error:", error);
    return res.status(500).json({
      message: "Failed to deactivate branch",
    });
  }
};

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
};
