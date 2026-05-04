import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { UserAddressService } from '../../services/user-address.service';
import { OrderService } from '../../services/order.service';
import { Address } from '../models/address.model';
import { CheckoutDto } from '../models/order.model';
import { ToastService } from '../../services/toast.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html'
})
export class CheckoutComponent implements OnInit {
  private cartService = inject(CartService);
  private addressService = inject(UserAddressService);
  private orderService = inject(OrderService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  cart$ = this.cartService.cart$;
  addresses: Address[] = [];
  selectedAddressId: number | null = null;
  isPlacingOrder = false;
  
  checkoutForm: FormGroup = this.fb.group({
    shippingName: ['', Validators.required],
    shippingPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    shippingAddress: ['', Validators.required],
    paymentMethod: [0, Validators.required] 
  });

  private authService = inject(AuthService);

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Vui lòng đăng nhập để tiến hành đặt hàng!', 'warning');
      this.router.navigate(['/login']);
      return;
    }
    this.loadAddresses();
  }

  loadAddresses() {
    this.addressService.getAddresses().subscribe({
      next: (res) => {
        this.addresses = res;
        const defaultAddr = res.find(a => a.isDefault);
        if (defaultAddr) {
          this.selectAddress(defaultAddr);
        }
      },
      error: () => this.toastService.show('Không thể tải địa chỉ', 'error')
    });
  }

  selectAddress(address: Address) {
    this.selectedAddressId = address.id;
    this.checkoutForm.patchValue({
      shippingName: address.receiverName,
      shippingPhone: address.phoneNumber,
      shippingAddress: address.addressLine
    });
  }

  placeOrder() {
    if (this.checkoutForm.invalid) {
      this.toastService.show('Vui lòng chọn hoặc nhập thông tin nhận hàng', 'warning');
      return;
    }

    this.isPlacingOrder = true;
    const checkoutDto: CheckoutDto = this.checkoutForm.value;

    this.orderService.checkout(checkoutDto).subscribe({
      next: (res: any) => {
        // Nếu là thanh toán Online (ZaloPay) và có URL
        if (res.paymentUrl) {
           window.location.href = res.paymentUrl;
           return;
        }

        this.toastService.show('Đặt hàng thành công!', 'success');
        this.cartService.clearLocalCart(); 
        this.router.navigate(['/orders']); 
      },
      error: (err) => {
        console.error('Checkout error:', err);
        const errorMsg = err.error?.message || 'Có lỗi xảy ra khi đặt hàng';
        this.toastService.show(errorMsg, 'error');
        this.isPlacingOrder = false;
      }
    });
  }

}