import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { AuthResponseDto } from '../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { FavoriteService } from '../../services/favorite.service';
import { UserAddressService } from '../../services/user-address.service';
import { Address } from '../models/address.model';
import { FavoriteDto } from '../models/favorite.model';
import { OrderService } from '../../services/order.service';
import { Order, OrderFullDetail } from '../models/order.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private favoriteService = inject(FavoriteService);
  private addressService = inject(UserAddressService);
  private orderService = inject(OrderService);

  userInfo: AuthResponseDto | null = null;
  activeTab: 'overview' | 'settings' | 'orders' | 'favorites' = 'overview';
  
  favorites: FavoriteDto[] = [];
  orders: Order[] = [];
  isLoadingStats = false;
  isLoadingFavorites = false;
  
  // New Address Logic
  addresses: Address[] = [];
  isLoadingAddresses = false;
  showAddressForm = false;
  selectedAddress: Address | null = null;

  // Validation State
  @ViewChild('fullNameInput') fullNameInput!: ElementRef;
  @ViewChild('phoneInput') phoneInput!: ElementRef;
  @ViewChild('currentPasswordInput') currentPasswordInput!: ElementRef;
  @ViewChild('newPasswordInput') newPasswordInput!: ElementRef;
  @ViewChild('confirmPasswordInput') confirmPasswordInput!: ElementRef;

  errors: { [key: string]: boolean } = {};

  // Password fields
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  // Avatar fields
  avatarFile: File | null = null;
  avatarPreview: string | ArrayBuffer | null = null;

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Vui lòng đăng nhập để truy cập!', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userInfo = { ...user };
      }
    });

    this.loadStats();
    this.loadAddresses();
  }

  loadStats() {
    this.isLoadingStats = true;
    this.favoriteService.getFavorites().subscribe({
      next: (res: any) => this.favorites = this.ensureArray(res),
      complete: () => this.isLoadingStats = false
    });

    this.orderService.getHistory().subscribe({
      next: (res: any) => {
        // Lấy danh sách items từ kết quả phân trang
        this.orders = this.ensureArray(res.items || res);
      }
    });
  }

  // Order Detail Logic
  selectedOrder: OrderFullDetail | null = null;
  showOrderDetail = false;

  viewDetail(orderId: number) {
    this.orderService.getOrderDetails(orderId).subscribe({
      next: (res) => {
        this.selectedOrder = res;
        this.showOrderDetail = true;
      },
      error: () => this.toastService.show('Không thể tải chi tiết đơn hàng', 'error')
    });
  }

  closeOrderDetail() {
    this.showOrderDetail = false;
    this.selectedOrder = null;
  }

  getStatusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'chờ xác nhận': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'đã xác nhận': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'đang giao': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'đã giao': return 'bg-green-50 text-green-600 border-green-100';
      case 'đã hủy': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  logout() {
    this.authService.logout();
    this.toastService.show('Đã đăng xuất thành công', 'success');
    this.router.navigate(['/']);
  }

  loadFavorites() {
    this.isLoadingFavorites = true;
    this.favoriteService.getFavorites()
      .pipe(finalize(() => this.isLoadingFavorites = false))
      .subscribe({
        next: (res: any) => {
          this.favorites = this.ensureArray(res);
        },
        error: (err) => console.error('Error loading favorites:', err)
      });
  }

  loadAddresses() {
    this.isLoadingAddresses = true;
    this.addressService.getAddresses()
      .pipe(finalize(() => this.isLoadingAddresses = false))
      .subscribe({
        next: res => this.addresses = res,
        error: () => this.toastService.show('Không thể tải địa chỉ', 'error')
      });
  }

  openAddressForm(addr?: Address) {
    this.selectedAddress = addr || null;
    this.showAddressForm = true;
  }

  deleteAddress(id: number) {
    if (confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      this.addressService.deleteAddress(id).subscribe({
        next: () => {
          this.toastService.show('Đã xóa địa chỉ', 'success');
          this.loadAddresses();
        },
        error: () => this.toastService.show('Không thể xóa địa chỉ', 'error')
      });
    }
  }

  onAddressSubmitted() {
    this.showAddressForm = false;
    this.loadAddresses();
  }

  removeFavorite(productId: number) {
    this.favoriteService.toggleFavorite(productId).subscribe({
      next: (res: any) => {
        const isFavorited = res.isFavorited ?? res.IsFavorited;
        if (!isFavorited) {
          this.favorites = this.favorites.filter(f => f.productId !== productId);
          this.toastService.show('Đã bỏ sản phẩm khỏi Yêu thích.', 'info');
        }
      }
    });
  }

  switchTab(tab: 'overview' | 'settings' | 'orders' | 'favorites') {
    this.activeTab = tab;
    if (tab === 'favorites' && this.favorites.length === 0) {
      this.loadFavorites();
    }
    if (tab === 'settings') {
      this.loadAddresses();
    }
  }

  // Handle Avatar Change
  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.match(/image\/*/)) {
        this.toastService.show('Chỉ hỗ trợ tải lên file hình ảnh (JPG, PNG...)', 'warning');
        return;
      }
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.toastService.show('Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.', 'warning');
        return;
      }
      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = e => this.avatarPreview = reader.result;
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    this.errors = {}; 
    if (!this.userInfo?.fullName || this.userInfo.fullName.trim().length === 0) {
      this.errors['fullName'] = true;
      this.toastService.show('Họ và tên không được để trống!', 'warning');
      this.fullNameInput.nativeElement.focus();
      return;
    }
    if (this.userInfo?.phoneNumber && !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(this.userInfo.phoneNumber)) {
      this.errors['phoneNumber'] = true;
      this.toastService.show('Định dạng số điện thoại không hợp lệ!', 'warning');
      this.phoneInput.nativeElement.focus();
      return;
    }

    // Chuẩn bị FormData để gửi lên Server (multipart/form-data)
    const formData = new FormData();
    formData.append('FullName', this.userInfo?.fullName || '');
    formData.append('PhoneNumber', this.userInfo?.phoneNumber || '');
    // Bổ sung isActive
    formData.append('IsActive', String(this.userInfo?.isActive ?? true));

    if (this.avatarFile) {
      formData.append('AvatarFile', this.avatarFile);
    }

    // Hiển thị trạng thái đang xử lý (có thể thêm biến isLoading nếu cần)
    this.authService.updateProfile(formData).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toastService.show('Cập nhật hồ sơ thành công!', 'success');
          // Reset avatar file sau khi upload thành công
          this.avatarFile = null;
        } else {
          this.toastService.show(res.message || 'Cập nhật thất bại', 'error');
        }
      },
      error: () => this.toastService.show('Lỗi hệ thống khi cập nhật hồ sơ', 'error')
    });
  }

  isLoading = false;

  changePassword() {
    this.errors = {}; 
    if (!this.currentPassword) {
      this.errors['currentPassword'] = true;
      this.toastService.show('Vui lòng nhập mật khẩu hiện tại!', 'warning');
      this.currentPasswordInput.nativeElement.focus();
      return;
    }
    if (!this.newPassword) {
      this.errors['newPassword'] = true;
      this.toastService.show('Vui lòng nhập mật khẩu mới!', 'warning');
      this.newPasswordInput.nativeElement.focus();
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errors['confirmPassword'] = true;
      this.toastService.show('Mật khẩu xác nhận không khớp!', 'error');
      this.confirmPasswordInput.nativeElement.focus();
      return;
    }

    this.isLoading = true;
    this.authService.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toastService.show('Đổi mật khẩu thành công!', 'success');
          // Reset form
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        } else {
          this.toastService.show(res.message || 'Đổi mật khẩu thất bại', 'error');
        }
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Lỗi hệ thống khi đổi mật khẩu', 'error');
      }
    });
  }

  private ensureArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    return [];
  }
}
