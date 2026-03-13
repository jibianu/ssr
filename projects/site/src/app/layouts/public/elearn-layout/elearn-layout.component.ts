import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ElearnSidebarComponent } from '../elearn-sidebar/elearn-sidebar.component';
import { ElearnTopbarComponent } from '../elearn-topbar/elearn-topbar.component';
import { ElearnFooterComponent } from '../elearn-footer/elearn-footer.component';

/**
 * LMS layout for /:courseId and elearn/course/:id.
 * Reuses existing components only: Elearn Header (topbar), Elearn Sidebar, Course Content (ng-content).
 * No new header or sidebar components; public site header/footer are hidden by PublicLayout when this is shown.
 */
@Component({
  selector: 'app-elearn-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ElearnSidebarComponent,
    ElearnTopbarComponent,
    ElearnFooterComponent
  ],
  templateUrl: './elearn-layout.component.html',
  styleUrls: ['./elearn-layout.component.scss']
})
export class ElearnLayoutComponent {}
