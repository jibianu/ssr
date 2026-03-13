import { Component, OnInit } from '@angular/core';
import { Role } from '../../shared/models/role';

/** Same layout as trainer: shared topbar + sidebar. Sidebar shows affiliate menu (Dashboard, Profile). */
@Component({
  selector: 'app-affiliate-layout',
  templateUrl: './affiliate-layout.component.html',
  styleUrls: ['./affiliate-layout.component.scss'],
  standalone: false,
})
export class AffiliateLayoutComponent implements OnInit {
  /** Role.Affiliate so shared navbar shows affiliate sidebar menu. */
  userRole: number = Role.Affiliate;

  constructor() {}

  ngOnInit(): void {}
}
