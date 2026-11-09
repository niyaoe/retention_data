
const mongoose = require("mongoose");

const importHistorySchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      enum: ["Sales Data", "Service PHP API", "DMS Retail"],
    },

    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },

    trigger: {
      type: String,
      enum: ["scheduled", "manual"],
      default: "scheduled",
    },

    startedAt: {
      type: Date,
      required: true,
    },

    completedAt: {
      type: Date,
    },

    duration: {
      type: Number,
      default: 0,
    },

    totalRows: {
      type: Number,
      default: 0,
    },

    insertedCount: {
      type: Number,
      default: 0,
    },

    updatedCount: {
      type: Number,
      default: 0,
    },

    unchangedCount: {
      type: Number,
      default: 0,
    },

    skippedCount: {
      type: Number,
      default: 0,
    },

    duplicateRows: {
      type: Number,
      default: 0,
    },

    errorMessage: {
      type: String,
      default: "",
    },

    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImportHistory", importHistorySchema);
