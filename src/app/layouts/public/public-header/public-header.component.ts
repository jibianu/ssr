import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicTopbarComponent } from '../public-topbar/public-topbar.component';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [CommonModule, PublicTopbarComponent],
  template: `<app-public-topbar></app-public-topbar>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicHeaderComponent {}

