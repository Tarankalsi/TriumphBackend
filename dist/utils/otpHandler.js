"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAlphanumericOTP = exports.generateOrUpdateOTP = exports.typeProp = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
var typeProp;
(function (typeProp) {
    typeProp["USER"] = "user";
    typeProp["ADMIN"] = "admin";
})(typeProp || (exports.typeProp = typeProp = {}));
const generateOrUpdateOTP = (type, id, newCode) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 60 * 1000); // # minutes expire time
    try {
        const salt = yield bcryptjs_1.default.genSalt(10);
        const secOtp = yield bcryptjs_1.default.hash(newCode, salt);
        if (type === "user") {
            yield prisma.u_OTP.upsert({
                where: { user_id: id },
                update: {
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                },
                create: {
                    user_id: id,
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                }
            });
        }
        else if (type === "admin") {
            yield prisma.a_OTP.upsert({
                where: { admin_id: id },
                update: {
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                },
                create: {
                    admin_id: id,
                    code: secOtp,
                    created_at: now,
                    expires_at: expiresAt
                }
            });
        }
        return true;
    }
    catch (error) {
        console.error("Error while generating or updating OTP:", error);
        throw new Error("Error while generating or updating OTP");
    }
});
exports.generateOrUpdateOTP = generateOrUpdateOTP;
const generateAlphanumericOTP = (length = 6) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        otp += characters.charAt(randomIndex);
    }
    return otp;
};
exports.generateAlphanumericOTP = generateAlphanumericOTP;
