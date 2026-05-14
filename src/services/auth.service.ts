import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { map, catchError, take, filter, tap, finalize } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthResponseDto, LoginDto, RegisterDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from '../app/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;
  
  // Sử dụng BehaviorSubject để lưu trữ trạng thái User hiện tại
  private currentUserSubject = new BehaviorSubject<AuthResponseDto | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Biến kiểm soát trạng thái khởi tạo hệ thống (để các Guard/Component chờ refreshToken xong)
  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  public isInitialized$ = this.isInitializedSubject.asObservable();

  // Access Token chỉ lưu trong Memory (biến private), không bao giờ lưu LocalStorage
  private inMemoryToken: string | null = null;

  constructor() {
    // Đưa việc khởi tạo vào setTimeout để bẻ gãy vòng lặp DI (Circular Dependency)
    // Giúp AuthService hoàn thành constructor trước khi các Interceptor gọi ngược lại nó.
    setTimeout(() => this.initializeSession(), 0);
  }

  private initializeSession() {
    const fullName = localStorage.getItem('fullName');
    const email = localStorage.getItem('email');

    // Nếu có thông tin cơ bản trong LocalStorage, set nhanh để UI không bị trống
    if (fullName || email) {
      this.currentUserSubject.next({
        isSuccess: true,
        fullName: fullName || undefined,
        email: email || undefined
      });
    }

    // Luôn gọi RefreshToken khi khởi tạo app để lấy Token thực sự từ HttpOnly Cookie
    this.refreshToken().pipe(
      finalize(() => this.isInitializedSubject.next(true))
    ).subscribe({
      next: () => {
        // Sau khi có token, lấy thông tin đầy đủ
        this.getProfile().subscribe();
      },
      error: () => {
        // Nếu refresh lỗi (hết hạn hoàn toàn), xóa sạch session
        this.clearLocalSession();
      }
    });
  }

  // Lấy thông tin đầy đủ của user hiện tại
  getProfile(): Observable<AuthResponseDto> {
    return this.http.get<AuthResponseDto>(`${this.apiUrl}/me`).pipe(
      map(res => {
        if (res.isSuccess) {
          this.currentUserSubject.next({
            ...this.currentUserSubject.value,
            ...res
          });
          // Cache lại thông tin cơ bản
          if (res.fullName) localStorage.setItem('fullName', res.fullName);
          if (res.email) localStorage.setItem('email', res.email);
        }
        return res;
      })
    );
  }

  // Đăng nhập
  login(data: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, data, { withCredentials: true }).pipe(
      map(res => {
        if (res.isSuccess && res.token) {
          this.inMemoryToken = res.token;
          
          // CHỈ lưu thông tin metadata công khai vào LocalStorage
          if (res.fullName) localStorage.setItem('fullName', res.fullName);
          if (res.email) localStorage.setItem('email', res.email);
          
          this.currentUserSubject.next(res);
        }
        return res;
      })
    );
  }

  // Đăng ký
  register(data: RegisterDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/register`, data);
  }

  // Kiểm tra email tồn tại
  checkEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-email?email=${email}`);
  }

  // Cập nhật thông tin cá nhân
  updateProfile(formData: FormData): Observable<AuthResponseDto> {
    return this.http.put<any>(`${this.apiUrl}/update-profile`, formData).pipe(
      map(res => {
        if (res.isSuccess || res.IsSuccess) {
          const newFullName = res.fullName || res.FullName;
          const current = this.currentUserSubject.value;
          if (current) {
            this.currentUserSubject.next({ ...current, ...res });
            if (newFullName) localStorage.setItem('fullName', newFullName);
          }
        }
        return res;
      })
    );
  }

  // Đổi mật khẩu
  changePassword(data: ChangePasswordDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/change-password`, data);
  }

  // Quên mật khẩu
  forgotPassword(data: ForgotPasswordDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/forgot-password`, data);
  }

  // Đặt lại mật khẩu
  resetPassword(data: ResetPasswordDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/reset-password`, data);
  }

  // Đăng xuất
  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe();
    this.clearLocalSession();
  }

  private clearLocalSession() {
    this.inMemoryToken = null;
    
    // Xóa sạch TẤT CẢ các key liên quan đến user để đảm bảo bảo mật
    const keysToRemove = [
      'token', 'fullName', 'email', 'roles', 
      'phoneNumber', 'address', 'avtUrl', 'isActive', 'refreshToken'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    this.currentUserSubject.next(null);
  }

  // Lấy token hiện tại (từ memory)
  getToken(): string | null {
    return this.inMemoryToken;
  }

  // Làm mới token bằng HttpOnly Cookie
  refreshToken(): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/refresh-token`, {
      accessToken: this.inMemoryToken || ''
    }, { withCredentials: true }).pipe(
      map(res => {
        if (res.isSuccess && res.token) {
          this.inMemoryToken = res.token;
          
          this.currentUserSubject.next({
            ...this.currentUserSubject.value,
            ...res,
            isSuccess: true
          });
        }
        return res;
      }),
      catchError(err => {
        return of({ isSuccess: false, message: 'Session expired' } as AuthResponseDto);
      })
    );
  }

  // Kiểm tra trạng thái đăng nhập dựa trên token trong Memory
  isLoggedIn(): boolean {
    return !!this.inMemoryToken;
  }

  // Hàm helper để lấy đường dẫn ảnh đầy đủ
  getFullImageUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = environment.uploadUrl.replace(/\/uploads$/, '');
    if (url.startsWith('/uploads') || url.startsWith('uploads')) {
      const cleanUrl = url.startsWith('/') ? url : '/' + url;
      return `${baseUrl}${cleanUrl}`;
    }
    return `${environment.uploadUrl}/avatars/${url}`;
  }
}
