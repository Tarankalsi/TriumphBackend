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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
const handleErrorResponse_1 = __importDefault(require("../utils/handleErrorResponse"));
const s3_1 = require("../utils/s3");
const auth_middleware_1 = require("../middleware/auth.middleware");
const productRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY;
productRouter.post("/create/category", auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
productRouter.put("/update/category/:category_id", auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category_id } = req.params;
    const body = req.body;
    const { success, error } = zod_1.categorySchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod Validation Error",
            error: error === null || error === void 0 ? void 0 : error.issues
        });
    }
    try {
        yield prisma.category.update({
            where: { category_id },
            data: body,
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Category Updated Successfully",
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
productRouter.delete(`/delete/category/:category_id`, auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category_id } = req.params;
    try {
        const productExist = yield prisma.product.findMany({
            where: { category_id: category_id },
            select: {
                product_id: true,
            },
        });
        if (productExist.length > 0) {
            return res.status(statusCode_1.default.FORBIDDEN).json({
                success: false,
                message: "Cannot delete category with associated products"
            });
        }
        yield prisma.category.delete({ where: { category_id } });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Category Deleted Successfully",
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
productRouter.post("/create/product/:category_id", auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error, data } = zod_1.productSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "zod validation Error",
            error: error.errors || error
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
                message: "Category not found"
            });
        }
        const { colors } = data, productData = __rest(data, ["colors"]);
        // Create the product
        const product = yield prisma.product.create({
            data: Object.assign(Object.assign({}, productData), { category_id: req.params.category_id }),
        });
        if (colors) {
            for (const clr of colors) {
                let existingColor = yield prisma.color.findUnique({
                    where: { hex: clr.hex },
                });
                if (!existingColor) {
                    existingColor = yield prisma.color.create({
                        data: {
                            color_name: clr.color_name,
                            hex: clr.hex,
                        },
                    });
                }
                yield prisma.productColor.create({
                    data: {
                        product_id: product.product_id,
                        color_id: existingColor.color_id,
                    },
                });
            }
        }
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
productRouter.post("/create/gallery/presigned/:product_id", auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success } = zod_1.signedUrlImageSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "zod validation Error",
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
        const date = new Date().getTime();
        const key = `productImage/${productId}/${body.imageName}${date}.jpeg`;
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
productRouter.post('/create/gallery/:product_id', auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const product_id = req.params.product_id;
    const { key } = req.body; // This should be the S3 key returned after upload
    try {
        const productExist = yield prisma.product.findUnique({
            where: {
                product_id: product_id,
            },
        });
        if (!productExist) {
            return res.status(404).json({
                success: false,
                message: 'Product Not Found',
            });
        }
        const url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        yield prisma.productImage.create({
            data: {
                product_id: product_id,
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
productRouter.post('/update/product/:product_id', auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const { success, error, data } = zod_1.pdUpdateSchema.safeParse(body);
    if (!success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Zod validation error",
            error: error.errors || error,
        });
    }
    try {
        const productExist = yield prisma.product.findUnique({
            where: {
                product_id: req.params.product_id,
            },
        });
        if (!productExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Product Not Found",
            });
        }
        // Extract the color field if it exists
        const { colors } = data, productData = __rest(data, ["colors"]);
        // Update the product details (excluding color)
        const product = yield prisma.product.update({
            where: {
                product_id: req.params.product_id,
            },
            data: productData,
        });
        // If color is provided, update the color separately
        if (colors) {
            // Loop through each color and either link an existing one or create a new one
            for (const col of colors) {
                let existingColor = yield prisma.color.findUnique({
                    where: { hex: col.hex },
                });
                if (!existingColor) {
                    // Create new color if it doesn't exist
                    existingColor = yield prisma.color.create({
                        data: {
                            color_name: col.color_name,
                            hex: col.hex,
                        },
                    });
                }
                // Check if the relation already exists between the product and the color
                const colorLinkExists = yield prisma.productColor.findUnique({
                    where: {
                        product_id_color_id: {
                            product_id: product.product_id,
                            color_id: existingColor.color_id,
                        },
                    },
                });
                if (!colorLinkExists) {
                    // Create the relation if it doesn't exist
                    yield prisma.productColor.create({
                        data: {
                            product_id: product.product_id,
                            color_id: existingColor.color_id,
                        },
                    });
                }
            }
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Product Updated Successfully",
            product: product,
        });
    }
    catch (error) {
        return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error",
            error: error,
        });
    }
}));
productRouter.delete('/delete/gallery/:image_id', auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield (0, s3_1.deleteObjectS3)(imageExist.key);
        yield prisma.productImage.delete({
            where: {
                image_id: imageId
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Deleted Successfully"
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
                category_id: true,
                name: true,
                description: true,
                price: true,
                discount_percent: true,
                availability: true,
                SKU: true,
                brand: true,
                material: true,
                shape: true,
                design_style: true,
                fixture_form: true,
                ideal_for: true,
                power_source: true,
                installation: true,
                shade_material: true,
                voltage: true,
                light_color: true,
                light_source: true,
                light_color_temperature: true,
                included_components: true,
                lighting_method: true,
                item_weight: true,
                height: true,
                length: true,
                width: true,
                quantity: true,
                power_rating: true,
                brightness: true,
                controller_type: true,
                switch_type: true,
                switch_mounting: true,
                mounting_type: true,
                fixture_type: true,
                assembly_required: true,
                primary_material: true,
                number_of_light_sources: true,
                surge_protection: true,
                shade_color: true,
                key_features: true,
                batteries: true,
                embellishment: true,
                colors: true,
                reviews: true,
                images: true,
                category: true
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
productRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const searchQuery = req.query.searchQuery;
    try {
        const products = yield prisma.product.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: searchQuery,
                            mode: 'insensitive', // Case-insensitive search
                        },
                    },
                    {
                        description: {
                            contains: searchQuery,
                            mode: 'insensitive',
                        },
                    },
                    {
                        category: {
                            name: {
                                contains: searchQuery,
                                mode: 'insensitive',
                            },
                        },
                    },
                    {
                        colors: {
                            some: {
                                color: {
                                    color_name: {
                                        contains: searchQuery,
                                        mode: 'insensitive',
                                    }
                                },
                            },
                        },
                    },
                ],
            },
            include: {
                category: true,
                colors: {
                    include: {
                        color: true
                    }
                },
                images: true,
                reviews: true,
            },
        });
        res.status(statusCode_1.default.OK).json({
            success: true,
            data: products,
        });
    }
    catch (error) {
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
productRouter.get("/colors", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const colors = yield prisma.color.findMany();
        if (colors.length === 0 || !colors) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Colors Not Exist"
            });
        }
        return res.status(statusCode_1.default.OK).json({
            success: true,
            colors: colors
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
productRouter.get("/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.product.findMany({
            select: {
                product_id: true,
                category_id: true,
                name: true,
                description: true,
                price: true,
                discount_percent: true,
                availability: true,
                SKU: true,
                brand: true,
                material: true,
                shape: true,
                design_style: true,
                fixture_form: true,
                ideal_for: true,
                power_source: true,
                installation: true,
                shade_material: true,
                voltage: true,
                light_color: true,
                light_source: true,
                light_color_temperature: true,
                included_components: true,
                lighting_method: true,
                item_weight: true,
                height: true,
                length: true,
                width: true,
                quantity: true,
                power_rating: true,
                brightness: true,
                controller_type: true,
                switch_type: true,
                switch_mounting: true,
                mounting_type: true,
                fixture_type: true,
                assembly_required: true,
                primary_material: true,
                number_of_light_sources: true,
                surge_protection: true,
                shade_color: true,
                key_features: true,
                batteries: true,
                embellishment: true,
                category: {
                    select: {
                        name: true,
                    },
                },
                colors: {
                    select: {
                        color: true, // Include the related color details
                    },
                },
                reviews: true,
                images: true,
            },
        });
        if (!products || products.length === 0) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "No products found",
            });
        }
        res.status(statusCode_1.default.OK).json({
            success: true,
            products: products,
        });
    }
    catch (error) {
        return (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
productRouter.get("/all/colors", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const colors = yield prisma.color.findMany();
        res.status(statusCode_1.default.OK).json({
            success: true,
            colors: colors,
        });
    }
    catch (error) {
        return (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
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
                category_id: true,
                name: true,
                description: true,
                price: true,
                discount_percent: true,
                availability: true,
                SKU: true,
                brand: true,
                material: true,
                shape: true,
                design_style: true,
                fixture_form: true,
                ideal_for: true,
                power_source: true,
                installation: true,
                shade_material: true,
                voltage: true,
                light_color: true,
                light_source: true,
                light_color_temperature: true,
                included_components: true,
                lighting_method: true,
                item_weight: true,
                height: true,
                length: true,
                width: true,
                quantity: true,
                power_rating: true,
                brightness: true,
                controller_type: true,
                switch_type: true,
                switch_mounting: true,
                mounting_type: true,
                fixture_type: true,
                assembly_required: true,
                primary_material: true,
                number_of_light_sources: true,
                surge_protection: true,
                shade_color: true,
                key_features: true,
                batteries: true,
                embellishment: true,
                colors: {
                    include: {
                        color: true, // Include the related color details
                    },
                },
                reviews: true,
                images: true
            }
        });
        if (!product) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Product Not Found"
            });
        }
        res.status(statusCode_1.default.OK).json({
            success: true,
            data: product
        });
    }
    catch (error) {
        return (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
productRouter.delete("/delete/:product_id", auth_middleware_1.adminAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const product_id = req.params.product_id;
    try {
        const productExist = yield prisma.product.findUnique({
            where: {
                product_id: product_id
            },
            select: {
                product_id: true,
                colors: true,
                reviews: true,
                images: true,
                CartItem: true,
                OrderItem: true
            }
        });
        if (!productExist) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Product not found"
            });
        }
        // Begin a transaction
        yield prisma.$transaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
            // Delete colors associated with the product
            if (productExist.colors.length > 0) {
                yield transaction.productColor.deleteMany({
                    where: {
                        product_id: product_id
                    }
                });
            }
            // Delete images associated with the product
            if (productExist.images.length > 0) {
                for (const image of productExist.images) {
                    const response = yield (0, s3_1.deleteObjectS3)(image.key);
                    if (!response.success) {
                        throw new Error('Failed to delete image from S3');
                    }
                }
                yield transaction.productImage.deleteMany({
                    where: {
                        product_id: product_id
                    }
                });
            }
            // Delete cart items associated with the product
            if (productExist.CartItem) {
                yield transaction.cartItem.deleteMany({
                    where: {
                        product_id: product_id
                    }
                });
            }
            // Delete order items associated with the product
            if (productExist.OrderItem) {
                yield transaction.orderItem.deleteMany({
                    where: {
                        product_id: product_id
                    }
                });
            }
            // Finally, delete the product itself
            yield transaction.product.delete({
                where: {
                    product_id: product_id
                }
            });
        }));
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Product deleted successfully"
        });
    }
    catch (error) {
        return (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
exports.default = productRouter;
