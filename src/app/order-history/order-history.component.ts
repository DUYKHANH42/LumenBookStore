import { Component, OnInit, inject } from '@angular/core';
import { OrderService } from '../../services/order.service';
import { Order, OrderFullDetail } from '../models/order.model';
import { ToastService } from '../../services/toast.service';
import { CartService } from '../../services/cart.service';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html'
})
export class OrderHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  private toastService = inject(ToastService);
  private cartService = inject(CartService);
  private router = inject(Router);
  env = environment;

  orders: Order[] = [];
  isLoading = false;
  selectedOrder: OrderFullDetail | null = null;
  showDetail = false;

  // Phân trang
  currentPage = 1;
  pageSize = 5;
  totalItems = 0;
  totalPages = 0;

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders(page: number = 1) {
    this.currentPage = page;
    this.isLoading = true;
    this.orderService.getHistory(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.orders = res.items;
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.isLoading = false;
      },
      error: () => {
        this.toastService.show('Không thể tải lịch sử đơn hàng', 'error');
        this.isLoading = false;
      }
    });
  }

  cancelOrder(orderId: number) {
    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      this.orderService.cancelOrder(orderId).subscribe({
        next: (res) => {
          this.toastService.show(res.message, 'success');
          this.loadOrders(this.currentPage);
          if (this.selectedOrder && this.selectedOrder.id === orderId) {
            this.closeDetail();
          }
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Không thể hủy đơn hàng', 'error');
        }
      });
    }
  }

  viewDetail(orderId: number) {
    this.orderService.getOrderDetails(orderId).subscribe({
      next: (res) => {
        this.selectedOrder = res;
        this.showDetail = true;
      },
      error: (err) => {
        if (err.status === 403) {
          this.toastService.show('Bạn không có quyền xem đơn hàng này', 'error');
        } else {
          this.toastService.show('Không thể tải chi tiết đơn hàng', 'error');
        }
      }
    });
  }

  closeDetail() {
    this.showDetail = false;
    this.selectedOrder = null;
  }

  reOrder(order: any) {
    // If order has items (OrderFullDetail), use them. Otherwise fetch detail.
    if (order.items) {
      this.addItemsToCart(order.items);
    } else {
      this.isLoading = true;
      this.orderService.getOrderDetails(order.id).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.addItemsToCart(res.items);
        },
        error: () => {
          this.isLoading = false;
          this.toastService.show('Không thể lấy thông tin đơn hàng để mua lại', 'error');
        }
      });
    }
  }

  isCancelled(status: string): boolean {
    return status?.toLowerCase() === 'cancelled';
  }

  private addItemsToCart(items: any[]) {
    this.isLoading = true;
    
    // Create an array of addToCart observables
    const addTasks = items.map(item => 
      this.cartService.addToCart(item.productId, item.quantity)
    );

    // Run all tasks and then navigate
    forkJoin(addTasks).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show('Đã thêm các sản phẩm vào giỏ hàng!', 'success');
        this.router.navigate(['/cart']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Re-order error:', err);
        this.toastService.show('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng', 'error');
      }
    });
  }
}
