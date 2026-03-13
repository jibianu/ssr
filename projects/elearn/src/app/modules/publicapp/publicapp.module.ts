import { SharedModule } from 'src/app/shared/shared.module';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PublicappRoutingModule } from './publicapp-routing.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    PublicappRoutingModule,
    SharedModule
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
})
export class PublicappModule { }
