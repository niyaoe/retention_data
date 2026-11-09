
const VehicleModel = require("../models/VehicleModel");

// CREATE VEHICLE MODEL
const createVehicleModel = async (req, res) => {
  try {
    const { modelGroup, segment, subSegment } = req.body;

    if (!modelGroup?.trim() || !segment?.trim() || !subSegment?.trim()) {
      return res.status(400).json({
        message: "Model Group, Segment and Sub Segment are required",
      });
    }

    const normalizedModelGroup = modelGroup.trim().toLowerCase();

    const existing = await VehicleModel.findOne({ normalizedModelGroup });

    if (existing) {
      return res.status(409).json({
        message: "Vehicle model already exists",
      });
    }

    const vehicleModel = await VehicleModel.create({
      modelGroup: modelGroup.trim(),
      segment: segment.trim(),
      subSegment: subSegment.trim(),
      normalizedModelGroup,
    });

    res.status(201).json({
      message: "Vehicle model created successfully",
      vehicleModel,
    });
  } catch (error) {
    console.error("Create vehicle model error:", error);

    res.status(500).json({
      message: "Failed to create vehicle model",
      error: error.message,
    });
  }
};

// GET VEHICLE MODELS
const getVehicleModels = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { modelGroup: regex },
        { segment: regex },
        { subSegment: regex },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));

    const [vehicleModels, totalRecords] = await Promise.all([
      VehicleModel.find(filter)
        .sort({ modelGroup: 1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),

      VehicleModel.countDocuments(filter),
    ]);

    res.status(200).json({
      message: "Vehicle models fetched successfully",
      pagination: {
        currentPage: pageNumber,
        limit: limitNumber,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNumber),
      },
      vehicleModels,
    });
  } catch (error) {
    console.error("Get vehicle models error:", error);

    res.status(500).json({
      message: "Failed to fetch vehicle models",
      error: error.message,
    });
  }
};

// UPDATE VEHICLE MODEL
const updateVehicleModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { modelGroup, segment, subSegment } = req.body;

    if (!modelGroup?.trim() || !segment?.trim() || !subSegment?.trim()) {
      return res.status(400).json({
        message: "Model Group, Segment and Sub Segment are required",
      });
    }

    if (!require("mongoose").isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid vehicle model ID",
      });
    }

    const normalizedModelGroup = modelGroup.trim().toLowerCase();

    const duplicate = await VehicleModel.findOne({
      normalizedModelGroup,
      _id: { $ne: id },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Another vehicle model already uses this Model Group",
      });
    }

    const vehicleModel = await VehicleModel.findByIdAndUpdate(
      id,
      {
        modelGroup: modelGroup.trim(),
        segment: segment.trim(),
        subSegment: subSegment.trim(),
        normalizedModelGroup,
      },
      { new: true, runValidators: true }
    );

    if (!vehicleModel) {
      return res.status(404).json({
        message: "Vehicle model not found",
      });
    }

    res.status(200).json({
      message: "Vehicle model updated successfully",
      vehicleModel,
    });
  } catch (error) {
    console.error("Update vehicle model error:", error);

    res.status(500).json({
      message: "Failed to update vehicle model",
      error: error.message,
    });
  }
};


const mongoose = require("mongoose");

// DELETE VEHICLE MODEL
const deleteVehicleModel = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid vehicle model ID",
      });
    }

    const vehicleModel = await VehicleModel.findByIdAndDelete(id);

    if (!vehicleModel) {
      return res.status(404).json({
        message: "Vehicle model not found",
      });
    }

    res.status(200).json({
      message: "Vehicle model deleted successfully",
      deletedModel: vehicleModel,
    });
  } catch (error) {
    console.error("Delete vehicle model error:", error);

    res.status(500).json({
      message: "Failed to delete vehicle model",
      error: error.message,
    });
  }
};


module.exports = {
  createVehicleModel,
  getVehicleModels,
  updateVehicleModel,
  deleteVehicleModel,
};
