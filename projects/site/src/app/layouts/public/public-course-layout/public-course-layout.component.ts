import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicTopbarComponent } from '../public-topbar/public-topbar.component';
import { PublicFooterComponent } from '../public-footer/public-footer.component';

/**
 * Public marketing layout for canonical course URL.
 * Structure: site-header (topbar) + ng-content + site-footer
 */
@Component({
  selector: 'app-public-course-layout',
  standalone: true,
  imports: [CommonModule, PublicTopbarComponent, PublicFooterComponent],
  templateUrl: './public-course-layout.component.html',
  styleUrls: ['./public-course-layout.component.scss']
})
export class PublicCourseLayoutComponent {}
