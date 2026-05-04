import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { finalize, debounceTime, map, take, switchMap } from 'rxjs/operators';
import { Observable, of, timer } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string = '';

  ngOnInit() {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: [
        '', 
        [Validators.required, Validators.email],
        [this.emailUnique()] // Cách sử dụng Async Validator đúng đắn
      ],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom Validator so sánh mật khẩu (Chuẩn Group Validator)
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // Async Validator kiểm tra email trùng (có debounce chuẩn RxJS)
  emailUnique(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      
      return timer(500).pipe(
        switchMap(() => this.authService.checkEmailExists(control.value)),
        map(exists => (exists ? { emailExists: true } : null)),
        take(1)
      );
    };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Loại bỏ confirmPassword trước khi gửi lên Server
    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.authService.register(registerData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = res.message || 'Đăng ký không thành công.';
          }
        },
        error: (err) => {
          this.errorMessage = 'Đăng ký thất bại. Vui lòng kiểm tra lại kết nối.';
          console.error('Register error:', err);
        }
      });
  }
}

