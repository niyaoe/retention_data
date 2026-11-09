const DealerLocation = require("../models/DealerLocation");
const User = require("../models/User");

// Create Dealer Location
const createLocation = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message: "Location name and code are required",
      });
    }

    const normalizedName = name.trim();
    const normalizedCode = code.trim().toUpperCase();

    const existing = await DealerLocation.findOne({
      $or: [
        { name: { $regex: `^${normalizedName}$`, $options: "i" } },
        { code: normalizedCode },
      ],
    });

    if (existing) {
      return res.status(400).json({
        message: "Location name or code already exists",
      });
    }

    const location = await DealerLocation.create({
      name: normalizedName,
      code: normalizedCode,
    });

    res.status(201).json({
      message: "Dealer location created successfully",
      location,
    });
  } catch (error) {
    console.error("Create location error:", error);

    res.status(500).json({
      message: "Failed to create dealer location",
    });
  }
};

// Get All Locations
const getLocations = async (req, res) => {
  try {
    const locations = await DealerLocation.find().sort({
      name: 1,
    });

    res.json({
      count: locations.length,
      locations,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch locations",
    });
  }
};

// Update Location
const updateLocation = async (req, res) => {
  try {
    const { name, code } = req.body;

    const location = await DealerLocation.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        message: "Dealer location not found",
      });
    }

    const normalizedName =
      name !== undefined ? name.trim() : location.name;

    const normalizedCode =
      code !== undefined ? code.trim().toUpperCase() : location.code;

    const duplicate = await DealerLocation.findOne({
      _id: { $ne: location._id },
      $or: [
        { name: { $regex: `^${normalizedName}$`, $options: "i" } },
        { code: normalizedCode },
      ],
    });

    if (duplicate) {
      return res.status(400).json({
        message: "Another location already uses this name or code",
      });
    }

    location.name = normalizedName;
    location.code = normalizedCode;

    await location.save();

    res.json({
      message: "Dealer location updated successfully",
      location,
    });
  } catch (error) {
    console.error("Update location error:", error);

    res.status(500).json({
      message: "Failed to update dealer location",
    });
  }
};

// Activate / Deactivate Location
const toggleLocationStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const location = await DealerLocation.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        message: "Dealer location not found",
      });
    }

    location.isActive = isActive;

    await location.save();

    if (!isActive) {
      await User.updateMany(
        { role: "manager" },
        { $pull: { assignedLocations: location._id } }
      );
    }

    res.json({
      message: `Dealer location ${isActive ? "activated" : "deactivated"} successfully`,
      location,
    });
  } catch (error) {
    console.error("Location status error:", error);

    res.status(500).json({
      message: "Failed to update location status",
    });
  }
};

module.exports = {
  createLocation,
  getLocations,
  updateLocation,
  toggleLocationStatus,
};