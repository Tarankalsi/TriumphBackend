import express from "express"

const webhookRouter = express.Router();


webhookRouter.post('/status', (req, res) => {
    try {
      // Extract the event data from the request body
      const event = req.body;
  
      // Log the incoming webhook event
      console.log('Received Shiprocket webhook:', event);
  
  
      // Respond to Shiprocket to confirm receipt
      res.status(200).json({
        success: true,
        "message":'Webhook received',
        "event": event
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // Function to handle order status updates
  function handleOrderStatusUpdate(data : any) {
    // Extract relevant information from the data
    const { order_id, status, timestamp } = data;
  
    // Update your database or system with the new status
    console.log(`Order ID: ${order_id}`);
    console.log(`New Status: ${status}`);
    console.log(`Timestamp: ${timestamp}`);
  
    // Implement your database update logic here
    // Example: db.updateOrderStatus(order_id, status);
  }

export default webhookRouter