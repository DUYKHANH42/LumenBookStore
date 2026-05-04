import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  show: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage>({
    message: '',
    type: 'info',
    show: false
  });

  toastState$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') {
    this.toastSubject.next({ message, type, show: true });
    
    // Tự động đóng sau 3 giây
    setTimeout(() => {
      this.toastSubject.next({ ...this.toastSubject.value, show: false });
    }, 3000);
  }

  hide() {
    this.toastSubject.next({ ...this.toastSubject.value, show: false });
  }
}
