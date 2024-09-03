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
const auth_middleware_1 = require("../middleware/auth.middleware");
const otpHandler_1 = require("../utils/otpHandler");
const sendEmail_1 = require("../utils/sendEmail");
const userIsLoggedIn_middleware_1 = require("../middleware/userIsLoggedIn.middleware");
const s3_1 = require("../utils/s3");
const calculationHelper_1 = require("../utils/calculationHelper");
const userRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY;
const JWT_SECRET_KEY_USER = process.env.JWT_SECRET_KEY_USER;
const allowedFormats = ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp'];
const contentTypeToExtension = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/webp': 'webp',
};
userRouter.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error } = zod_1.user_signupSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error === null || error === void 0 ? void 0 : error.issues
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
            error: error === null || error === void 0 ? void 0 : error.issues
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
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error === null || error === void 0 ? void 0 : error.issues
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
userRouter.get('/data', auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user_id;
    if (!user_id) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }
    try {
        const user = yield prisma.user.findUnique({
            where: {
                user_id: user_id
            },
            select: {
                user_id: true,
                full_name: true,
                email: true,
                phone_number: true,
                address: true,
                cart: true
            }
        });
        if (!user) {
            return res.status(statusCode_1.default.OK).json({
                success: false,
                message: "User Not Found"
            });
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            data: user
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
userRouter.post('/add', auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const user_id = req.user_id;
    const { success, error } = zod_1.addressSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error === null || error === void 0 ? void 0 : error.issues
        });
    }
    if (!user_id) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }
    try {
        if (body.street && body.city && body.state && body.country && body.postal_code) {
            const address = yield prisma.address.create({
                data: {
                    user_id: user_id,
                    street: body.street,
                    city: body.city,
                    state: body.state,
                    postal_code: body.postal_code,
                    country: body.country
                }
            });
            return res.status(statusCode_1.default.OK).json({
                success: true,
                message: "Address created successfully",
                address: address
            });
        }
        if (body.phone_number) {
            yield prisma.user.update({
                where: {
                    user_id: user_id
                },
                data: {
                    phone_number: body.phone_number
                }
            });
            return res.status(statusCode_1.default.OK).json({
                success: true,
                message: "User's phone number updated",
                phone_number: body.phone_number
            });
        }
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Something's Wrong"
        });
    }
    catch (error) {
        console.error('Error creating cart:', error);
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
userRouter.delete(`/delete/address/:address_id`, auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const address_id = req.params.address_id;
    const user_id = req.user_id;
    if (!user_id) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }
    try {
        const addressExist = yield prisma.address.findUnique({
            where: {
                address_id: address_id,
                user_id: user_id
            }
        });
        if (!addressExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Address Not Found"
            });
        }
        yield prisma.address.delete({
            where: {
                address_id: address_id,
                user_id: user_id
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Address deleted"
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
// Update behaviour when user is logged in
userRouter.post('/create/cart', userIsLoggedIn_middleware_1.userIsLoggedIn, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user_id;
    const { is_temporary } = req.body;
    const { success, error } = zod_1.createCartSchema.safeParse(req.body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod verification failed",
            error: error === null || error === void 0 ? void 0 : error.issues
        });
    }
    try {
        let newCart;
        if (is_temporary) {
            if (user_id) {
                newCart = yield prisma.cart.create({
                    data: {
                        user_id: user_id,
                        is_temporary: is_temporary
                    }
                });
            }
            else {
                return res.status(statusCode_1.default.OK).json({
                    success: false,
                    message: "Temporary cart only be created if user is exist",
                });
            }
        }
        else {
            newCart = yield prisma.cart.create({
                data: {
                    user_id: user_id !== null && user_id !== void 0 ? user_id : null
                }
            });
        }
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
userRouter.put('/add-user-id/:cart_id', auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user_id;
    const cart_id = req.params.cart_id;
    try {
        const cartExist = yield prisma.cart.findUnique({
            where: {
                cart_id: cart_id
            }
        });
        if (!cartExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found"
            });
        }
        yield prisma.cart.update({
            where: {
                cart_id: cart_id
            },
            data: {
                user_id: user_id
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "User added to cart successfully"
        });
    }
    catch (error) {
        console.log(error);
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
                        product_id: product_id,
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
                    quantity: req.body.quantity,
                    color: req.body.color
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
userRouter.put('/update/cart/quantity/:cart_item_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cart_item_id = req.params.cart_item_id;
    const cartToken = req.headers['cart-token'];
    const { quantity } = req.body;
    try {
        let decoded;
        if (cartToken) {
            decoded = jsonwebtoken_1.default.verify(cartToken, CART_JWT_SECRET_KEY);
        }
        else {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Cart Token is not provided"
            });
        }
        // Validate the quantity
        if (quantity <= 0) {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Quantity must be greater than zero"
            });
        }
        // Check if the cart item exists
        const cartItem = yield prisma.cartItem.findUnique({
            where: {
                cart_item_id: cart_item_id
            }
        });
        if (!cartItem) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Cart Item Not Found"
            });
        }
        // Check if the cart associated with the item exists and matches the user's cart
        const cartExist = yield prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id
            }
        });
        if (!cartExist || cartItem.cart_id !== decoded.cart_id) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found or Cart Item does not belong to this cart"
            });
        }
        const product = yield prisma.product.findUnique({
            where: {
                product_id: cartItem.product_id
            }
        });
        if (!product) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Product Not Found"
            });
        }
        // Check if the new quantity exceeds the product's availability
        if (quantity > product.availability) {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Quantity exceeds stock limit"
            });
        }
        // Update the quantity of the cart item
        yield prisma.cartItem.update({
            where: {
                cart_item_id: cart_item_id
            },
            data: {
                quantity: quantity
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Cart Item Quantity Updated Successfully"
        });
    }
    catch (error) {
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
                cartItems: {
                    include: {
                        product: true, // This will include all fields of the related Product model
                    },
                }
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
userRouter.delete('/delete/cart/tempCartItems', auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield prisma.cartItem.deleteMany({
            where: {
                cart_id: decoded.cart_id
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Temporary Cart Items Deleted Successfully"
        });
    }
    catch (error) {
        console.log(error);
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
            message: error === null || error === void 0 ? void 0 : error.issues
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
userRouter.post("/create/review/images/presigned/:review_id", auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success } = zod_1.signedUrlImageSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "zod validation Error",
        });
    }
    let fileExtension = body.imageName.split('.').pop().toLowerCase();
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
        // Validate the file extension
        if (!allowedFormats.includes(fileExtension)) {
            // If the extension is not provided or invalid, use the content type
            fileExtension = contentTypeToExtension[body.contentType];
            if (!fileExtension) {
                return res.status(statusCode_1.default.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid file format or content type",
                });
            }
        }
        const baseImageName = body.imageName.split('.')[0];
        const date = new Date().getTime();
        const key = `reviewImage/${review_id}/${baseImageName}${date}.${fileExtension}`;
        const url = yield (0, s3_1.uploadImageS3)(key, body.contentType);
        res.status(200).json({
            message: "Files uploaded successfully",
            url: url,
            key: key
        });
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
userRouter.post("/create/review/images/:review_id", auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const review_id = req.params.review_id;
    const { key } = req.body; // This should be the S3 key returned after upload
    try {
        const reviewExist = yield prisma.review.findUnique({
            where: {
                review_id: review_id,
            },
        });
        if (!reviewExist) {
            return res.status(404).json({
                success: false,
                message: 'Review Not Found',
            });
        }
        const url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        yield prisma.reviewImage.create({
            data: {
                review_id: reviewExist.review_id,
                url: url,
                key: key
            }
        });
        res.status(statusCode_1.default.OK).json({
            success: true,
            message: "File metadata stored successfully"
        });
    }
    catch (error) {
        console.error('Error storing image metadata:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
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
            yield (0, s3_1.deleteObjectS3)(image.key);
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
userRouter.post(`/cart/bill/:cart_id`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cart_id = req.params.cart_id;
    const { address_id, pickup_location_name } = req.body;
    try {
        const cart = yield prisma.cart.findUnique({
            where: {
                cart_id: cart_id
            },
            include: {
                cartItems: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (!cart) {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Cart Not Found"
            });
        }
        const address = yield prisma.address.findUnique({
            where: {
                address_id: address_id
            }
        });
        if (!address) {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Address Not Found"
            });
        }
        const bill = yield (0, calculationHelper_1.billing)(cart.cartItems, address, 18, pickup_location_name);
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Bill Generated",
            bill: bill
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
exports.default = userRouter;
