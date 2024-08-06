"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handleErrorResponse = (res, error, statusCode) => {
    return res.status(statusCode).json({
        success: false,
        message: error.message || "Internal Server Error",
    });
};
exports.default = handleErrorResponse;
