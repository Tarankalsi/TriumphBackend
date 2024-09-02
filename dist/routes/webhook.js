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
const client_1 = require("@prisma/client");
const express_1 = __importDefault(require("express"));
const webhookRouter = express_1.default.Router();
const prisma = new client_1.PrismaClient();
webhookRouter.post('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract the event data from the request body
        const event = req.body;
        // Log the incoming webhook event
        const updateOrder = yield prisma.order.updateMany({
            where: {
                shiprocket_awb_code: event.awb
            },
            data: {
                status: event.current_status,
                shiprocket_status: event.current_status,
                shiprocket_updated_at: new Date()
            }
        });
        // Respond to Shiprocket to confirm receipt
        res.status(200).json({
            success: true,
            "message": `Order with AWB code ${event.awb} updated successfully.`
        });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
}));
exports.default = webhookRouter;
