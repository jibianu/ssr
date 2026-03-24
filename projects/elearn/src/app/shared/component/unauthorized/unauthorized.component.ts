import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService, ROLE_LANDING_ROUTES } from '../../../modules/auth/auth.service';

/**
 * Shown when user tries to access a route they are not authorized for (RoleGuard).
 */
@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss'],
  standalone: false
})
export class UnauthorizedComponent {
  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  goToLogin(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goHome(): void {
    const roleId = this.authService.getRoleId();
    const route = roleId != null ? ROLE_LANDING_ROUTES[roleId] : null;
    if (route) {
      this.router.navigate([route]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
