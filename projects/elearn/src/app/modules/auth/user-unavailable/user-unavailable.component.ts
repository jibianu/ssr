import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../auth.service';

/**
 * Placeholder: post-login user validation not in use. Shows message and logout.
 */
@Component({
  selector: 'app-user-unavailable',
  templateUrl: './user-unavailable.component.html',
  styleUrls: ['./user-unavailable.component.scss'],
  standalone: false
})
export class UserUnavailableComponent {
  message = 'User is not available. Please contact support.';

  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
