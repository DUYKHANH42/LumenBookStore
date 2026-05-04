import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm!: FormGroup;
  isLoading = false;
  errorMessage: string = '';

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            const roles = res.roles || [];
            if (roles.includes('Admin')) {
              const backendUrl = environment.apiUrl.replace('/api', '');
              window.location.href = `${backendUrl}/Admin`;
            } else {
              this.router.navigate(['/']);
            }
          } else {
            this.errorMessage = res.message || 'Email hoặc mật khẩu không chính xác.';
          }
        },
        error: (err) => {
          // Lấy thông báo từ server (ví dụ: Tài khoản bị khóa)
          this.errorMessage = err.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại kết nối.';
        }
      });
  }
}

