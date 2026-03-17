import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AdminLayoutComponent } from './admin/admin-layout.component';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './admin/sidebar/sidebar.component';
import { TopbarComponent } from './admin/topbar/topbar.component';
import { FooterComponent } from './admin/footer/footer.component';
import { PublicLayoutComponent } from './public/public-layout.component';
import { PublicTopbarComponent } from './public/public-topbar/public-topbar.component';
import { PublicFooterComponent } from './public/public-footer/public-footer.component';
import { CommonComponent } from './common/common.component';
import { CommonTopbarComponent } from './common/common-topbar/common-topbar.component';
import { CommonSidebarComponent } from './common/common-sidebar/common-sidebar.component';
import { SharedNavbarComponent } from './shared-navbar/shared-navbar.component';
import { TrainerLayoutComponent } from './trainer/trainer-layout.component';
import { AffiliateLayoutComponent } from './affiliate/affiliate-layout.component';
import { CompanyLayoutComponent } from './company/company-layout.component';
import { ManagementLayoutComponent } from './management/management-layout.component';
import { StudentLayoutComponent } from './student/student-layout.component';
import { StudentLayoutSwitcherComponent } from './student/layout-switcher/layout-switcher.component';
import { StudentDesktopLayoutComponent } from './student/student-desktop-layout/student-desktop-layout.component';
import { StudentMobileLayoutComponent } from './student/student-mobile-layout/student-mobile-layout.component';
import { StudentBreadcrumbComponent } from './student/student-breadcrumb/student-breadcrumb.component';
import { SharedModule } from '../shared/shared.module';
import { ElearnLayoutWrapperComponent } from '../modules/publicapp/course-layout-switcher/elearn-layout-wrapper/elearn-layout-wrapper.component';
import { BlogSectionTabsComponent } from './blog-section-tabs/blog-section-tabs.component';

@NgModule({
  declarations: [
    BlogSectionTabsComponent,
    AdminLayoutComponent,
    SidebarComponent,
    TopbarComponent,
    FooterComponent,
    PublicLayoutComponent,
    PublicTopbarComponent,
    PublicFooterComponent,
    CommonComponent,
    CommonTopbarComponent,
    CommonSidebarComponent,
    SharedNavbarComponent,
    TrainerLayoutComponent,
    AffiliateLayoutComponent,
    CompanyLayoutComponent,
    ManagementLayoutComponent,
    StudentLayoutComponent,
    StudentLayoutSwitcherComponent,
    StudentDesktopLayoutComponent,
    StudentMobileLayoutComponent,
    StudentBreadcrumbComponent,
    ElearnLayoutWrapperComponent,
  ],
  imports: [
    CommonModule,
    NgOptimizedImage,
    RouterModule,
    NgbModule,
    SharedModule
  ],
  exports: [
    PublicTopbarComponent,
    PublicFooterComponent,
    CommonTopbarComponent,
    ElearnLayoutWrapperComponent
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class LayoutsModule { }
