import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AdminLayoutComponent } from './admin/admin-layout.component';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './admin/sidebar/sidebar.component';
import { TopbarComponent } from './admin/topbar/topbar.component';
import { FooterComponent } from './admin/footer/footer.component';
import { PublicLayoutComponent } from './public/public-layout.component';
import { PublicTopbarComponent } from './public/public-topbar/public-topbar.component';
import { PublicFooterComponent } from './public/public-footer/public-footer.component';

@NgModule({
  declarations: [AdminLayoutComponent, SidebarComponent, TopbarComponent, FooterComponent, PublicLayoutComponent, PublicTopbarComponent, PublicFooterComponent],
  imports: [
    CommonModule,
    RouterModule,
    NgbModule
  ], schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class LayoutsModule { }
