import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SlugResolverComponent } from './slug-resolver.component';

const routes: Routes = [
  { path: '', component: SlugResolverComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SlugResolverRoutingModule {}
