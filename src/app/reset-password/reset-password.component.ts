import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html'
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  resetForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    token: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  isLoading = false;
  isSuccess = false;
  message = '';
  errorMessage = '';
  isInvalidLink = false;

  ngOnInit() {
    // Lấy token và email từ Query Parameters trên URL
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const email = params['email'];

      if (token && email) {
        this.resetForm.patchValue({
          token: token,
          email: email
        });
      } else {
        this.isInvalidLink = true;
        this.errorMessage = 'Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
      }
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    return password && confirmPassword && password.value !== confirmPassword.value 
      ? { passwordMismatch: true } 
      : null;
  }

  onSubmit() {
    if (this.resetForm.invalid || this.isInvalidLink) return;

    this.isLoading = true;
    this.message = '';
    this.errorMessage = '';

    const { email, token, newPassword } = this.resetForm.value;
    
    this.authService.resetPassword({ email, token, newPassword }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.isSuccess = true;
          this.message = 'Mật khẩu của bạn đã được cập nhật thành công. Đang chuyển hướng về trang đăng nhập...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.errorMessage = res.message || 'Đặt lại mật khẩu thất bại.';
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Lỗi hệ thống khi đặt lại mật khẩu.';
      }
    });
  }
}
