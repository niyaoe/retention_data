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
    saleBranch: {
      type: String,
      trim: true,
      uppercase: true,
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