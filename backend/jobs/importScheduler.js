
const cron = require("node-cron");
const mongoose = require("mongoose");

const ImportHistory = require("../models/ImportHistory");

const {
    importSalesFromUrl,
} = require("../controllers/salesImportController");

const {
    importDmsRetailFromUrl,
} = require("../controllers/dmsRetailController");

const {
    importServiceFromUrl,
} = require("../controllers/serviceImportController");

let schedulerStarted = false;
let importRunning = false;

const createMockResponse = () => {
    let statusCode = 200;
    let responseData = null;

    return {
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseData = data;
            return this;
        },
        getResult() {
            return { statusCode, responseData };
        },
    };
};

const runImport = async (source, controller) => {
    const startedAt = new Date();

    const history = await ImportHistory.create({
        source,
        status: "failed",
        trigger: "scheduled",
        startedAt,
    });

    try {
        console.log(`Starting ${source} import...`);

        const mockRes = createMockResponse();
        await controller({}, mockRes);

        const { statusCode, responseData } = mockRes.getResult();

        if (statusCode >= 400) {
            throw new Error(
                responseData?.error ||
                responseData?.message ||
                `${source} import failed`
            );
        }

        const completedAt = new Date();

        await ImportHistory.findByIdAndUpdate(history._id, {
            status: "success",
            completedAt,
            duration: completedAt - startedAt,
            totalRows: responseData?.totalRows || 0,
            insertedCount: responseData?.insertedCount || 0,
            updatedCount:
                responseData?.updatedCount ||
                responseData?.modifiedCount ||
                0,
            unchangedCount: responseData?.unchangedCount || 0,
            skippedCount: responseData?.skippedCount || 0,
            duplicateRows: responseData?.duplicateRows || 0,
            result: responseData,
        });

        console.log(`${source} import completed successfully.`);
    } catch (error) {
        const completedAt = new Date();

        await ImportHistory.findByIdAndUpdate(history._id, {
            status: "failed",
            completedAt,
            duration: completedAt - startedAt,
            errorMessage: error.message,
        });

        console.error(`${source} import failed:`, error.message);
    }
};

const runHourlyImports = async () => {
    if (importRunning) {
        console.log("Previous import is still running. Skipping this cycle.");
        return;
    }

    importRunning = true;

    try {
        console.log("========== HOURLY IMPORT STARTED ==========");

        await runImport("Sales Data", importSalesFromUrl);
        await runImport("Service PHP API", importServiceFromUrl);
        await runImport("DMS Retail", importDmsRetailFromUrl);

        console.log("========== HOURLY IMPORT FINISHED ==========");
    } finally {
        importRunning = false;
    }
};

const startImportScheduler = () => {
    if (schedulerStarted) return;

    const startCron = () => {
        if (schedulerStarted) return;

        schedulerStarted = true;

        cron.schedule("0 * * * *", runHourlyImports, {
            timezone: "Asia/Kolkata",
        });

        console.log("Hourly import scheduler started.");
        console.log("Schedule: Every hour at minute 00");
        console.log("Timezone: Asia/Kolkata");
    };

    if (mongoose.connection.readyState === 1) {
        startCron();
    } else {
        mongoose.connection.once("open", startCron);
    }
};

module.exports = startImportScheduler;