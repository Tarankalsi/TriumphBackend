import { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import handleErrorResponse from "./handleErrorResponse";
import { refreshToken } from "./refreshShiprocketToken";
import axios from "axios";

const prisma = new PrismaClient();


export const deleteCartSchedular = () => {
    cron.schedule("0 0 * * *", async () => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - 1);

        
        try {
            const cartsToDelete = await prisma.cart.findMany({
                where: {
                    user_id: null,
                    created_at: { lte: expiryDate }
                },
                include: {
                    cartItems: true
                }
            })
        

            const cartIdsToDelete = cartsToDelete.map(cart => cart.cart_id);

            await prisma.cartItem.deleteMany({
                where: {
                    cart_id: { in: cartIdsToDelete }
                }
            });

            await prisma.cart.deleteMany({
                where: {
                    cart_id: { in: cartIdsToDelete }
                }
            });

            console.log(`Deleted ${cartsToDelete.length} carts older than 1 day`);

        } catch (error) {
            console.error('Error deleting old carts:', error);
        }
    })
}


const TOKEN_REFRESH_INTERVAL_DAYS = 9;
// Schedule the refresh token function to run every 9 days
cron.schedule(`0 0 */${TOKEN_REFRESH_INTERVAL_DAYS} * *`, async () => {
    console.log('Refreshing Shiprocket API token...');
    await refreshToken();
    console.log('Token refresh scheduler set up.');
  });
  
  


