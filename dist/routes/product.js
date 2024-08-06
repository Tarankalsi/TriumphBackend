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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = require("express");
const zod_1 = require("../zod");
const client_1 = require("@prisma/client");
const statusCode_1 = __importDefault(require("../statusCode"));
const multer_middleware_1 = require("../middleware/multer.middleware");
const cloudinary_1 = require("../utils/cloudinary");
const handleErrorResponse_1 = __importDefault(require("../utils/handleErrorResponse"));
const productRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY;
productRouter.post("/create/category", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success } = zod_1.categorySchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod Validation Error",
        });
    }
    try {
        const category = yield prisma.category.create({
            data: {
                name: body.name,
            },
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Category Created Successfully",
            category: category,
        });
    }
    catch (error) {
        return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
            error: error
        });
    }
}));
productRouter.post("/create/product/:category_id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success } = zod_1.productSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "zod validation Error",
        });
    }
    try {
        // Check if the category exists
        const categoryId = req.params.category_id;
        const category = yield prisma.category.findUnique({
            where: { category_id: categoryId },
        });
        if (!category) {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Category not found",
                categoryId: categoryId,
            });
        }
        // Create the product
        const product = yield prisma.product.create({
            data: {
                name: body.name,
                description: body.description,
                price: body.price,
                availablity: body.availablity,
                SKU: body.SKU,
                color: body.color,
                category_id: req.params.category_id,
            },
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Product Created Successfully",
            product: product,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
            error: error
        });
    }
}));
productRouter.post("/create/gallery/:product_id", multer_middleware_1.upload.array("gallery", 8), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const images = req.files;
    if (!images) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "No files Uploaded",
        });
    }
    try {
        const productId = req.params.product_id;
        const productExist = yield prisma.product.findUnique({
            where: {
                product_id: productId,
            },
        });
        if (!productExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Product Not Found",
            });
        }
        const uploadPromises = images.map((image) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const response = yield (0, cloudinary_1.uploadOnCloudinary)(image.path);
                yield prisma.productImage.create({
                    data: {
                        url: response.url,
                        url_public_id: response.public_id,
                        product_id: productId,
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
productRouter.post('/update/product/:product_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success } = zod_1.pdUpdateSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "zod validation error"
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
        const product = yield prisma.product.update({
            where: {
                product_id: req.params.product_id
            },
            data: body
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Product Updated Successfully",
            product: product
        });
    }
    catch (error) {
        return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
            error: error
        });
    }
}));
productRouter.delete('/delete/gallery/:image_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const imageId = req.params.image_id;
        const imageExist = yield prisma.productImage.findUnique({
            where: {
                image_id: imageId
            }
        });
        if (!imageExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Image Not Found",
            });
        }
        const response = yield (0, cloudinary_1.deleteFromCloudinary)(imageExist.url_public_id);
        yield prisma.productImage.delete({
            where: {
                image_id: imageId
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Deleted Successfully",
            response: response
        });
    }
    catch (error) {
        return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
            error: error
        });
    }
}));
productRouter.get("/category/:category_id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryId = req.params.category_id;
    try {
        const categoryExist = yield prisma.category.findUnique({
            where: {
                category_id: categoryId
            }
        });
        if (!categoryExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Category Not Found",
            });
        }
        const products = yield prisma.product.findMany({
            where: {
                category_id: categoryId
            },
            select: {
                product_id: true,
                name: true,
                description: true,
                price: true,
                discount_price: true,
                availablity: true,
                SKU: true,
                color: true,
                category_id: true,
                reviews: true,
                images: true,
                CartItem: true
            }
        });
        if (products.length === 0) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Products Not Found"
            });
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            products: products
        });
    }
    catch (error) {
        return (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
        // return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        //   success : false,
        //   message : "Internal Server Error"
        // })
    }
}));
productRouter.get("/categories", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma.category.findMany();
        if (categories.length === 0 || !categories) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Categories Not Found"
            });
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            categories: categories
        });
    }
    catch (error) {
        return (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
        // return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
        //   success : false,
        //   message : "Internal Server Error"
        // })
    }
}));
productRouter.get("/:product_id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const productId = req.params.product_id;
    try {
        const product = yield prisma.product.findUnique({
            where: {
                product_id: productId
            },
            select: {
                product_id: true,
                name: true,
                description: true,
                price: true,
                discount_price: true,
                availablity: true,
                SKU: true,
                color: true,
                category_id: true,
                reviews: true,
                images: true
            }
        });
    }
    catch (error) {
        return (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
// Update behaviour when user is logged in
productRouter.post('/create/cart', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newCart = yield prisma.cart.create({
            data: {
                user_id: req.body.user_id || null
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
        console.log(error);
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
// Update behaviour when user is logged in
productRouter.post('/addToCart/:product_id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
productRouter.get("/cart", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            }
        });
        if (!cart) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Cart Not Found"
            });
        }
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
exports.default = productRouter;
