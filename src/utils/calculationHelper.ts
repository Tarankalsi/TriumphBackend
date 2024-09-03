import { Address, Product } from "@prisma/client"
import { selectBestCourier } from "./Shiprocket";



type CartItem = {
    cart_item_id: string;
    cart_id: string;
    product_id: string;
    quantity: number;
    color: string;
    product: Product;
};
export const billing = async (cartItems: CartItem[], address :Address, tax: number , pickup_location_name : string) => {

    const bill = {
        subTotal: 0,
        total: 0,
        discount: 0,
        deliveryFee: 0,
        tax: 0
    }

    const totalWeight = calculateCartWeight(cartItems)

    const courier_partner = await selectBestCourier({
        delivery_postcode: address.postal_code,
        weight: totalWeight,
        cod: 1, // 1 for COD, 0 for Prepaid
        declared_value: bill.total,
        pickup_address_location: pickup_location_name,
      });
    
    console.log("Courier partner: ",courier_partner)

      bill.deliveryFee = courier_partner.rate

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

}

export const calculateCartWeight = (cartItems: CartItem[]) => {
    let weight = 0;  // Initialize weight to 0
    cartItems.forEach((cartItem) => {
        weight += (parseFloat(cartItem.product.item_weight) / 1000) * cartItem.quantity;  // Correct accumulation
    });
    return weight;
};