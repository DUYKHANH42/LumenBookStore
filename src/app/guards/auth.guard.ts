import { Injectable, inject } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.authService.isInitialized$.pipe(
      filter(initialized => initialized === true),
      take(1),
      map(() => {
        if (this.authService.isLoggedIn()) {
          return true;
        }
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
