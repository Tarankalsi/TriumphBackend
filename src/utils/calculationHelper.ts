import { Product } from "@prisma/client"



type CartItem = {
    cart_item_id: string;
    cart_id: string;
    product_id: string;
    quantity: number;
    color: string;
    product: Product;
};
export const billing = (cartItems: CartItem[], deliveryFee: number, tax: number) => {

    const bill = {
        subTotal: 0,
        total: 0,
        discount: 0,
        deliveryFee: deliveryFee,
        tax: 0
    }

    // calculate subtotal
    cartItems.forEach((cartItem) => {

        bill.subTotal += cartItem.product.price * cartItem.quantity;


        // Assuming discount is a percentage applied to each product's price
        if (cartItem.product.discount_percent !== 0 || null) {

            bill.discount += (cartItem.product.price * cartItem.product.discount_percent / 100) * cartItem.quantity;
        }
    });

    // Calculate total
    bill.tax = (bill.subTotal * tax / 100);
    bill.total = bill.subTotal + bill.deliveryFee + bill.tax - bill.discount;

    return bill;

}


export const calculateCartWeight = (cartItems : CartItem[]) => {
    let weight 
    cartItems.map((cartItem) =>{
        weight =+ parseFloat(cartItem.product.item_weight)  * cartItem.quantity
    })
}