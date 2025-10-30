import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SeoTestComponent } from '../components/seo-test.component';
import { RouteSeoData } from '../interfaces/route-seo.interface';

const routes: Routes = [
  {
    path: 'seo-test',
    component: SeoTestComponent,
    data: {
      seo: {
        title: 'SEO Service Test - Oilandgasclub | Demo Page',
        description: 'Test page demonstrating the SEO service functionality with dynamic meta tag updates and structured data.',
        keywords: 'seo test, meta tags, structured data, oilandgasclub demo',
        type: 'website'
      }
    } as RouteSeoData
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SeoTestRoutingModule { }
