import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

const ELEARN = (environment as { elearnAppUrl?: string }).elearnAppUrl?.replace(/\/$/, '') || '';

@Component({
  selector: 'app-elearn-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './elearn-sidebar.component.html',
  styleUrls: ['./elearn-sidebar.component.scss']
})
export class ElearnSidebarComponent {
  readonly elearn = ELEARN;
  readonly base = ELEARN ? ELEARN + '/app/student' : '';
  readonly logoUrl = (environment as { logoUrl?: string }).logoUrl || '/assets/s3/oilandgas_club.svg';
  readonly logoFallback = '/assets/s3/oilandgas_club.svg';
}
