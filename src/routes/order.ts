import { PaymentMethod } from './../zod';

import jwt from 'jsonwebtoken';
import { Router, Request, Response } from "express";
import { categorySchema, createOrderSchema, pdUpdateSchema, productSchema, signedUrlImageSchema } from "../zod";
import { PrismaClient } from "@prisma/client";
import statusCode from "../statusCode";
import handleErrorResponse, { CustomError } from "../utils/handleErrorResponse";
import { adminAuthMiddleware, userAuthMiddleware } from '../middleware/auth.middleware';
import { billing } from '../utils/calculationHelper';
import { cancelShiprocketOrder, createShiprocketShipment, generateAWBCode, generateLabel, generateManifest, getTracking, requestPickup, selectBestCourier } from '../utils/Shiprocket';
import axios from 'axios';
import { sendEmail } from '../utils/sendEmail';
import { formatDateTime } from '../utils/formatDate';

const orderRouter = Router();
const prisma = new PrismaClient();

interface cartTokenPayload {
    cart_id: string;
}

const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY as string

orderRouter.post("/create", userAuthMiddleware, async (req, res) => {
    const user_id = req.user_id; // Ensure user_id is defined
    const body = req.body;

    const cartToken = req.headers['cart-token'] as string

    let decoded
    if (cartToken) {
        decoded = jwt.verify(cartToken, CART_JWT_SECRET_KEY) as cartTokenPayload;
    } else {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Cart Token is not given"
        })
    }

    // Validate the incoming request body
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Invalid data format",
            errors: validation.error.errors
        });
    }

    if (body.payment_method !== PaymentMethod.CashOnDelivery) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            "message": "For now only COD is available, no other payment option is available"
        })
    }

    try {
        if (!user_id) {
            return res.status(statusCode.BAD_REQUEST).json({
                success: false,
                message: "User ID is required"
            });
        }

        const user = await prisma.user.findUnique({
            where: { user_id },
            select: {
                user_id: true,
                email: true,
                full_name: true,
                phone_number: true,
                cart: {},
            }
        });


        const address = await prisma.address.findUnique({
            where: {
                address_id: body.address_id
            }
        })

        if (!address) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Address not found"
            })
        }
        const cart = await prisma.cart.findUnique({
            where: {
                cart_id: decoded.cart_id
            },
            select: {
                cart_id: true,
                cartItems: {
                    include: { product: true }
                }
            }
        });


        if (!cart || !cart.cartItems.length) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "User's cart not found or Empty"
            });
        }

        const bill = billing(cart.cartItems, 200, 18);


        // Use Prisma transaction to ensure atomic operation
        const order = await prisma.$transaction(async (prisma) => {

            if (!user || !user.full_name || !user.phone_number || !user.cart) {
                return res.status(statusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Missing User Information and cart"
                })
            }

            await Promise.all(
                cart.cartItems.map(async (item) => {
                    // Fetch the current availability of the product
                    const product = await prisma.product.findUnique({
                        where: { product_id: item.product_id },
                        select: { availability: true }
                    });

                    if (product && product.availability >= item.quantity) {
                        // Update the availability
                        await prisma.product.update({
                            where: { product_id: item.product_id },
                            data: {
                                availability: product.availability - item.quantity
                            }
                        });
                    } else {
                        throw new Error(`Product ${item.product_id} is out of stock`);
                    }
                })
            );


            const newOrder = await prisma.order.create({
                data: {
                    user_id: user_id as string, // Assert type to string
                    order_items: {
                        createMany: {
                            data: cart.cartItems.map(item => ({
                                product_id: item.product_id,
                                quantity: item.quantity,
                                unit_price: item.product.price,
                                subTotal: item.product.price * item.quantity,
                                discount: (item.product.discount_percent / 100 * item.product.price) ?? 0, // Ensure discount is not undefined
                                color: item.color
                            }))
                        }
                    },
                    total_amount: bill.total,
                    shipping_charges: bill.deliveryFee,
                    sub_total: bill.subTotal,
                    tax_amount: bill.tax,
                    discount: bill.discount,
                    status: "processing",
                    payment_method: body.payment_method as string, // Ensure payment_method is a string
                    shipping_address_id: body.address_id as string // Ensure shipping_address_id is a string
                }
            });



            const shiprocketOrder = await createShiprocketShipment(newOrder, user, cart.cartItems, address)

            console.log("Create Shiprocket Order: ", shiprocketOrder)

            const tracking = await getTracking(shiprocketOrder.order_id, shiprocketOrder.channel_id)
            console.log("tracking ", tracking)


            const addShiprocket = await prisma.order.update({
                where: {
                    order_id: newOrder.order_id
                },
                data: {
                    shiprocket_order_id: shiprocketOrder.order_id.toString(),
                    shiprocket_shipment_id: shiprocketOrder.shipment_id.toString(),
                    shiprocket_channel_order_id: shiprocketOrder.channel_order_id,
                    shiprocket_status: shiprocketOrder.status

                }
            })

            console.log("Add to database shiprocker order: ", addShiprocket)

            // Optionally clear the cart after order creation
            await prisma.cart.update({
                where: { cart_id: cart.cart_id },
                data: { cartItems: { deleteMany: {} } }
            });

            const html = `
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
                background-color: #f4f4f4;
            }
            .container {
                width: 80%;
                max-width: 600px;
                margin: auto;
                padding: 20px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
            }
            .header h1 {
                color: #4CAF50;
            }
            .content {
                margin-bottom: 20px;
            }
            .order-details {
                border-top: 1px solid #ddd;
                padding-top: 10px;
            }
            .order-details h2 {
                color: #555;
            }
            .order-details p {
                margin: 5px 0;
            }
            .order-details ul {
                list-style: none;
                padding: 0;
            }
            .order-details li {
                margin-bottom: 10px;
            }
            .footer {
                text-align: center;
                font-size: 0.9em;
                color: #777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Confirmation</h1>
            </div>
            <div class="content">
                <p>Hi ${user.full_name},</p>
                <p>Thank you for your order! We're excited to let you know that your order has been successfully placed. Below are the details of your order:</p>
                <div class="order-details">
                    <h2>Order Details:</h2>
                    <p><strong>Order ID:</strong> ${addShiprocket.order_id}</p>
                    <p><strong>Order Date:</strong> ${formatDateTime(addShiprocket.order_date)}</p>
                    <p><strong>Total Amount:</strong> ${addShiprocket.total_amount}</p>
                    <p><strong>Items Ordered:</strong></p>
                    <ul>
                        ${cart.cartItems.map(item => `
                            <li>
                                ${item.product.name} - Quantity: ${item.quantity} - Price: ${item.product.price}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>If you have any questions about your order, please contact our support team at [Support Email].</p>
                <p>Thank you for shopping with us!</p>
            </div>
        </div>
    </body>
    </html>
`;

            const placedOrderEmail = {
                to: user.email,
                subject: "Triumph Lights Order Confirmation",
                message: `Hi ${user.full_name},\n\nThank you for your order! Your order has been successfully placed. Below are the details of your order:\n\n<p><strong>Order ID:</strong> ${addShiprocket.order_id}</p>\nOrder Date: ${addShiprocket.order_date}\nTotal Amount: ${addShiprocket.total_amount}\nItems Ordered:\n${cart.cartItems.map(item => `${item.product.name} - Quantity: ${item.quantity} - Price: ${item.product.price}`).join('\n')}`,
                html: html
            };

            await sendEmail(placedOrderEmail);



            return addShiprocket;
        })

        res.status(statusCode.OK).json({
            success: true,
            message: "Order Created Successfully",

            order: order
        });

    } catch (error) {
        console.error("Error creating order:", error);
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
    }
});

orderRouter.get("/fetch", userAuthMiddleware, async (req, res) => {
    const user_id = req.user_id; // Ensure user_id is defined

    if (!user_id) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "User ID is required"
        });
    }

    try {
        const orders = await prisma.order.findMany({
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
        })

        return res.status(statusCode.OK).json({
            success: true,
            orders: orders
        })
    } catch (error) {
        console.error("Error creating order:", error);
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
    }
})
orderRouter.delete("/cancel-order/:order_id", userAuthMiddleware, async (req, res) => {
    const { order_id } = req.params;

    try {
        const order = await prisma.order.findUnique({
            where: { order_id: order_id }
        });

     

        if (!order) {
            return res.status(statusCode.NOT_FOUND).json({
                success: false,
                message: "Order Not Found"
            });
        }
        if (!order?.shiprocket_order_id) {
            return res.status(statusCode.BAD_REQUEST).json({
                success: false,
                message: "Shiprocket Order ID is required to cancel the order"
            })
        }

        // Check if the order is eligible for cancellation
        if (["Delivered", "In Transit", "Out for Delivery"].includes(order.status)) {
            return res.status(statusCode.CONFLICT).json({
                success: false,
                message: "Order cannot be canceled as it is already in transit or delivered."
            });
        }

        // Attempt to cancel the order with Shiprocket
        try {
            const response = await cancelShiprocketOrder(parseInt(order.shiprocket_order_id));
            if (response.data.status_code !== 200) {
                return res.status(statusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Failed to cancel the order on Shiprocket."
                });
            }
        } catch (error) {
            const typedError = error as Error
            return res.status(statusCode.BAD_REQUEST).json({
                success: false,
                message: `Shiprocket API Error: ${typedError.message}`
            });
        }

        await prisma.orderItem.deleteMany({
            where: { order_id: order_id }
        });
        // Delete the order from the database
        await prisma.order.delete({
            where: { order_id: order_id }
        });
        
        return res.status(statusCode.OK).json({
            success: true,
            message: "Order Canceled Successfully"
        });
    } catch (error) {
        console.error("Error during order cancellation:", error);
        return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});
orderRouter.get("/specific/:order_id", userAuthMiddleware, async (req, res) => {

    const { order_id } = req.params;

    if (!order_id) {
        return res.status(statusCode.BAD_REQUEST).json({
            success: false,
            message: "Order ID is required"
        });
    }

    try {
        const order = await prisma.order.findUnique({
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
        })

        return res.status(statusCode.OK).json({
            success: true,
            order: order
        })
    } catch (error) {
        console.error("Error creating order:", error);
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
    }
})


export default orderRouter;