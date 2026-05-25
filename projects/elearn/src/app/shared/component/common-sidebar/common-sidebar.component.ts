import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NavbarMenuItem } from '../../../config/navbar-menu.config';
import { menuLinkToRouterCommands } from '../../../core/helpers/app-url.helper';
import { AuthenticationService } from '../../../modules/auth/auth.service';
import { Role } from '../../../shared/models/role';

/** Common sidebar for Admin, Trainer, Company, Management. Menu items come from permission-based config. */
@Component({
  selector: 'app-navbar-sidebar',
  templateUrl: './common-sidebar.component.html',
  styleUrls: ['./common-sidebar.component.scss'],
  standalone: false,
})
export class CommonSidebarComponent implements OnChanges {
  @Input() menuItems: NavbarMenuItem[] = [];
  @Input() userDisplayName = '';
  @Input() userEmail = '';
  /** Optional user profile image URL; falls back to initial letter if not set or image fails. */
  @Input() userImageUrl: string | null = null;
  @Input() sidebarToggled = false;

  /** Set when avatar image fails to load. */
  avatarImageError = false;

  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  /** Admin uses topbar user menu for profile/logout — hide duplicate links in sidebar. */
  get showSidebarAccountActions(): boolean {
    const roleId = this.authService.getRoleId();
    return roleId !== Role.Admin && roleId !== Role.Manager;
  }

  get profileLink(): string {
    const roleId = this.authService.getRoleId();
    if (roleId === Role.Affiliate) return '/app/affiliate/profile';
    if (roleId === Role.Trainer) return '/app/trainer/profile';
    return '/app/profile';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userImageUrl']) {
      this.avatarImageError = false;
    }
  }

  /** First letter of user name for avatar fallback. */
  get userInitial(): string {
    const name = (this.userDisplayName || this.userEmail || '?').trim();
    return (name.charAt(0) || '?').toUpperCase();
  }

  routerCommands(link: string): string[] {
    return menuLinkToRouterCommands(link);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
