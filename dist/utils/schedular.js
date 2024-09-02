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
exports.deleteCartSchedular = void 0;
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
const refreshShiprocketToken_1 = require("./refreshShiprocketToken");
const prisma = new client_1.PrismaClient();
const deleteCartSchedular = () => {
    node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - 1);
        try {
            const cartsToDelete = yield prisma.cart.findMany({
                where: {
                    user_id: null,
                    created_at: { lte: expiryDate }
                },
                include: {
                    cartItems: true
                }
            });
            const cartIdsToDelete = cartsToDelete.map(cart => cart.cart_id);
            yield prisma.cartItem.deleteMany({
                where: {
                    cart_id: { in: cartIdsToDelete }
                }
            });
            yield prisma.cart.deleteMany({
                where: {
                    cart_id: { in: cartIdsToDelete }
                }
            });
            console.log(`Deleted ${cartsToDelete.length} carts older than 1 day`);
        }
        catch (error) {
            console.error('Error deleting old carts:', error);
        }
    }));
};
exports.deleteCartSchedular = deleteCartSchedular;
const TOKEN_REFRESH_INTERVAL_DAYS = 9;
// Schedule the refresh token function to run every 9 days
node_cron_1.default.schedule(`0 0 */${TOKEN_REFRESH_INTERVAL_DAYS} * *`, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Refreshing Shiprocket API token...');
    yield (0, refreshShiprocketToken_1.refreshToken)();
    console.log('Token refresh scheduler set up.');
}));
