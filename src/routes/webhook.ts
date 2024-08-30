import { PrismaClient } from "@prisma/client";
import express from "express"

const webhookRouter = express.Router();

const prisma = new PrismaClient();
webhookRouter.post('/status', async (req, res) => {
    try {
      // Extract the event data from the request body
      const event = req.body;
  
      // Log the incoming webhook event
  
      const updateOrder = await prisma.order.updateMany({
        where: {
          shiprocket_awb_code: event.awb
        },
        data: {
          status:event.current_status,
          shiprocket_status: event.current_status,
          shiprocket_updated_at: new Date()
        }
      });
      
      // Respond to Shiprocket to confirm receipt
      res.status(200).json({
        success: true,
        "message":`Order with AWB code ${event.awb} updated successfully.`
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

export default webhookRouter