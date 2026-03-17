import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditLoopMarketingComponent } from './edit-loop-marketing/edit-loop-marketing.component';

const routes: Routes = [
  { path: '', component: EditLoopMarketingComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoopMarketingRoutingModule {}
