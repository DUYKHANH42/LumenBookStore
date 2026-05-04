export interface FlashSale {
  id: number;
  salePrice: number;
  saleStock: number;
  soldCount: number;
  startTime: string;
  endTime: string;
  remainingSlots: number;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  description: string;
  quantity: number;
  createdAt: string;
  updatedAt?: string;
  imageUrl: string;
  categoryId: number;
  isActive: boolean;
  sku?: string;
  subCategoryId?: number;
  categoryName?: string;
  subCategoryName?: string;
  isFavorited?: boolean;
  images?: { id: number, imageUrl: string, isMain: boolean, displayOrder: number }[];
  
  // Custom field mapped from backend
  discountPrice?: number;

  // Flash Sale Object
  flashSale?: FlashSale;
}
