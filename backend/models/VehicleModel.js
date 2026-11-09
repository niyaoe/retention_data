
const mongoose = require("mongoose");

const vehicleModelSchema = new mongoose.Schema(
  {
    modelGroup: {
      type: String,
      required: true,
      trim: true,
    },

    segment: {
      type: String,
      required: true,
      trim: true,
    },

    subSegment: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedModelGroup: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleModel", vehicleModelSchema);
