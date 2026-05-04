import { Component, OnInit, inject } from '@angular/core';
import { OrderService } from '../../services/order.service';
import { Order, OrderFullDetail } from '../models/order.model';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html'
})
export class OrderHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  private toastService = inject(ToastService);
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
}
