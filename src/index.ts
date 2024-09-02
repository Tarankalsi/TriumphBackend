import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mainRouter from './routes/index';

const app = express();
const PORT = process.env.PORT || 3000;  // Use environment variable for PORT if available

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Routes
app.use('/api/v1', mainRouter);

// Start the server and log that the server is running
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
