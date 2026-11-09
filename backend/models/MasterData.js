const mongoose = require("mongoose");

const masterDataSchema = new mongoose.Schema(
  {
    chassisNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      set: (value) => value?.replace(/\s+/g, "").toUpperCase(),
    },

    salesData: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesData",
      default: null,
    },

    serviceRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceData",
      },
    ],

    totalServiceVisits: {
      type: Number,
      default: 0,
    },

    matchingStatus: {
      type: String,
      enum: ["matched", "sales_only", "service_only"],
      default: "sales_only",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MasterData", masterDataSchema);