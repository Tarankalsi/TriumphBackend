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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCartWeight = exports.billing = void 0;
const Shiprocket_1 = require("./Shiprocket");
const billing = (cartItems, address, tax, pickup_location_name) => __awaiter(void 0, void 0, void 0, function* () {
    const bill = {
        subTotal: 0,
        total: 0,
        discount: 0,
        deliveryFee: 0,
        tax: 0
    };
    const totalWeight = (0, exports.calculateCartWeight)(cartItems);
    const courier_partner = yield (0, Shiprocket_1.selectBestCourier)({
        delivery_postcode: address.postal_code,
        weight: totalWeight,
        cod: 1, // 1 for COD, 0 for Prepaid
        declared_value: bill.total,
        pickup_address_location: pickup_location_name,
    });
    console.log("Courier partner: ", courier_partner);
    bill.deliveryFee = courier_partner.rate;
    // calculate subtotal
    cartItems.forEach((cartItem) => {
        bill.subTotal += cartItem.product.price * cartItem.quantity;
        // Assuming discount is a percentage applied to each product's price
        if (cartItem.product.discount_percent !== 0 || null) {
            bill.discount += (cartItem.product.price * cartItem.product.discount_percent / 100) * cartItem.quantity;
        }
    });
    // Calculate total
    bill.tax = (bill.subTotal * (tax / 100));
    bill.total = bill.subTotal + bill.deliveryFee + bill.tax - bill.discount;
    return bill;
});
exports.billing = billing;
const calculateCartWeight = (cartItems) => {
    let weight = 0; // Initialize weight to 0
    cartItems.forEach((cartItem) => {
        weight += (parseFloat(cartItem.product.item_weight) / 1000) * cartItem.quantity; // Correct accumulation
    });
    return weight;
};
exports.calculateCartWeight = calculateCartWeight;
