import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { Cart, CartItem } from '../models/cart.model';
import { Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
})
export class CartComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private toastService = inject(ToastService);

  cart$: Observable<Cart> = this.cartService.cart$;
  private updateSubject = new Subject<{ productId: number, quantity: number }>();
  private updateSubscription?: Subscription;

  ngOnInit(): void {
    // Cấu hình Debounce: Chỉ gửi request sau khi người dùng ngừng nhấn 500ms
    this.updateSubscription = this.updateSubject.pipe(
      debounceTime(500),
      // distinctUntilChanged((prev, curr) => prev.productId === curr.productId && prev.quantity === curr.quantity)
    ).subscribe(({ productId, quantity }) => {
      this.cartService.updateQuantity(productId, quantity).subscribe({
        next: () => this.toastService.show('Đã cập nhật giỏ hàng', 'success'),
        error: () => {
          this.toastService.show('Không thể cập nhật số lượng', 'error');
          this.cartService.loadCartFromServer(); // Rollback bằng cách load lại từ server
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.updateSubscription?.unsubscribe();
  }

  updateQuantity(item: CartItem, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeItem(item);
      return;
    }

    // OPTIMISTIC UPDATE: Cập nhật UI ngay lập tức
    item.quantity = newQty; 
    
    // Đẩy vào Subject để xử lý Debounce
    this.updateSubject.next({ productId: item.productId, quantity: newQty });
  }

  removeItem(item: CartItem) {
    if (confirm(`Bạn có chắc muốn xóa "${item.productName}" khỏi giỏ hàng?`)) {
      this.cartService.removeFromCart(item.productId).subscribe({
        next: () => this.toastService.show('Đã xóa sản phẩm', 'info'),
        error: () => this.toastService.show('Có lỗi xảy ra khi xóa', 'error')
      });
    }
  }

  clearAll() {
    if (confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) {
      this.cartService.clearCart().subscribe({
        next: () => this.toastService.show('Đã xóa toàn bộ giỏ hàng', 'info'),
        error: () => this.toastService.show('Có lỗi xảy ra khi xóa giỏ hàng', 'error')
      });
    }
  }
}
