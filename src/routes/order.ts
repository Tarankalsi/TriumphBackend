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
    const cartToken = req.headers['cart-token'] as string;
  
    if (!cartToken) {
      return res.status(statusCode.BAD_REQUEST).json({
        success: false,
        message: "Cart Token is not provided",
      });
    }
  
    let decoded;
    try {
      decoded = jwt.verify(cartToken, CART_JWT_SECRET_KEY) as cartTokenPayload;
    } catch (error) {
      return res.status(statusCode.UNAUTHORIZED).json({
        success: false,
        message: "Invalid Cart Token",
      });
    }
  
    // Validate the incoming request body
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return res.status(statusCode.BAD_REQUEST).json({
        success: false,
        message: "Invalid data format",
        errors: validation.error.errors,
      });
    }
  
    if (body.payment_method !== PaymentMethod.CashOnDelivery) {
      return res.status(statusCode.BAD_REQUEST).json({
        success: false,
        message: "Only Cash On Delivery (COD) is currently available.",
      });
    }
  
    try {
      // Fetch User
      const user = await prisma.user.findUnique({
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
        return res.status(statusCode.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }
  
      // Fetch Address
      const address = await prisma.address.findUnique({
        where: {
          address_id: body.address_id,
        },
      });
  
      if (!address) {
        return res.status(statusCode.NOT_FOUND).json({
          success: false,
          message: "Address not found",
        });
      }
  
      // Fetch Cart and Cart Items
      const cart = await prisma.cart.findUnique({
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
        return res.status(statusCode.NOT_FOUND).json({
          success: false,
          message: "User's cart not found or empty",
        });
      }
  
      // Calculate the total weight
      const totalWeight = cart.cartItems.reduce((weight, cartItem) => {
        return weight + (parseFloat(cartItem.product.item_weight) * cartItem.quantity) / 1000;
      }, 0);
  
      const bill = await  billing(cart.cartItems, address, 18,body.pickup_location_name);
  
      // Prisma Transaction Block for Atomic Operations
      const order = await prisma.$transaction(async (prisma) => {
        if (!user.full_name || !user.phone_number || !user.cart) {
          throw new Error("Incomplete user information or missing cart");
        }
  
        // Update Product Availability and Handle Out of Stock Cases
        await Promise.all(
          cart.cartItems.map(async (item) => {
            const product = await prisma.product.findUnique({
              where: { product_id: item.product_id },
              select: { availability: true },
            });
  
            if (product && product.availability >= item.quantity) {
              await prisma.product.update({
                where: { product_id: item.product_id },
                data: {
                  availability: product.availability - item.quantity,
                },
              });
            } else {
              throw new Error(`Product ${item.product_id} is out of stock`);
            }
          })
        );
  
        // Create the Order
        const newOrder = await prisma.order.create({
          data: {
            user_id: user_id as string,
            order_items: {
              createMany: {
                data: cart.cartItems.map(item => ({
                  product_id: item.product_id,
                  quantity: item.quantity,
                  unit_price: item.product.price,
                  subTotal: item.product.price * item.quantity,
                  discount: (item.product.discount_percent / 100 * item.product.price) ?? 0,
                  color: item.color,
                })),
              },
            },
            total_amount: bill.total,
            sub_total: bill.subTotal,
            tax_amount: bill.tax,
            shipping_charges:bill.deliveryFee,
            discount: bill.discount,
            status: "processing",
            payment_method: body.payment_method as string,
            shipping_address_id: body.address_id as string,
          },
        });
  
        // Shipping Logic with Error Handling
        const dimensions = {
          length: parseFloat(cart.cartItems[0].product.length),
          width: parseFloat(cart.cartItems[0].product.width),
          height: parseFloat(cart.cartItems[0].product.height),
        };
  
        try {
          const shiprocketOrder = await createShiprocketShipment(newOrder, user, cart.cartItems, address, totalWeight, dimensions);
          if (shiprocketOrder.status_code === 0) {
            throw new Error("Shiprocket Order could not be created.");
          }
         
          const tracking = await getTracking(shiprocketOrder.order_id, shiprocketOrder.channel_id);
  
          const addShiprocket = await prisma.order.update({
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
          await prisma.cart.update({
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
          await sendEmail(placedOrderEmail);
  
          return addShiprocket;
        } catch (apiError) {
          console.error("Error in external API:", apiError);
          throw new Error("Failed to process external shipping or courier service");
        }
      });
  
      // Return successful response
      res.status(statusCode.OK).json({
        success: true,
        message: "Order Created Successfully",
        order: order,
      });
  
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error creating order:", error.message);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: `Failed to create order: ${error.message}`,
            });
        } else {
            console.error("Unknown error creating order:", error);
            return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "An unexpected error occurred",
            });
        }
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