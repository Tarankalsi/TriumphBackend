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
exports.cancelShiprocketOrder = exports.updateShiprocketOrder = exports.getTracking = exports.generateManifest = exports.requestPickup = exports.generateLabel = exports.generateAWBCode = exports.selectBestCourier = exports.createShiprocketShipment = void 0;
const axios_1 = __importDefault(require("axios"));
// Helper Function for Headers
const getShiprocketHeaders = () => ({
    Authorization: `Bearer ${process.env.SHIPROCKET_API_TOKEN}`
});
// Create Shiprocket Shipment
const createShiprocketShipment = (order, user, cartItems, address, totalWeight, dimensions) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
            order_id: order.order_id,
            order_date: order.order_date.toISOString(),
            billing_customer_name: user.full_name || '',
            billing_last_name: '',
            billing_address: address.street,
            billing_city: address.city,
            billing_pincode: address.postal_code,
            billing_state: address.state,
            billing_country: address.country,
            billing_email: user.email || '',
            billing_phone: user.phone_number || '',
            shipping_is_billing: true,
            order_items: cartItems.map((item) => ({
                name: item.product.name,
                sku: item.product.SKU,
                units: item.quantity,
                selling_price: item.product.price,
                discount: (item.product.discount_percent / 100) * item.product.price || 0,
            })),
            payment_method: order.payment_method,
            sub_total: order.sub_total,
            weight: totalWeight,
            length: dimensions.length,
            breadth: dimensions.width,
            height: dimensions.height,
        }, {
            headers: getShiprocketHeaders(),
        });
        return response.data;
    }
    catch (error) {
        if (error.response) {
            // The request was made, and the server responded with a status code that falls out of the range of 2xx
            console.error('Shiprocket API responded with an error:', error.response.data);
            throw new Error(`Failed to create Shiprocket shipment. API Error: ${error.response.data.message || 'Unknown error'}`);
        }
        else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from Shiprocket API:', error.request);
            throw new Error('Failed to create Shiprocket shipment. No response received from the Shiprocket API.');
        }
        else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up the request to Shiprocket API:', error.message);
            throw new Error(`Failed to create Shiprocket shipment. Error: ${error.message}`);
        }
    }
});
exports.createShiprocketShipment = createShiprocketShipment;
// Select Best Courier
const selectBestCourier = (packageDetails) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Fetch pickup location details
        const pickupResponse = yield axios_1.default.get('https://apiv2.shiprocket.in/v1/external/settings/company/pickup', { headers: getShiprocketHeaders() });
        console.log("PickupPincode", pickupResponse.data.data.shipping_address);
        const pickupPincode = (_a = pickupResponse.data.data.shipping_address.find((address) => address.pickup_location === packageDetails.pickup_address_location)) === null || _a === void 0 ? void 0 : _a.pin_code;
        if (!pickupPincode) {
            throw new Error('Pickup pincode not found for the specified pickup address location.');
        }
        console.log("Pickup Pincode: ", pickupPincode);
        console.log("Deliver Pincode: ", packageDetails.delivery_postcode);
        // Check courier serviceability
        const courierResponse = yield axios_1.default.get('https://apiv2.shiprocket.in/v1/external/courier/serviceability/', {
            headers: getShiprocketHeaders(),
            params: {
                pickup_postcode: pickupPincode,
                delivery_postcode: packageDetails.delivery_postcode,
                cod: packageDetails.cod,
                weight: packageDetails.weight,
                declared_value: packageDetails.declared_value,
            },
        });
        if (!courierResponse.data.data || !courierResponse.data.data.available_courier_companies.length) {
            console.error('No available courier companies for the selected route.');
            throw new Error('No available courier companies for the selected route.');
        }
        // Select the best courier
        const bestCourier = courierResponse.data.data.available_courier_companies.reduce((prev, curr) => {
            if (curr.estimated_delivery_days <= 4) {
                if (!prev || curr.freight_charge < prev.freight_charge) {
                    return curr;
                }
            }
            return prev;
        }, null);
        if (!bestCourier) {
            console.error('No suitable courier found with delivery within 4 days.');
            throw new Error('No suitable courier found with delivery within 4 days.');
        }
        // Return best courier or handle AWB assign status
        if (bestCourier.awb_assign_status === 0) {
            console.error(`AWB assign error: ${bestCourier.response.data.awb_assign_error}`);
            throw new Error(`AWB assign error: ${bestCourier.response.data.awb_assign_error}`);
        }
        return bestCourier;
    }
    catch (error) {
        console.error('Error fetching Shiprocket courier partners:', error.message || error);
        throw new Error('Error fetching Shiprocket courier partners.');
    }
});
exports.selectBestCourier = selectBestCourier;
// Generate AWB Code
const generateAWBCode = (shipment_id, courier_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', { shipment_id, courier_id }, { headers: getShiprocketHeaders() });
        return response.data;
    }
    catch (error) {
        console.error('Error generating AWB code:', error);
        throw new Error('Failed to generate AWB code');
    }
});
exports.generateAWBCode = generateAWBCode;
// Generate Label
const generateLabel = (shipment_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/courier/generate/label', { shipment_id: [shipment_id] }, { headers: getShiprocketHeaders() });
        return response.data;
    }
    catch (error) {
        console.error('Error generating Shiprocket label:', error);
        throw new Error('Failed to generate Shiprocket label');
    }
});
exports.generateLabel = generateLabel;
// Request Pickup
const requestPickup = (shipment_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/courier/generate/pickup', { shipment_id: [shipment_id] }, { headers: getShiprocketHeaders() });
        return response.data;
    }
    catch (error) {
        console.error('Error requesting pickup:', error);
        throw new Error('Failed to request pickup');
    }
});
exports.requestPickup = requestPickup;
// Generate Manifest
const generateManifest = (shipment_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/manifests/generate', { shipment_id: [shipment_id] }, { headers: getShiprocketHeaders() });
        return response.data;
    }
    catch (error) {
        console.error('Error generating manifest:', error);
        throw new Error('Error generating manifest');
    }
});
exports.generateManifest = generateManifest;
// Get Tracking
const getTracking = (order_id, channel_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(`https://apiv2.shiprocket.in/v1/external/courier/track?order_id=${order_id}&channel_id=${channel_id}`, { headers: getShiprocketHeaders() });
        return response.data;
    }
    catch (error) {
        console.error('Error tracking shipment:', error);
        throw new Error('Failed to track shipment');
    }
});
exports.getTracking = getTracking;
// Update Shiprocket Order
const updateShiprocketOrder = (shipmentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/pickups/create', Object.assign({ shipment_id: shipmentId }, payload), { headers: getShiprocketHeaders() });
        return response.data;
    }
    catch (error) {
        console.error('Error updating Shiprocket order:', error);
        throw new Error('Failed to update Shiprocket order');
    }
});
exports.updateShiprocketOrder = updateShiprocketOrder;
const cancelShiprocketOrder = (order_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // const trackingResponse = await axios.get(
        //     `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${order_id}`,
        //     { headers: getShiprocketHeaders() }
        // );
        // const status = trackingResponse.data.current_status;
        // if (status === 'shipped' || status === 'in transit') {
        //     throw new Error('Order cannot be canceled as it is already shipped or in transit');
        // }
        const cancelResponse = yield axios_1.default.post('https://apiv2.shiprocket.in/v1/external/orders/cancel', { "ids": [order_id] }, { headers: getShiprocketHeaders() });
        return cancelResponse;
    }
    catch (error) {
        console.error('Error while cancelling the order:', error);
        throw new Error('Failed to cancel order');
    }
});
exports.cancelShiprocketOrder = cancelShiprocketOrder;
