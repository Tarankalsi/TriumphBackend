import { PaymentMethod } from './../zod';

import jwt from 'jsonwebtoken';
import { Router, Request, Response } from "express";
import { categorySchema, createOrderSchema, pdUpdateSchema, productSchema, signedUrlImageSchema } from "../zod";
import { PrismaClient } from "@prisma/client";
import statusCode from "../statusCode";
import handleErrorResponse, { CustomError } from "../utils/handleErrorResponse";
import { adminAuthMiddleware, userAuthMiddleware } from '../middleware/auth.middleware';
import { billing } from '../utils/calculationHelper';
import { createShiprocketShipment,  generateAWBCode,  generateLabel,  generateManifest,  getTracking,  requestPickup,  selectBestCourier } from '../utils/Shiprocket';

const orderRouter = Router();
const prisma = new PrismaClient();

const CART_JWT_SECRET_KEY = process.env.CART_JWT_SECRET_KEY as string

orderRouter.post("/create", userAuthMiddleware, async (req, res) => {
    const user_id = req.user_id; // Ensure user_id is defined
    const body = req.body;

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
                cart: true,
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
            where: { cart_id: user?.cart?.cart_id },
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
                                discount: (item.product.discount_percent / 100 * item.product.price) ?? 0 // Ensure discount is not undefined
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
            let cod 
            if (newOrder.payment_method === PaymentMethod.CashOnDelivery) {
                cod = 1
            }else {
                cod = 0
            }
            
            const bestCourier = await selectBestCourier({
                delivery_postcode: address.postal_code,
                weight: 5, // in kg
                cod: cod  , // 1 for COD, 0 for Prepaid
                declared_value: newOrder.sub_total, // declared value of the package,
                pickup_address_location: "Primary"// pickup address name us et like Primary or Home
            })

            const awbCode = await generateAWBCode(shiprocketOrder.shipment_id, bestCourier.courier_company_id)
            console.log("AWB CODE: ", awbCode)
            const generatedlabel = await generateLabel(shiprocketOrder.shipment_id)
            console.log("generatedlabel ", generatedlabel)
            const pickupRequest = await requestPickup(shiprocketOrder.shipment_id)
            console.log("pickupRequest ", pickupRequest)
            const manifest = await generateManifest(shiprocketOrder.shipment_id)
            console.log("manifest ", manifest)
            const tracking = await getTracking(awbCode.awb_code)
            console.log("tracking ", tracking)

       
            const addShiprocket = await prisma.order.update({
                where: {
                    order_id: newOrder.order_id
                },
                data: {
                    shiprocket_order_id: shiprocketOrder.order_id.toString(),
                    shiprocket_shipment_id: shiprocketOrder.shipment_id.toString(),
                    shiprocket_status: shiprocketOrder.status,
                    shiprocket_courier_partner_id:bestCourier.courier_company_id,
                    shiprocket_awb_code: awbCode.awb_code,
                    shiprocket_shipment_label_url: generatedlabel.label_url,
                    shiprocket_estimated_delivery: tracking.delivered_date,
                    shiprocket_manifest_url: manifest.manifest_url,  
                }
            })

            console.log("Add to database shiprocker order: ", addShiprocket)

            // Optionally clear the cart after order creation
            await prisma.cart.update({
                where: { cart_id: cart.cart_id },
                data: { cartItems: { deleteMany: {} } }
            });

            return  addShiprocket;
        })

        res.status(statusCode.OK).json({
            success: true,
            message: "Order Created Successfully",

            order:order
        });

    } catch (error) {
        console.error("Error creating order:", error);
        handleErrorResponse(res, error as CustomError, statusCode.INTERNAL_SERVER_ERROR);
    }
});




export default orderRouter;