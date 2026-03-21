import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SlugResolverComponent } from './slug-resolver.component';
import { slugPageResolver } from './slug-page.resolver';

const routes: Routes = [
  {
    path: '',
    component: SlugResolverComponent,
    resolve: { slugPage: slugPageResolver }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SlugResolverRoutingModule {}
