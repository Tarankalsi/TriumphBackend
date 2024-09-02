"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCartSchema = exports.addressSchema = exports.createOrderSchema = exports.PaymentMethod = exports.OrderStatus = exports.signedUrlImageSchema = exports.a_change_pass_2 = exports.a_change_pass_1 = exports.user_signinSchema = exports.otpVerificationSchema = exports.user_signupSchema = exports.reviewSchema = exports.admin_signinSchema = exports.admin_signupSchema = exports.updateCategorySchema = exports.categorySchema = exports.pdUpdateSchema = exports.productSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.productSchema = zod_1.default.object({
    name: zod_1.default.string(),
    description: zod_1.default.string(),
    price: zod_1.default.number(),
    availability: zod_1.default.number(),
    SKU: zod_1.default.string().toUpperCase(),
    discount_percent: zod_1.default.number().optional(),
    material: zod_1.default.string().optional(),
    shape: zod_1.default.string().optional(),
    design_style: zod_1.default.string().optional(),
    fixture_form: zod_1.default.string().optional(),
    ideal_for: zod_1.default.string().optional(),
    power_source: zod_1.default.string().optional(),
    installation: zod_1.default.string().optional(),
    shade_material: zod_1.default.string().optional(),
    voltage: zod_1.default.string().optional(),
    light_color: zod_1.default.string().optional(),
    light_source: zod_1.default.string().optional(),
    light_color_temperature: zod_1.default.string().optional(),
    included_components: zod_1.default.string().optional(),
    lighting_method: zod_1.default.string().optional(),
    item_weight: zod_1.default.string(),
    height: zod_1.default.string(),
    length: zod_1.default.string(),
    width: zod_1.default.string(),
    quantity: zod_1.default.string().optional(),
    power_rating: zod_1.default.string().optional(),
    brightness: zod_1.default.string().optional(),
    controller_type: zod_1.default.string().optional(),
    switch_type: zod_1.default.string().optional(),
    switch_mounting: zod_1.default.string().optional(),
    mounting_type: zod_1.default.string().optional(),
    fixture_type: zod_1.default.string().optional(),
    assembly_required: zod_1.default.string().optional(),
    primary_material: zod_1.default.string().optional(),
    number_of_light_sources: zod_1.default.string().optional(),
    surge_protection: zod_1.default.string().optional(),
    shade_color: zod_1.default.string().optional(),
    key_features: zod_1.default.string().optional(),
    batteries: zod_1.default.string().optional(),
    embellishment: zod_1.default.string().optional(),
    colors: zod_1.default.array(zod_1.default.object({
        color_name: zod_1.default.string(),
        hex: zod_1.default.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
    })),
});
exports.pdUpdateSchema = zod_1.default.object({
    name: zod_1.default.string().optional(),
    description: zod_1.default.string().optional(),
    price: zod_1.default.number().optional(),
    availability: zod_1.default.number().optional(),
    SKU: zod_1.default.string().toUpperCase().optional(),
    material: zod_1.default.string().optional(),
    shape: zod_1.default.string().optional(),
    design_style: zod_1.default.string().optional(),
    fixture_form: zod_1.default.string().optional(),
    ideal_for: zod_1.default.string().optional(),
    power_source: zod_1.default.string().optional(),
    installation: zod_1.default.string().optional(),
    shade_material: zod_1.default.string().optional(),
    voltage: zod_1.default.string().optional(),
    light_color: zod_1.default.string().optional(),
    light_source: zod_1.default.string().optional(),
    light_color_temperature: zod_1.default.string().optional(),
    included_components: zod_1.default.string().optional(),
    lighting_method: zod_1.default.string().optional(),
    item_weight: zod_1.default.string(),
    height: zod_1.default.string().optional(),
    length: zod_1.default.string().optional(),
    width: zod_1.default.string().optional(),
    quantity: zod_1.default.string().optional(),
    power_rating: zod_1.default.string().optional(),
    brightness: zod_1.default.string().optional(),
    controller_type: zod_1.default.string().optional(),
    switch_type: zod_1.default.string().optional(),
    switch_mounting: zod_1.default.string().optional(),
    mounting_type: zod_1.default.string().optional(),
    fixture_type: zod_1.default.string().optional(),
    assembly_required: zod_1.default.string().optional(),
    primary_material: zod_1.default.string().optional(),
    number_of_light_sources: zod_1.default.string().optional(),
    surge_protection: zod_1.default.string().optional(),
    shade_color: zod_1.default.string().optional(),
    key_features: zod_1.default.string().optional(),
    batteries: zod_1.default.string().optional(),
    embellishment: zod_1.default.string().optional(),
    colors: zod_1.default.array(zod_1.default.object({
        color_name: zod_1.default.string(),
        hex: zod_1.default.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
    }))
        .optional(),
});
exports.categorySchema = zod_1.default.object({
    name: zod_1.default.string(),
    description: zod_1.default.string().optional(),
});
exports.updateCategorySchema = zod_1.default.object({
    name: zod_1.default.string().optional(),
    description: zod_1.default.string().optional(),
});
exports.admin_signupSchema = zod_1.default.object({
    full_name: zod_1.default.string(),
    email: zod_1.default.string().email(),
    password: zod_1.default.string().min(6).optional(),
    role: zod_1.default.string().toUpperCase().optional()
});
exports.admin_signinSchema = zod_1.default.object({
    email: zod_1.default.string().email(),
    password: zod_1.default.string().min(6)
});
exports.reviewSchema = zod_1.default.object({
    rating: zod_1.default.number().int().min(0, { message: "Rating must be at least 0" }).max(5, { message: "Rating cannot exceed 5" }),
    review_text: zod_1.default.string(),
});
exports.user_signupSchema = zod_1.default.object({
    full_name: zod_1.default.string(),
    email: zod_1.default.string().email()
});
exports.otpVerificationSchema = zod_1.default.object({
    code: zod_1.default.string().length(6, 'Invalid OTP'),
});
exports.user_signinSchema = zod_1.default.object({
    email: zod_1.default.string().email()
});
exports.a_change_pass_1 = zod_1.default.object({
    email: zod_1.default.string().email()
});
exports.a_change_pass_2 = zod_1.default.object({
    oldPassword: zod_1.default.string().min(6),
    newPassword: zod_1.default.string().min(6)
});
exports.signedUrlImageSchema = zod_1.default.object({
    imageName: zod_1.default.string(),
    contentType: zod_1.default.string()
});
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Processing"] = "processing";
    OrderStatus["Shipped"] = "shipped";
    OrderStatus["Delivered"] = "delivered";
    OrderStatus["Cancelled"] = "cancelled";
    OrderStatus["Returned"] = "returned";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CashOnDelivery"] = "COD";
    PaymentMethod["UPI"] = "upi";
    PaymentMethod["DebitCard"] = "debit card";
    PaymentMethod["NetBanking"] = "net banking";
    PaymentMethod["CreditCard"] = "credit card";
    PaymentMethod["BankTransfer"] = "bank transfer";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
exports.createOrderSchema = zod_1.default.object({
    payment_method: zod_1.default.enum([
        PaymentMethod.CashOnDelivery,
        PaymentMethod.CreditCard,
        PaymentMethod.DebitCard,
        PaymentMethod.BankTransfer,
        PaymentMethod.NetBanking,
        PaymentMethod.UPI
    ]),
    address_id: zod_1.default.string(),
});
exports.addressSchema = zod_1.default.object({
    street: zod_1.default.string().optional(),
    city: zod_1.default.string().optional(),
    state: zod_1.default.string().optional(),
    postal_code: zod_1.default.string().optional(),
    country: zod_1.default.string().optional(),
    phone_number: zod_1.default
        .string()
        .regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional() // Ensures exactly 10 digits
});
exports.createCartSchema = zod_1.default.object({
    is_temporary: zod_1.default.boolean().optional()
});
