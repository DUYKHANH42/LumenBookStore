export interface CartItem {
  id: number;
  productId: number;  // bookId -> productId
  productName: string; // bookTitle -> productName
  imageUrl: string;
  brand: string;      // author -> brand
  originalPrice: number;
  price: number;
  quantity: number;
  subTotal: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}
