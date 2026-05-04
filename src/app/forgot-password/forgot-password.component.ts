import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;
  message = '';
  errorMessage = '';

  onSubmit() {
    if (this.forgotForm.invalid) return;

    this.isLoading = true;
    this.message = '';
    this.errorMessage = '';

    this.authService.forgotPassword(this.forgotForm.value).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.message = res.message || 'Yêu cầu thành công. Vui lòng kiểm tra mã xác nhận trong thông báo này.';
        } else {
          this.errorMessage = res.message || 'Có lỗi xảy ra, vui lòng thử lại.';
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Lỗi hệ thống khi gửi yêu cầu.';
      }
    });
  }
}
