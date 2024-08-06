"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthMiddleware = exports.userAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const statusCode_1 = __importDefault(require("../statusCode"));
const JWT_SECRET_KEY_USER = process.env.JWT_SECRET_KEY_USER;
const JWT_SECRET_KEY_ADMIN = process.env.JWT_SECRET_KEY_ADMIN;
if (!JWT_SECRET_KEY_USER || !JWT_SECRET_KEY_ADMIN) {
    throw new Error(' jwt secret keys must be defined in the environment variables');
}
const authMiddleware = (userType) => (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(statusCode_1.default.FORBIDDEN).json({
            success: false,
            message: "Error: Missing or invalid Authorization Token"
        });
    }
    const authToken = authHeader.split(' ')[1];
    try {
        let secretKey;
        if (userType === "admin") {
            secretKey = JWT_SECRET_KEY_ADMIN;
        }
        else if (userType === "user") {
            secretKey = JWT_SECRET_KEY_USER;
        }
        else {
            return res.status(statusCode_1.default.FORBIDDEN).json({
                success: false,
                message: "Error : Invalid User Type"
            });
        }
        const decoded = jsonwebtoken_1.default.verify(authToken, secretKey);
        console.log(decoded);
        if (userType === 'admin') {
            console.log(decoded.admin_id + "from middleware");
            req.admin_id = decoded.admin_id;
        }
        else {
            req.user_id = decoded.user_id;
        }
        next();
    }
    catch (error) {
        console.error(error);
        res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Error in Authorization  Middleware"
        });
    }
};
exports.userAuthMiddleware = authMiddleware('user');
exports.adminAuthMiddleware = authMiddleware('admin');
