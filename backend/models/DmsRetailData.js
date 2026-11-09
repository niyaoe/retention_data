const mongoose = require("mongoose");

const dmsRetailDataSchema = new mongoose.Schema(
  {
    chassisNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // All 154 original CSV columns
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Parsed invoice date used for latest-record comparison
    invoiceDateTime: {
      type: Date,
      required: true,
      index: true,
    },

    // Frequently used fields retained for existing API compatibility
    modelGroup: String,
    pin: String,
    emailId: String,
    phoneNo: String,
    dealerCode: String,
    lesseeMobileNumber: String,
  },
  { timestamps: true }
);

dmsRetailDataSchema.index({ dealerCode: 1 });

module.exports = mongoose.model(
  "DmsRetailData",
  dmsRetailDataSchema
);