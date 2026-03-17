import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LoopMarketingRoutingModule } from './loop-marketing-routing.module';
import { EditLoopMarketingComponent } from './edit-loop-marketing/edit-loop-marketing.component';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  declarations: [EditLoopMarketingComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoopMarketingRoutingModule,
    SharedModule
  ]
})
export class LoopMarketingModule {}
