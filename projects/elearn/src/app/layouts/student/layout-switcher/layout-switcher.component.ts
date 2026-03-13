import { Component } from '@angular/core';
import { DeviceService } from 'src/app/core/services/device.service';

/**
 * Chooses student layout by device: desktop (existing sidebar + topbar) or mobile (mobile topbar + bottom nav).
 * Does not modify desktop layout; mobile layout is separate with scoped CSS.
 */
@Component({
  selector: 'app-student-layout-switcher',
  templateUrl: './layout-switcher.component.html',
  styleUrls: ['./layout-switcher.component.scss'],
  standalone: false,
})
export class StudentLayoutSwitcherComponent {
  constructor(public device: DeviceService) {}
}
