import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticationService } from '../../../modules/auth/auth.service';
import { AdminAppService } from '../../../modules/adminapp/adminapp.service';
import { Role } from '../../../shared/models/role';
import { getNavbarMenuForRole, NavbarMenuItem } from '../../../config/navbar-menu.config';

/** Common sidebar: menu items from permission-based config (Admin, Trainer, Company, Management). */
@Component({
  selector: 'app-common-sidebar',
  templateUrl: './common-sidebar.component.html',
  styleUrls: ['./common-sidebar.component.scss'],
  standalone: false,
})
export class CommonSidebarComponent implements OnInit, OnDestroy {
  menuItems: NavbarMenuItem[] = [];
  private sub = new Subscription();

  constructor(
    private authService: AuthenticationService,
    private appService: AdminAppService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const roleId = this.authService.getRoleId();
    this.menuItems = getNavbarMenuForRole(roleId);

    if (roleId === Role.Manager) {
      this.sub.add(
        this.appService.getMyManagementPermissions().subscribe({
          next: (perms: string[]) => {
            const allowed = new Set(perms || []);
            const full = getNavbarMenuForRole(Role.Manager);
            this.menuItems = full.filter((m) => !m.permission || allowed.has(m.permission));
          },
          error: () => {
            this.menuItems = getNavbarMenuForRole(Role.Manager);
          },
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
