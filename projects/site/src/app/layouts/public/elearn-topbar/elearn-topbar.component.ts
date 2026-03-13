import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { CourseHeaderContextService } from 'src/app/core/services/course-header-context.service';

@Component({
  selector: 'app-elearn-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './elearn-topbar.component.html',
  styleUrls: ['./elearn-topbar.component.scss']
})
export class ElearnTopbarComponent {
  private readonly headerContextService = inject(CourseHeaderContextService);
  readonly context$ = this.headerContextService.getContext$();
  readonly elearnUrl = (environment as { elearnAppUrl?: string }).elearnAppUrl?.replace(/\/$/, '') || '';
  readonly logoUrl = (environment as { logoUrl?: string }).logoUrl || '/assets/s3/oilandgas_club.svg';
  readonly logoFallback = '/assets/s3/oilandgas_club.svg';
}
