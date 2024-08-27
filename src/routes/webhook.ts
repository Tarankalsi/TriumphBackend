import express from "express"

const webhookRouter = express.Router();


webhookRouter.post('/shiprocket/status', (req, res) => {
    try {
      // Extract the event data from the request body
      const event = req.body;
  
      // Log the incoming webhook event
      console.log('Received Shiprocket webhook:', event);
  
      // Check the type of event and process accordingly
      if (event.type === 'order_status_update') {
        handleOrderStatusUpdate(event.data);
      } else {
        console.log('Unknown event type:', event.type);
      }
  
      // Respond to Shiprocket to confirm receipt
      res.status(200).send('Webhook received');
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