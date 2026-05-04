export interface OrderItem {
  productId: number;
  productName: string;
  imageUrl: string;
  price: number;
  quantity: number;
  subTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface OrderFullDetail extends Order {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  items: OrderItem[];
}

export interface CheckoutDto {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
}

export enum PaymentMethod {
  COD = 0,
  CreditCard = 1,
  PayPal = 2,
  BankTransfer = 3,
  ZaloPay = 4,
  PayOS = 5,
  VNPay = 6
}
