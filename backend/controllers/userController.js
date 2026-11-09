const User = require("../models/User");
const DealerLocation = require("../models/DealerLocation");

// Create Manager
const createManager = async (req, res) => {
  try {
    const { name, username, password, assignedLocations } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        message: "Name, username and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    const locationIds = assignedLocations || [];

    if (!Array.isArray(locationIds)) {
      return res.status(400).json({
        message: "Assigned locations must be an array",
      });
    }

    const uniqueIds = [...new Set(locationIds.map(String))];

    const locations = await DealerLocation.find({
      _id: { $in: uniqueIds },
      isActive: true,
    });

    if (locations.length !== uniqueIds.length) {
      return res.status(400).json({
        message: "One or more assigned locations are invalid or inactive",
      });
    }

    const manager = await User.create({
      name,
      username: username.toLowerCase().trim(),
      password,
      role: "manager",
      assignedLocations: uniqueIds,
    });

    const result = await User.findById(manager._id)
      .populate("assignedLocations", "name code");

    res.status(201).json({
      message: "Manager created successfully",
      manager: result,
    });
  } catch (error) {
    console.error("Create manager error:", error);

    res.status(500).json({
      message: "Failed to create manager",
    });
  }
};

// Get All Managers
const getManagers = async (req, res) => {
  try {
    const managers = await User.find({ role: "manager" })
      .select("-password")
      .populate("assignedLocations", "name code")
      .sort({ createdAt: -1 });

    res.json({
      count: managers.length,
      managers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch managers",
    });
  }
};

// Update Manager
const updateManager = async (req, res) => {
  try {
    const { name, assignedLocations, isActive } = req.body;

    const manager = await User.findOne({
      _id: req.params.id,
      role: "manager",
    });

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found",
      });
    }

    if (name !== undefined) {
      manager.name = name;
    }

    if (assignedLocations !== undefined) {
      if (!Array.isArray(assignedLocations)) {
        return res.status(400).json({
          message: "Assigned locations must be an array",
        });
      }

      const uniqueIds = [...new Set(assignedLocations.map(String))];

      const locations = await DealerLocation.find({
        _id: { $in: uniqueIds },
        isActive: true,
      });

      if (locations.length !== uniqueIds.length) {
        return res.status(400).json({
          message: "One or more assigned locations are invalid or inactive",
        });
      }

      manager.assignedLocations = uniqueIds;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be true or false",
        });
      }

      manager.isActive = isActive;
    }

    await manager.save();

    const result = await User.findById(manager._id)
      .populate("assignedLocations", "name code");

    res.json({
      message: "Manager updated successfully",
      manager: result,
    });
  } catch (error) {
    console.error("Update manager error:", error);

    res.status(500).json({
      message: "Failed to update manager",
    });
  }
};

// Reset Manager Password
const resetManagerPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "A password of at least 6 characters is required",
      });
    }

    const manager = await User.findOne({
      _id: req.params.id,
      role: "manager",
    });

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found",
      });
    }

    manager.password = password;

    await manager.save();

    res.json({
      message: "Manager password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      message: "Failed to reset manager password",
    });
  }
};

module.exports = {
  createManager,
  getManagers,
  updateManager,
  resetManagerPassword,
};