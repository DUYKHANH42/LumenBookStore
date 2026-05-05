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
import { AddressService } from '../../services/address.service';

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
  private provincialService = inject(AddressService);

  cart$ = this.cartService.cart$;
  addresses: Address[] = [];
  selectedAddressId: number | null = null;
  isPlacingOrder = false;
  
  checkoutForm: FormGroup = this.fb.group({
    shippingName: ['', Validators.required],
    shippingPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    shippingAddress: ['', Validators.required],
    street: [''], // For new address
    paymentMethod: [0, Validators.required] 
  });

  // Provincial Data for new address
  provinces: any[] = [];
  wards: any[] = [];
  selectedProvince: any | null = null;
  selectedWard: any | null = null;
  isProvinceDropdownOpen = false;
  isWardDropdownOpen = false;
  isAddingNewAddress = false;

  private authService = inject(AuthService);

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Vui lòng đăng nhập để tiến hành đặt hàng!', 'warning');
      this.router.navigate(['/login']);
      return;
    }
    this.loadAddresses();
    this.loadProvinces();
  }

  loadProvinces() {
    this.provincialService.getProvinces().subscribe(data => {
      this.provinces = data;
    });
  }

  toggleProvinceDropdown() {
    this.isProvinceDropdownOpen = !this.isProvinceDropdownOpen;
    if (this.isProvinceDropdownOpen) this.isWardDropdownOpen = false;
  }

  toggleWardDropdown() {
    if (this.wards.length === 0) return;
    this.isWardDropdownOpen = !this.isWardDropdownOpen;
    if (this.isWardDropdownOpen) this.isProvinceDropdownOpen = false;
  }

  selectProvince(p: any) {
    this.selectedProvince = p;
    this.isProvinceDropdownOpen = false;
    this.wards = [];
    this.selectedWard = null;
    this.provincialService.getWardsByProvinceCode(p.code).subscribe(res => {
      this.wards = res.wards || [];
    });
    this.updateShippingAddress();
  }

  selectWard(w: any) {
    this.selectedWard = w;
    this.isWardDropdownOpen = false;
    this.updateShippingAddress();
  }

  onStreetChange() {
    this.updateShippingAddress();
  }

  updateShippingAddress() {
    if (this.isAddingNewAddress && this.selectedProvince && this.selectedWard) {
      const street = this.checkoutForm.get('street')?.value || '';
      const fullAddress = `${street}, ${this.selectedWard.name}, ${this.selectedProvince.name}`;
      this.checkoutForm.patchValue({ shippingAddress: fullAddress });
    }
  }

  toggleAddNewAddress() {
    this.isAddingNewAddress = !this.isAddingNewAddress;
    if (this.isAddingNewAddress) {
      this.selectedAddressId = null;
      this.checkoutForm.patchValue({
        shippingName: '',
        shippingPhone: '',
        shippingAddress: '',
        street: ''
      });
    } else {
      this.loadAddresses();
    }
  }

  loadAddresses() {
    this.addressService.getAddresses().subscribe({
      next: (res) => {
        this.addresses = res;
        if (res.length === 0) {
          this.isAddingNewAddress = true;
        } else {
          this.isAddingNewAddress = false;
          const defaultAddr = res.find(a => a.isDefault);
          if (defaultAddr) {
            this.selectAddress(defaultAddr);
          }
        }
      },
      error: () => this.toastService.show('Không thể tải địa chỉ', 'error')
    });
  }

  selectAddress(address: Address) {
    this.isAddingNewAddress = false;
    this.selectedAddressId = address.id;
    this.checkoutForm.patchValue({
      shippingName: address.receiverName,
      shippingPhone: address.phoneNumber,
      shippingAddress: address.addressLine
    });
  }

  placeOrder() {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      if (this.isAddingNewAddress && (!this.selectedProvince || !this.selectedWard)) {
        this.toastService.show('Vui lòng chọn Tỉnh/Thành và Phường/Xã', 'warning');
      } else {
        this.toastService.show('Vui lòng chọn hoặc nhập đầy đủ thông tin nhận hàng', 'warning');
      }
      return;
    }

    this.isPlacingOrder = true;
    const checkoutDto: CheckoutDto = {
      ...this.checkoutForm.value
    };

    // If it's a new address, we might want to save it to user profile first
    // For now, we just proceed with the built shippingAddress string
    
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