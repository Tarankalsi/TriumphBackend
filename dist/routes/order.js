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
const zod_1 = require("./../zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = require("express");
const zod_2 = require("../zod");
const client_1 = require("@prisma/client");
const statusCode_1 = __importDefault(require("../statusCode"));
const handleErrorResponse_1 = __importDefault(require("../utils/handleErrorResponse"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const calculationHelper_1 = require("../utils/calculationHelper");
const Shiprocket_1 = require("../utils/Shiprocket");
const sendEmail_1 = require("../utils/sendEmail");
const orderRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY;
orderRouter.post("/create", auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user_id; // Ensure user_id is defined
    const body = req.body;
    const cartToken = req.headers['cart-token'];
    if (!cartToken) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Cart Token is not provided",
        });
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(cartToken, CART_JWT_SECRET_KEY);
    }
    catch (error) {
        return res.status(statusCode_1.default.UNAUTHORIZED).json({
            success: false,
            message: "Invalid Cart Token",
        });
    }
    // Validate the incoming request body
    const validation = zod_2.createOrderSchema.safeParse(body);
    if (!validation.success) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Invalid data format",
            errors: validation.error.errors,
        });
    }
    if (body.payment_method !== zod_1.PaymentMethod.CashOnDelivery) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Only Cash On Delivery (COD) is currently available.",
        });
    }
    try {
        // Fetch User
        const user = yield prisma.user.findUnique({
            where: { user_id },
            select: {
                user_id: true,
                email: true,
                full_name: true,
                phone_number: true,
                cart: {},
            },
        });
        if (!user) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "User not found",
            });
        }
        // Fetch Address
        const address = yield prisma.address.findUnique({
            where: {
                address_id: body.address_id,
            },
        });
        if (!address) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Address not found",
            });
        }
        // Fetch Cart and Cart Items
        const cart = yield prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id,
            },
            select: {
                cart_id: true,
                cartItems: {
                    include: { product: true },
                },
            },
        });
        if (!cart || !cart.cartItems.length) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "User's cart not found or empty",
            });
        }
        // Calculate the total weight
        const totalWeight = cart.cartItems.reduce((weight, cartItem) => {
            return weight + (parseFloat(cartItem.product.item_weight) * cartItem.quantity) / 1000;
        }, 0);
        const bill = yield (0, calculationHelper_1.billing)(cart.cartItems, address, 18, body.pickup_location_name);
        // Prisma Transaction Block for Atomic Operations
        const order = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            if (!user.full_name || !user.phone_number || !user.cart) {
                throw new Error("Incomplete user information or missing cart");
            }
            // Update Product Availability and Handle Out of Stock Cases
            yield Promise.all(cart.cartItems.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                const product = yield prisma.product.findUnique({
                    where: { product_id: item.product_id },
                    select: { availability: true },
                });
                if (product && product.availability >= item.quantity) {
                    yield prisma.product.update({
                        where: { product_id: item.product_id },
                        data: {
                            availability: product.availability - item.quantity,
                        },
                    });
                }
                else {
                    throw new Error(`Product ${item.product_id} is out of stock`);
                }
            })));
            // Create the Order
            const newOrder = yield prisma.order.create({
                data: {
                    user_id: user_id,
                    order_items: {
                        createMany: {
                            data: cart.cartItems.map(item => {
                                var _a;
                                return ({
                                    product_id: item.product_id,
                                    quantity: item.quantity,
                                    unit_price: item.product.price,
                                    subTotal: item.product.price * item.quantity,
                                    discount: (_a = (item.product.discount_percent / 100 * item.product.price)) !== null && _a !== void 0 ? _a : 0,
                                    color: item.color,
                                });
                            }),
                        },
                    },
                    total_amount: bill.total,
                    sub_total: bill.subTotal,
                    tax_amount: bill.tax,
                    shipping_charges: bill.deliveryFee,
                    discount: bill.discount,
                    status: "processing",
                    payment_method: body.payment_method,
                    shipping_address_id: body.address_id,
                },
            });
            // Shipping Logic with Error Handling
            const dimensions = {
                length: parseFloat(cart.cartItems[0].product.length),
                width: parseFloat(cart.cartItems[0].product.width),
                height: parseFloat(cart.cartItems[0].product.height),
            };
            try {
                const shiprocketOrder = yield (0, Shiprocket_1.createShiprocketShipment)(newOrder, user, cart.cartItems, address, totalWeight, dimensions);
                if (shiprocketOrder.status_code === 0) {
                    throw new Error("Shiprocket Order could not be created.");
                }
                const tracking = yield (0, Shiprocket_1.getTracking)(shiprocketOrder.order_id, shiprocketOrder.channel_id);
                const addShiprocket = yield prisma.order.update({
                    where: {
                        order_id: newOrder.order_id,
                    },
                    data: {
                        shiprocket_order_id: shiprocketOrder.order_id.toString(),
                        shiprocket_shipment_id: shiprocketOrder.shipment_id.toString(),
                        shiprocket_channel_order_id: shiprocketOrder.channel_order_id,
                        shiprocket_status: shiprocketOrder.status
                    },
                });
                // Clear the cart after order creation
                yield prisma.cart.update({
                    where: { cart_id: cart.cart_id },
                    data: { cartItems: { deleteMany: {} } },
                });
                // Send confirmation email
                const html = `<html>...your HTML content...</html>`;
                const placedOrderEmail = {
                    to: user.email,
                    subject: "Triumph Lights Order Confirmation",
                    message: `Hi ${user.full_name},\n\nThank you for your order!...`,
                    html: html,
                };
                yield (0, sendEmail_1.sendEmail)(placedOrderEmail);
                return addShiprocket;
            }
            catch (apiError) {
                console.error("Error in external API:", apiError);
                throw new Error("Failed to process external shipping or courier service");
            }
        }));
        // Return successful response
        res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Order Created Successfully",
            order: order,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error creating order:", error.message);
            return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: `Failed to create order: ${error.message}`,
            });
        }
        else {
            console.error("Unknown error creating order:", error);
            return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "An unexpected error occurred",
            });
        }
    }
}));
orderRouter.get("/fetch", auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user_id; // Ensure user_id is defined
    if (!user_id) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }
    try {
        const orders = yield prisma.order.findMany({
            where: { user_id },
            include: {
                order_items: {
                    include: {
                        product: {
                            include: {
                                images: true
                            }
                        },
                    },
                },
                shipping_address: true
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            orders: orders
        });
    }
    catch (error) {
        console.error("Error creating order:", error);
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
orderRouter.delete("/cancel-order/:order_id", auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { order_id } = req.params;
    try {
        const order = yield prisma.order.findUnique({
            where: { order_id: order_id }
        });
        if (!order) {
            return res.status(statusCode_1.default.NOT_FOUND).json({
                success: false,
                message: "Order Not Found"
            });
        }
        if (!(order === null || order === void 0 ? void 0 : order.shiprocket_order_id)) {
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: "Shiprocket Order ID is required to cancel the order"
            });
        }
        // Check if the order is eligible for cancellation
        if (["Delivered", "In Transit", "Out for Delivery"].includes(order.status)) {
            return res.status(statusCode_1.default.CONFLICT).json({
                success: false,
                message: "Order cannot be canceled as it is already in transit or delivered."
            });
        }
        // Attempt to cancel the order with Shiprocket
        try {
            const response = yield (0, Shiprocket_1.cancelShiprocketOrder)(parseInt(order.shiprocket_order_id));
            if (response.data.status_code !== 200) {
                return res.status(statusCode_1.default.BAD_REQUEST).json({
                    success: false,
                    message: "Failed to cancel the order on Shiprocket."
                });
            }
        }
        catch (error) {
            const typedError = error;
            return res.status(statusCode_1.default.BAD_REQUEST).json({
                success: false,
                message: `Shiprocket API Error: ${typedError.message}`
            });
        }
        yield prisma.orderItem.deleteMany({
            where: { order_id: order_id }
        });
        // Delete the order from the database
        yield prisma.order.delete({
            where: { order_id: order_id }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            message: "Order Canceled Successfully"
        });
    }
    catch (error) {
        console.error("Error during order cancellation:", error);
        return res.status(statusCode_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}));
orderRouter.get("/specific/:order_id", auth_middleware_1.userAuthMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { order_id } = req.params;
    if (!order_id) {
        return res.status(statusCode_1.default.BAD_REQUEST).json({
            success: false,
            message: "Order ID is required"
        });
    }
    try {
        const order = yield prisma.order.findUnique({
            where: { order_id: order_id },
            include: {
                order_items: {
                    include: {
                        product: {
                            include: {
                                images: true
                            }
                        },
                    },
                },
                shipping_address: true
            }
        });
        return res.status(statusCode_1.default.OK).json({
            success: true,
            order: order
        });
    }
    catch (error) {
        console.error("Error creating order:", error);
        (0, handleErrorResponse_1.default)(res, error, statusCode_1.default.INTERNAL_SERVER_ERROR);
    }
}));
exports.default = orderRouter;
