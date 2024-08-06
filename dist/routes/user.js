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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = require("express");
const zod_1 = require("../zod");
const client_1 = require("@prisma/client");
const statusCode_1 = __importDefault(require("../statusCode"));
const handleErrorResponse_1 = __importDefault(require("../utils/handleErrorResponse"));
const multer_middleware_1 = require("../middleware/multer.middleware");
const cloudinary_1 = require("../utils/cloudinary");
const auth_middleware_1 = require("../middleware/auth.middleware");
const otpHandler_1 = require("../utils/otpHandler");
const sendEmail_1 = require("../utils/sendEmail");
const userIsLoggedIn_middleware_1 = require("../middleware/userIsLoggedIn.middleware");
const userRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY;
const JWT_SECRET_KEY_USER = process.env.JWT_SECRET_KEY_USER;
userRouter.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error } = zod_1.user_signupSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error.message
        });
    }
    try {
        const user = yield prisma.user.findUnique({
            where: {
                email: body.email
            }
        });
        if (user) {
            return res.status(statusCode_1.default.CONFLICT).json({
                success: false,
                message: "User already exists"
            });
        }
        const newUser = yield prisma.user.create({
            data: {
                full_name: body.full_name,
                email: body.email
            }
        });
        const code = (0, otpHandler_1.generateAlphanumericOTP)(6);
        yield (0, otpHandler_1.generateOrUpdateOTP)(otpHandler_1.typeProp.USER, newUser.user_id, code);
        const html = `  <h1>OTP Authentification</h1>
                        <p>Hi ${newUser.full_name}</p>
                        <p>Please enter the following verification code to access your Twilio Account</p>
                        <h4>${code}</h4>`;
        const emailData = {
            to: newUser.email,
            subject: "Triumph Lights Verification Code",
            message: `Hi, ${newUser.full_name} Please Enter the following Verification code to login into your account.  Code : ${code}`,
            html: html
        };
        yield (0, sendEmail_1.sendEmail)(emailData);
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: `User Created and OTP sent to ${newUser.email}`,
            user: newUser
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
userRouter.post('/signin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error } = zod_1.user_signinSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error.message
        });
    }
    try {
        const userExist = yield prisma.user.findUnique({
            where: {
                email: body.email
            }
        });
        if (!userExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "User doesn't exist"
            });
        }
        const code = (0, otpHandler_1.generateAlphanumericOTP)(6);
        yield (0, otpHandler_1.generateOrUpdateOTP)(otpHandler_1.typeProp.USER, userExist.user_id, code);
        const html = `  <h1>OTP Authentification</h1>
                        <p>Hi ${userExist.full_name}</p>
                        <p>Please enter the following verification code to access your Twilio Account</p>
                        <h4>${code}</h4>`;
        const emailData = {
            to: userExist.email,
            subject: "Triumph Lights Verification Code",
            message: `Hi, ${userExist.full_name} Please Enter the following Verification code to login into your account.  Code : ${code}`,
            html: html
        };
        yield (0, sendEmail_1.sendEmail)(emailData);
        return res.status(statusCode_1.default.OK).json({
            success: true,
            user: userExist
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
userRouter.post('/otp-verification/:user_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const user_id = req.params.user_id;
    const { success, error } = zod_1.otpVerificationSchema.safeParse(body);
    const now = new Date();
    console.log(body);
    console.log(req.params.user_id);
    console.log(user_id);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error.message
        });
    }
    try {
        const userExist = yield prisma.user.findUnique({
            where: {
                user_id: user_id
            },
            select: {
                user_id: true,
                otp: true
            }
        });
        if (!userExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "User Not Found"
            });
        }
        if (!userExist.otp) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Otp is null in the database"
            });
        }
        if (userExist.otp.expires_at < now) {
            return res.status(statusCode_1.default.EXPIRED).json({
                success: false,
                message: "OTP is Expired"
            });
        }
        const response = yield bcryptjs_1.default.compare(body.code, userExist.otp.code);
        let token;
        if (response) {
            token = jsonwebtoken_1.default.sign({ user_id: userExist.user_id }, JWT_SECRET_KEY_USER);
        }
        else {
            return res.status(statusCode_1.default.UNAUTHORIZED).json({
                success: false,
                message: "Invalid OTP"
            });
        }
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
// Update behaviour when user is logged in
userRouter.post('/create/cart', userIsLoggedIn_middleware_1.userIsLoggedIn, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user_id;
    try {
        const newCart = yield prisma.cart.create({
            data: {
                user_id: user_id !== null && user_id !== void 0 ? user_id : null
            }
        });
        const cartToken = jsonwebtoken_1.default.sign({ cart_id: newCart.cart_id }, CART_JWT_SECRET_KEY);
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Cart created Successfully",
            cartToken: cartToken
        });
    }
    catch (error) {
        console.error('Error creating cart:', error);
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
// Update behaviour when user is logged in
userRouter.post('/addToCart/:product_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const product_id = req.params.product_id;
    const cartToken = req.headers['cart-token'];
    try {
        let decoded;
        if (cartToken) {
            decoded = jsonwebtoken_1.default.verify(cartToken, CART_JWT_SECRET_KEY);
        }
        else {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Cart Token is not given"
            });
        }
        const productExist = yield prisma.product.findUnique({
            where: {
                product_id: product_id
            }
        });
        if (!productExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: true,
                message: "Product Not Found"
            });
        }
        const cartExist = yield prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id
            }
        });
        if (!cartExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found"
            });
        }
        const cartItem = yield prisma.cartItem.findUnique({
            where: {
                cart_id_product_id: {
                    cart_id: decoded.cart_id,
                    product_id: product_id
                }
            }
        });
        if (cartItem) {
            yield prisma.cartItem.update({
                where: {
                    cart_id_product_id: {
                        cart_id: decoded.cart_id,
                        product_id: product_id
                    }
                },
                data: {
                    quantity: cartItem.quantity + 1
                }
            });
        }
        else {
            yield prisma.cartItem.create({
                data: {
                    product_id: product_id,
                    cart_id: decoded.cart_id,
                    quantity: req.body.quantity || 1
                }
            });
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Added to Cart Successfully"
        });
    }
    catch (error) {
        console.log(error);
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
// Update behaviour when user is logged in
userRouter.get("/cart", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cartToken = req.headers['cart-token'];
    let decoded;
    if (cartToken) {
        decoded = jsonwebtoken_1.default.verify(cartToken, CART_JWT_SECRET_KEY);
    }
    else {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Cart Token is not given"
        });
    }
    try {
        const cart = yield prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id
            }, select: {
                cart_id: true,
                user_id: true,
                cartItems: true
            }
        });
        if (!cart) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found"
            });
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            cart: cart
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
userRouter.post('/create/review/:product_id', auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const user_id = req.user_id;
    if (!user_id) {
        return res.status(statusCode_1.default.UNAUTHORIZED).json({
            success: false,
            message: "User not authenticated"
        });
    }
    const { success, error } = zod_1.reviewSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: error.message
        });
    }
    try {
        const productExist = yield prisma.product.findUnique({
            where: {
                product_id: req.params.product_id
            }
        });
        if (!productExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Product Not Found"
            });
        }
        const review = yield prisma.review.create({
            data: {
                user_id: user_id,
                product_id: req.params.product_id,
                rating: body.rating,
                review_text: body.review_text
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Your review added",
            review: review
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
userRouter.post("/create/review/images/:review_id", auth_middleware_1.userAuthMiddleware, multer_middleware_1.upload.array("review", 4), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const images = req.files;
    if (!images) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "No files Uploaded",
        });
    }
    try {
        const review_id = req.params.review_id;
        const reviewExist = yield prisma.review.findUnique({
            where: {
                review_id: review_id,
            },
        });
        if (!reviewExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Review Not Found",
            });
        }
        const uploadPromises = images.map((image) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const response = yield (0, cloudinary_1.uploadOnCloudinary)(image.path);
                yield prisma.reviewImage.create({
                    data: {
                        url: response.url,
                        url_public_id: response.public_id,
                        review_id: review_id,
                    },
                });
                return response; // Return response after handling it
            }
            catch (error) {
                console.error("Error uploading image:", error);
                throw new Error("Error uploading image to Cloudinary");
            }
        }));
        const allResponses = yield Promise.all(uploadPromises);
        res
            .status(200)
            .json({ message: "Files uploaded successfully", response: allResponses });
    }
    catch (error) {
        console.error("Error uploading image:", error);
        return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
            error: error
        });
    }
}));
userRouter.delete('/delete/review/:review_id', auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const review_id = req.params.review_id;
    try {
        const review = yield prisma.review.findUnique({
            where: {
                review_id: review_id
            },
            select: {
                review_id: true,
                reviewImages: true
            }
        });
        if (!review) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Review Not Found"
            });
        }
        review.reviewImages.map((image) => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, cloudinary_1.deleteFromCloudinary)(image.image_id);
        }));
        yield prisma.reviewImage.deleteMany({
            where: {
                review_id: review_id
            }
        });
        yield prisma.review.delete({
            where: {
                review_id: review_id
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Review Deleted"
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
exports.default = userRouter;
