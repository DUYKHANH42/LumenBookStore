import { Component, OnInit, inject } from '@angular/core';
import { UserAddressService } from '../../services/user-address.service';
import { Address } from '../models/address.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-address-manager',
  templateUrl: './address-manager.component.html',
  styleUrls: ['./address-manager.component.css']
})
export class AddressManagerComponent implements OnInit {
  private addressService = inject(UserAddressService);
  private toastService = inject(ToastService);

  addresses: Address[] = [];
  isLoading = false;
  showForm = false;
  selectedAddress: Address | null = null;

  ngOnInit() {
    this.loadAddresses();
  }

  loadAddresses() {
    this.isLoading = true;
    this.addressService.getAddresses().subscribe({
      next: (res) => {
        this.addresses = res;
        this.isLoading = false;
      },
      error: () => {
        this.toastService.show('Không thể tải danh sách địa chỉ', 'error');
        this.isLoading = false;
      }
    });
  }

  openForm(address?: Address) {
    this.selectedAddress = address || null;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedAddress = null;
  }

  onFormSubmit() {
    this.closeForm();
    this.loadAddresses();
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
}
