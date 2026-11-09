
const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    district: {
      type: String,
      trim: true,
      default: "",
    },

    branchName: {
      type: String,
      required: true,
      trim: true,
    },

    locationCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

    dmsName: {
      type: String,
      trim: true,
      default: "",
    },

    forMDReport: {
      type: String,
      trim: true,
      default: "",
    },

    branchShort: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    slC: {
      type: String,
      trim: true,
      default: "",
    },

    slB: {
      type: String,
      trim: true,
      default: "",
    },

    aopDistrict: {
      type: String,
      trim: true,
      default: "",
    },

    bsZone: {
      type: String,
      trim: true,
      default: "",
    },

    dCode: {
      type: String,
      trim: true,
      default: "",
    },

    preH2: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Branch", branchSchema);
