import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';
import { Cart, CartItem } from '../app/models/cart.model';
import { ProductService } from './product.service'; 

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private productService = inject(ProductService);
  private apiUrl = `${environment.apiUrl}/cart`;

  private cartSubject = new BehaviorSubject<Cart>({ id: 0, items: [], totalPrice: 0, totalItems: 0 });
  public cart$ = this.cartSubject.asObservable();

  constructor() {
    this.initCart();
  }

  private initCart() {
    if (this.authService.isLoggedIn()) {
      this.loadCartFromServer();
    } else {
      this.loadCartFromLocalStorage();
    }
  }

  loadCartFromServer() {
    this.http.get<any>(this.apiUrl).pipe(
      map(res => this.mapServerCart(res))
    ).subscribe(cart => {
      this.cartSubject.next(cart);
    });
  }

  loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('guest_cart');
    if (savedCart) {
      const items: CartItem[] = JSON.parse(savedCart);
      this.updateGuestCart(items);
    } else {
      this.cartSubject.next({ id: 0, items: [], totalPrice: 0, totalItems: 0 });
    }
  }

  addToCart(productId: number, quantity: number = 1): Observable<any> {
    if (this.authService.isLoggedIn()) {
      return this.http.post<any>(`${this.apiUrl}/add`, null, {
        params: { productId: productId.toString(), quantity: quantity.toString() }
      }).pipe(
        tap(res => {
          const cart = this.mapServerCart(res);
          this.cartSubject.next(cart);
        })
      );
    } else {
      const currentItems = this.getGuestItems();
      const existingItem = currentItems.find(i => i.productId === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        currentItems.push({ productId, quantity } as CartItem);
      }
      this.updateGuestCart(currentItems);
      return of({ success: true });
    }
  }

  removeFromCart(productId: number): Observable<any> {
    if (this.authService.isLoggedIn()) {
      return this.http.delete<any>(`${this.apiUrl}/remove/${productId}`).pipe(
        tap(res => {
          const cart = this.mapServerCart(res);
          this.cartSubject.next(cart);
        })
      );
    } else {
      const currentItems = this.getGuestItems().filter(i => i.productId !== productId);
      this.updateGuestCart(currentItems);
      return of({ success: true });
    }
  }

  updateQuantity(productId: number, quantity: number): Observable<any> {
    if (quantity <= 0) return this.removeFromCart(productId);

    if (this.authService.isLoggedIn()) {
      return this.http.put<any>(`${this.apiUrl}/update-quantity`, null, {
        params: { productId: productId.toString(), quantity: quantity.toString() }
      }).pipe(
        tap(res => {
          const cart = this.mapServerCart(res);
          this.cartSubject.next(cart);
        })
      );
    } else {
      const currentItems = this.getGuestItems();
      const item = currentItems.find(i => i.productId === productId);
      if (item) {
        item.quantity = quantity;
        this.updateGuestCart(currentItems);
      }
      return of({ success: true });
    }
  }

  private getGuestItems(): CartItem[] {
    const saved = localStorage.getItem('guest_cart');
    return saved ? JSON.parse(saved) : [];
  }

  private updateGuestCart(items: CartItem[]) {
    localStorage.setItem('guest_cart', JSON.stringify(items.map(i => ({ productId: i.productId, quantity: i.quantity }))));
    
    if (items.length === 0) {
      this.cartSubject.next({ id: 0, items: [], totalPrice: 0, totalItems: 0 });
      return;
    }

    const requests = items.map(item => 
      this.productService.getProductById(item.productId).pipe(
        map((res: any) => {
          let raw = res.data || res;
          return {
            ...item,
            productName: raw.name || raw.Name,
            imageUrl: raw.imageUrl || raw.ImageUrl,
            brand: raw.brand || raw.Brand || 'N/A',
            originalPrice: raw.price || raw.Price,
            price: (raw.flashSale || raw.FlashSale) ? (raw.flashSale?.salePrice ?? raw.FlashSale?.SalePrice) : (raw.price || raw.Price),
            subTotal: ( (raw.flashSale || raw.FlashSale) ? (raw.flashSale?.salePrice ?? raw.FlashSale?.SalePrice) : (raw.price || raw.Price) ) * (item.quantity || 1)
          };
        }),
      )
    );
    forkJoin(requests).subscribe(fullItems => {
      const typedItems = fullItems as CartItem[];
      const totalPrice = typedItems.reduce((acc: number, item: CartItem) => acc + (item.price * item.quantity), 0);
      const totalItems = typedItems.reduce((acc: number, item: CartItem) => acc + item.quantity, 0);
      this.cartSubject.next({ id: 0, items: typedItems, totalPrice, totalItems });
    });
  }

  private mapServerCart(res: any): Cart {
    let rawItems = res.items?.$values || res.Items?.$values || res.items || res.Items || [];
    
    const items: CartItem[] = rawItems.map((ri: any) => ({
      id: ri.id ?? ri.Id,
      productId: ri.productId ?? ri.ProductId,
      quantity: ri.quantity ?? ri.Quantity,
      productName: ri.productName ?? ri.ProductName ?? ri.name ?? ri.Name,
      imageUrl: ri.imageUrl ?? ri.ImageUrl,
      brand: ri.brand ?? ri.Brand ?? '',
      originalPrice: ri.originalPrice ?? ri.OriginalPrice ?? ri.price ?? ri.Price,
      price: ri.price ?? ri.Price,
      subTotal: ri.subTotal ?? ri.SubTotal ?? ((ri.price ?? ri.Price) * (ri.quantity ?? ri.Quantity))
    }));

    const totalPrice = res.totalPrice ?? res.TotalPrice ?? items.reduce((acc: number, item: CartItem) => acc + (item.price * item.quantity), 0);
    const totalItems = items.reduce((acc: number, item: CartItem) => acc + item.quantity, 0);

    return { 
      id: res.id ?? res.Id ?? 0,
      items, 
      totalPrice,
      totalItems
    };
  }

  clearCart(): Observable<any> {
    if (this.authService.isLoggedIn()) {
      return this.http.delete(`${this.apiUrl}/clear`).pipe(
        tap(() => this.loadCartFromServer())
      );
    } else {
      localStorage.removeItem('guest_cart');
      this.cartSubject.next({ id: 0, items: [], totalPrice: 0, totalItems: 0 });
      return of({ success: true });
    }
  }

  clearLocalCart() {
    localStorage.removeItem('guest_cart');
    this.cartSubject.next({ id: 0, items: [], totalPrice: 0, totalItems: 0 });
  }
}
