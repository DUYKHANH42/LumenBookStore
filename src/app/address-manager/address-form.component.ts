import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Address } from '../models/address.model';
import { UserAddressService } from '../../services/user-address.service';
import { AddressService } from '../../services/address.service'; // Provincial Service
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-address-form',
  templateUrl: './address-form.component.html'
})
export class AddressFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userAddressService = inject(UserAddressService);
  private provincialService = inject(AddressService);
  private toastService = inject(ToastService);

  @Input() address: Address | null = null;
  @Input() defaultName: string = '';
  @Input() defaultPhone: string = '';
  @Output() submitted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  addressForm!: FormGroup;
  isSubmitting = false;

  // Provincial Data
  provinces: any[] = [];
  wards: any[] = [];
  selectedProvince: any | null = null;
  selectedWard: any | null = null;
  isProvinceDropdownOpen = false;
  isWardDropdownOpen = false;

  ngOnInit() {
    const initialPhone = this.address?.phoneNumber || 
                        (this.defaultPhone && !this.defaultPhone.includes('@') ? this.defaultPhone : '');
    
    this.addressForm = this.fb.group({
      receiverName: [this.address?.receiverName || this.defaultName, [Validators.required, Validators.minLength(2)]],
      phoneNumber: [initialPhone, [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      street: ['', [Validators.required]], // Will use this to build addressLine
      isDefault: [this.address?.isDefault || false]
    });

    this.provincialService.getProvinces().subscribe(data => {
      this.provinces = data;
    });

    if (this.address) {
      // Try to parse street from addressLine (approximate)
      const parts = this.address.addressLine.split(',').map(p => p.trim());
      if (parts.length > 0) {
        this.addressForm.patchValue({ street: parts[0] });
      }
    }
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
  }

  selectWard(w: any) {
    this.selectedWard = w;
    this.isWardDropdownOpen = false;
  }

  onSubmit() {
    if (this.addressForm.invalid || !this.selectedProvince || !this.selectedWard) {
      this.addressForm.markAllAsTouched();
      this.toastService.show('Vui lòng điền đầy đủ thông tin và chọn Tỉnh/Xã', 'warning');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.addressForm.value;
    
    // Build full address line
    const fullAddress = `${formValue.street}, ${this.selectedWard.name}, ${this.selectedProvince.name}`;
    
    const payload = {
      receiverName: formValue.receiverName,
      phoneNumber: formValue.phoneNumber,
      addressLine: fullAddress,
      isDefault: formValue.isDefault
    };

    if (this.address) {
      this.userAddressService.updateAddress({ ...this.address, ...payload }).subscribe({
        next: () => {
          this.toastService.show('Đã cập nhật địa chỉ', 'success');
          this.submitted.emit();
        },
        error: () => {
          this.toastService.show('Có lỗi xảy ra', 'error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.userAddressService.addAddress(payload).subscribe({
        next: () => {
          this.toastService.show('Đã thêm địa chỉ mới', 'success');
          this.submitted.emit();
        },
        error: () => {
          this.toastService.show('Có lỗi xảy ra', 'error');
          this.isSubmitting = false;
        }
      });
    }
  }
}
