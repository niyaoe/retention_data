const mongoose = require("mongoose");

const serviceDataSchema = new mongoose.Schema(
  {
    billDate: Date,

    dealerLocation: {
      type: String,
      required: true,
      trim: true,
    },

    repairOrderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    roDate: Date,

    registrationNumber: String,

    chassisNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      set: (value) => value?.replace(/\s+/g, "").toUpperCase(),
      index: true,
    },

    serviceCategory: String,
    serviceType: String,
    roServiceAdvisor: String,
    productName: String,
  },
  { timestamps: true }
);

// One RO per dealer location
serviceDataSchema.index(
  { dealerLocation: 1, repairOrderNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("ServiceData", serviceDataSchema);