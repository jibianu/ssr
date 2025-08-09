import { SharedModule } from 'src/app/shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IconRoutingModule } from './icon-routing.module';
import { IconListComponent } from './icon-list/icon-list.component';
import { AddIconComponent } from './add-icon/add-icon.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from "ngx-pagination";
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [IconListComponent, AddIconComponent],
  imports: [
    CommonModule,
    IconRoutingModule,
    ReactiveFormsModule,
    SharedModule,
    NgxPaginationModule,
    FormsModule
]
})
export class IconModule { }
