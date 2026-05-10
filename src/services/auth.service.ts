import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthResponseDto, LoginDto, RegisterDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from '../app/models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;
  
  private currentUserSubject = new BehaviorSubject<AuthResponseDto | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private inMemoryToken: string | null = null;

  constructor() {
    const fullName = localStorage.getItem('fullName');
    const email = localStorage.getItem('email');

    // Mặc định khởi tạo user với trạng thái có thể chưa đầy đủ (sẽ được cập nhật sau khi refresh token)
    if (fullName || email) {
      const roles = localStorage.getItem('roles');
      this.currentUserSubject.next({
        isSuccess: true,
        message: 'Loaded basic info from storage',
        token: undefined,
        fullName: fullName || undefined,
        email: email || undefined,
        address: localStorage.getItem('address') || undefined,
        phoneNumber: localStorage.getItem('phoneNumber') || undefined,
        avtUrl: localStorage.getItem('avtUrl') || undefined,
        isActive: localStorage.getItem('isActive') === 'true',
        roles: roles ? JSON.parse(roles) : undefined
      });
    }
  }

  // Đăng nhập
  login(data: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, data, { withCredentials: true }).pipe(
      map(res => {
        if (res.isSuccess && res.token) {
          this.inMemoryToken = res.token;
          
          if (res.fullName) localStorage.setItem('fullName', res.fullName);
          if (res.email) localStorage.setItem('email', res.email);
          if (res.address) localStorage.setItem('address', res.address);
          if (res.phoneNumber) localStorage.setItem('phoneNumber', res.phoneNumber);
          if (res.avtUrl) localStorage.setItem('avtUrl', res.avtUrl);
          if (res.isActive !== undefined) {
            localStorage.setItem('isActive', String(res.isActive));
          }
          if (res.roles) {
            localStorage.setItem('roles', JSON.stringify(res.roles));
          }
          
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

  // Cập nhật thông tin cá nhân
  updateProfile(formData: FormData): Observable<AuthResponseDto> {
    return this.http.put<any>(`${this.apiUrl}/update-profile`, formData).pipe(
      map(res => {
        if (res.isSuccess || res.IsSuccess) {
          // Lấy dữ liệu bất kể là PascalCase hay camelCase từ Server
          const newAvt = res.avtUrl || res.AvtUrl;
          const newFullName = res.fullName || res.FullName;
          const newPhone = res.phoneNumber || res.PhoneNumber;
          const newIsActive = res.isActive !== undefined ? res.isActive : res.IsActive;

          const current = this.currentUserSubject.value;
          if (current) {
            const updated = { 
              ...current, 
              fullName: newFullName || current.fullName,
              phoneNumber: newPhone || current.phoneNumber,
              avtUrl: newAvt || current.avtUrl,
              isActive: newIsActive !== undefined ? newIsActive : current.isActive
            };
            this.currentUserSubject.next(updated);
            
            // Cập nhật LocalStorage
            if (newFullName) localStorage.setItem('fullName', newFullName);
            if (newPhone) localStorage.setItem('phoneNumber', newPhone);
            if (newAvt) localStorage.setItem('avtUrl', newAvt);
            if (newIsActive !== undefined) localStorage.setItem('isActive', String(newIsActive));
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

  // Kiểm tra email trùng (Async Validator)
  checkEmailExists(email: string): Observable<boolean> {
    if (!email) return of(false);
    return this.http.get<boolean>(`${this.apiUrl}/check-email?email=${email}`).pipe(
      catchError(() => of(false))
    );
  }

  // Đăng xuất
  logout() {
    // Xóa session tại Client ngay lập tức để chặn đứng việc đính kèm Token đã hết hạn vào các Request tiếp theo
    this.clearLocalSession();
    
    // Sau đó thông báo lên server để hủy HTTP-Only Cookie (nếu có)
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe();
  }

  private clearLocalSession() {
    this.inMemoryToken = null;
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('address');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('avtUrl');
    localStorage.removeItem('isActive');
    localStorage.removeItem('roles');
    this.currentUserSubject.next(null);
  }

  // Lấy token hiện tại (từ memory)
  getToken(): string | null {
    return this.inMemoryToken;
  }

  // Làm mới token
  refreshToken(): Observable<AuthResponseDto> {
    // Không cần gửi RefreshToken vì đã nằm trong HttpOnly cookie
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/refresh-token`, {
      accessToken: this.inMemoryToken || ''
    }, { withCredentials: true }).pipe(
      map(res => {
        if (res.isSuccess && res.token) {
          this.inMemoryToken = res.token;
          
          if (res.fullName) localStorage.setItem('fullName', res.fullName);
          if (res.email) localStorage.setItem('email', res.email);
          if (res.phoneNumber) localStorage.setItem('phoneNumber', res.phoneNumber);
          if (res.roles) localStorage.setItem('roles', JSON.stringify(res.roles));
          
          this.currentUserSubject.next({
            ...this.currentUserSubject.value,
            ...res
          });
        }
        return res;
      })
    );
  }

  // Kiểm tra trạng thái đăng nhập
  isLoggedIn(): boolean {
    return !!this.inMemoryToken;
  }

  // Hàm helper để lấy đường dẫn ảnh đầy đủ
  getFullImageUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    
    // Sử dụng uploadUrl từ environment
    const baseUrl = environment.uploadUrl.replace(/\/uploads$/, '');
    
    // Nếu url đã bắt đầu bằng /uploads thì chỉ cần thêm domain
    if (url.startsWith('/uploads') || url.startsWith('uploads')) {
      const cleanUrl = url.startsWith('/') ? url : '/' + url;
      return `${baseUrl}${cleanUrl}`;
    }
    
    // Mặc định giả định nó nằm trong thư mục uploads/avatars
    return `${environment.uploadUrl}/avatars/${url}`;
  }
}
