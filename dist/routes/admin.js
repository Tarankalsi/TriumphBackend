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
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const zod_1 = require("../zod");
const statusCode_1 = __importDefault(require("../statusCode"));
const handleErrorResponse_1 = __importDefault(require("../utils/handleErrorResponse"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const checkAdminsExist_middleware_1 = require("../middleware/checkAdminsExist.middleware");
const sendEmail_1 = require("../utils/sendEmail");
const otpHandler_1 = require("../utils/otpHandler");
const adminRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
//Forgot Password Route Pending 
//Email Verification is also Pending
//Email Validity is Pending
const JWT_SECRET_KEY_ADMIN = process.env.JWT_SECRET_KEY_ADMIN;
if (!JWT_SECRET_KEY_ADMIN) {
    throw new Error('JWT_SECRET_KEY_ADMIN must be defined in the environment variables');
}
adminRouter.post('/signup', checkAdminsExist_middleware_1.checkAdminsExist, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error } = zod_1.admin_signupSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Invalid Inputs",
            errors: error === null || error === void 0 ? void 0 : error.issues // Provide validation error details
        });
    }
    try {
        const areAdminsPresent = yield prisma.admin.count();
        if (!areAdminsPresent && process.env.ALLOW_INITIAL_ADMIN_CREATION === 'true') {
            const salt = yield bcryptjs_1.default.genSalt(10);
            const secPass = yield bcryptjs_1.default.hash(body.password, salt);
            const initialAdmin = yield prisma.admin.create({
                data: {
                    full_name: body.full_name,
                    email: body.email,
                    password: secPass,
                    role: "admin"
                }
            });
            return res.status(statusCode_1.default.CREATED).json({
                success: true,
                message: "Admin Created Successfully",
                data: initialAdmin
            });
        }
        if (areAdminsPresent) {
            console.log(req.admin_id);
            if (!req.admin_id) {
                return res.status(statusCode_1.default.UNAUTHORIZED).json({
                    success: false,
                    message: "You're not allowed to create new admin , admin_id is undefined"
                });
            }
            const admin = yield prisma.admin.findUnique({
                where: {
                    admin_id: req.admin_id
                }
            });
            if (admin && admin.role === "admin") {
                const generatedPassword = (0, otpHandler_1.generateAlphanumericOTP)(8);
                const salt = yield bcryptjs_1.default.genSalt(10);
                const secPass = yield bcryptjs_1.default.hash(generatedPassword, salt);
                const newAdmin = yield prisma.admin.create({
                    data: {
                        full_name: body.full_name,
                        email: body.email,
                        password: secPass,
                        role: body.role || "moderator"
                    }
                });
                const html = `
                <h1>Triumph Lights Admin Credentials</h1>
                <p>Dear ${newAdmin.full_name}</p>
                <p>You'r the new ${newAdmin.role} of Triumph Lights. Here You Login Credentials</p>
                <li><strong>Email: </strong> ${newAdmin.email}</li>
                <li><strong>Password: </strong> ${generatedPassword}</li>
                </hr>
                <p>Feel free to customize as needed</p>
                `;
                const emailData = {
                    to: newAdmin.email,
                    subject: "Welcome! Your Admin Account Details",
                    message: "Your admin account Credentials",
                    html: html
                };
                const response = yield (0, sendEmail_1.sendEmail)(emailData);
                return res.status(statusCode_1.default.OK).json({
                    success: true,
                    message: `New Admin Created`
                });
            }
            else {
                return res.status(statusCode_1.default.UNAUTHORIZED).json({
                    success: false,
                    message: "You're not allowed to create new admin"
                });
            }
        }
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
adminRouter.get('/adminId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error } = zod_1.a_change_pass_1.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Invalid Inputs",
            errors: error === null || error === void 0 ? void 0 : error.issues // Provide validation error details
        });
    }
    try {
        const admin = yield prisma.admin.findUnique({
            where: {
                email: body.email
            },
            select: {
                admin_id: true
            }
        });
        if (!admin) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Admin doesn't exist"
            });
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            admin_id: admin.admin_id
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
adminRouter.post('/change-password/:admin_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error } = zod_1.a_change_pass_2.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Invalid Inputs",
            errors: error === null || error === void 0 ? void 0 : error.issues // Provide validation error details
        });
    }
    try {
        const admin = yield prisma.admin.findUnique({
            where: {
                admin_id: req.params.admin_id
            }
        });
        if (!admin) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Admin Not Found"
            });
        }
        const response = yield bcryptjs_1.default.compare(body.oldPassword, admin.password);
        if (!response) {
            return res.status(statusCode_1.default.UNAUTHORIZED).json({
                success: false,
                message: "Incorrect password"
            });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const secPass = yield bcryptjs_1.default.hash(body.newPassword, salt);
        yield prisma.admin.update({
            where: {
                admin_id: admin.admin_id
            },
            data: {
                password: secPass
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Password changed successfully"
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
adminRouter.post('/signin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success } = zod_1.admin_signinSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "zod validation error"
        });
    }
    try {
        const admin = yield prisma.admin.findUnique({
            where: {
                email: body.email
            }
        });
        if (!admin) {
            return res.status(statusCode_1.default.UNAUTHORIZED).json({
                success: false,
                message: "Incorrect Credentials"
            });
        }
        const password_compare = yield bcryptjs_1.default.compare(body.password, admin.password);
        if (!password_compare) {
            return res.status(statusCode_1.default.UNAUTHORIZED).json({
                success: false,
                message: "Incorrect Credentials"
            });
        }
        const code = (0, otpHandler_1.generateAlphanumericOTP)(6);
        yield (0, otpHandler_1.generateOrUpdateOTP)(otpHandler_1.typeProp.ADMIN, admin.admin_id, code);
        const html = `  <h1>OTP Authentification</h1>
                        <p>Hi ${admin.full_name}</p>
                        <p>Please enter the following verification code to access BackPanel of TriumphLights</p>
                        <h4>${code}</h4>`;
        const emailData = {
            to: admin.email,
            subject: "Triumph Lights Verification Code",
            message: `Hi, ${admin.full_name} Please Enter the following Verification code to login into your account.  Code : ${code}`,
            html: html
        };
        console.log(emailData);
        const respone = yield (0, sendEmail_1.sendEmail)(emailData);
        console.log(respone);
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: `OTP sent to ${admin.email}`,
            admin_id: admin.admin_id
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
adminRouter.post('/otp-verification/:admin_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const admin_id = req.params.admin_id;
    const { success, error } = zod_1.otpVerificationSchema.safeParse(body);
    const now = new Date();
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error.message
        });
    }
    try {
        const adminExist = yield prisma.admin.findUnique({
            where: {
                admin_id: admin_id
            },
            select: {
                admin_id: true,
                otp: true
            }
        });
        if (!adminExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "User Not Found"
            });
        }
        if (!adminExist.otp) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Otp is null in the database"
            });
        }
        if (adminExist.otp.expires_at < now) {
            return res.status(statusCode_1.default.EXPIRED).json({
                success: false,
                message: "OTP is Expired"
            });
        }
        const response = yield bcryptjs_1.default.compare(body.code, adminExist.otp.code);
        let token;
        if (response) {
            token = jsonwebtoken_1.default.sign({ user_id: adminExist.admin_id }, JWT_SECRET_KEY_ADMIN);
        }
        else {
            return res.status(statusCode_1.default.UNAUTHORIZED).json({
                success: false,
                message: "Invalid OTP"
            });
        }
        res.cookie('token', token, {
            httpOnly: true, // helps prevent XSS attacks
            secure: process.env.NODE_ENV === 'production', // send cookie over HTTPS only in production
            sameSite: 'strict', // helps prevent CSRF attacks
            maxAge: 24 * 60 * 60 * 1000 // cookie expiration set to 1 day
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Authentification Completed",
            token: token
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
adminRouter.post('/sendEmail', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const details = {
        to: "tarankhalsa3412@gmail.com",
        subject: "Testing Purpose",
        message: "Hi My first Email",
        html: `<p>Hello Taranjit Singh</p>`
    };
    try {
        const email = (0, sendEmail_1.sendEmail)(details);
        console.log(email);
        return res.json({
            success: true,
            message: "Email Sent"
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
exports.default = adminRouter;
