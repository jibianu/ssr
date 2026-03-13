import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NavbarMenuItem } from '../../../config/navbar-menu.config';

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

  constructor(private router: Router) {}

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

  /** Navigate on sidebar link click so routing works reliably from admin layout. */
  onNavClick(event: Event, item: NavbarMenuItem): void {
    event.preventDefault();
    const url = item.fragment ? `${item.link}#${item.fragment}` : item.link;
    this.router.navigateByUrl(url);
  }
}
