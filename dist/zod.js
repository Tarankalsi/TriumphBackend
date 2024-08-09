"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signedUrlImageSchema = exports.a_change_pass_2 = exports.a_change_pass_1 = exports.user_signinSchema = exports.otpVerificationSchema = exports.user_signupSchema = exports.reviewSchema = exports.admin_signinSchema = exports.admin_signupSchema = exports.categorySchema = exports.pdUpdateSchema = exports.productSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.productSchema = zod_1.default.object({
    name: zod_1.default.string(),
    description: zod_1.default.string(),
    price: zod_1.default.number(),
    availability: zod_1.default.number(),
    SKU: zod_1.default.string().toUpperCase(),
    color: zod_1.default.string()
});
exports.pdUpdateSchema = zod_1.default.object({
    name: zod_1.default.string().optional(),
    description: zod_1.default.string().optional(),
    price: zod_1.default.number().optional(),
    availability: zod_1.default.number().optional(),
    SKU: zod_1.default.string().toUpperCase().optional(),
    color: zod_1.default.string().optional()
});
exports.categorySchema = zod_1.default.object({
    name: zod_1.default.string(),
    description: zod_1.default.string().optional(),
});
exports.admin_signupSchema = zod_1.default.object({
    full_name: zod_1.default.string(),
    email: zod_1.default.string().email(),
    password: zod_1.default.string().min(6).optional(),
    role: zod_1.default.string().toUpperCase().optional()
});
exports.admin_signinSchema = zod_1.default.object({
    email: zod_1.default.string().email(),
    password: zod_1.default.string().min(6)
});
exports.reviewSchema = zod_1.default.object({
    rating: zod_1.default.number().int().min(0, { message: "Rating must be at least 0" }).max(5, { message: "Rating cannot exceed 5" }),
    review_text: zod_1.default.string(),
});
exports.user_signupSchema = zod_1.default.object({
    full_name: zod_1.default.string(),
    email: zod_1.default.string().email()
});
exports.otpVerificationSchema = zod_1.default.object({
    code: zod_1.default.string().length(6, 'Invalid OTP'),
});
exports.user_signinSchema = zod_1.default.object({
    email: zod_1.default.string().email()
});
exports.a_change_pass_1 = zod_1.default.object({
    email: zod_1.default.string().email()
});
exports.a_change_pass_2 = zod_1.default.object({
    oldPassword: zod_1.default.string().min(6),
    newPassword: zod_1.default.string().min(6)
});
exports.signedUrlImageSchema = zod_1.default.object({
    imageName: zod_1.default.string(),
    contentType: zod_1.default.string()
});
