
const mongoose = require("mongoose");


const salesDataSchema = new mongoose.Schema(
  {
    deliveryDate: {
      type: Date,
    },

    chassisNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      set: (value) => value?.replace(/\s+/g, "").toUpperCase(),
    },

    // Existing source branch value
    saleBranch: {
      type: String,
      trim: true,
      uppercase: true,
    },

    // Original dealer location code from Sales Excel/CSV
    dealerLocationCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    // Actual Branch Management reference
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },

    registrationNumber: String,
    modelGroup: String,
    customerName: String,
    pinCode: String,
    city: String,
    tehsil: String,
    district: String,
    financier: String,
    segment: String,
    mobileNo: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesData", salesDataSchema);
