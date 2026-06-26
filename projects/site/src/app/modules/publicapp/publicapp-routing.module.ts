import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { RouteSeoData } from '../../shared/interfaces/route-seo.interface';
import { CheckoutGuard } from '../../core/guards/checkout.guard';
import { CheckoutComponent } from './checkout/checkout.component';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';
import { RedirectToElearnComponent } from '../../core/redirect-to-elearn/redirect-to-elearn.component';
import { RedirectToAppShellComponent } from '../../core/redirect-to-app-shell/redirect-to-app-shell.component';
import { marketingPagesCanMatch } from './public-marketing/marketing-pages.can-match';

const loadCourseCatalog = () =>
  import('./public-course/public-course-feature.module').then(m => m.PublicCourseFeatureModule);

const loadMarketingPages = () =>
  import('./public-marketing/public-marketing.module').then(m => m.PublicMarketingModule);

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    data: {
      seo: {
        title: 'Oilandgasclub - Oil and Gas Learning Platform | Online Courses & Training',
        description: 'Learn oil and gas industry skills with our comprehensive online courses. Expert-led training, industry certifications, and career advancement opportunities.',
        keywords: 'oil and gas courses, petroleum engineering, energy training, online learning, industry certification',
        type: 'website'
      }
    } as RouteSeoData
  },
  { path: 'courses', loadChildren: loadCourseCatalog },
  { path: 'list', loadChildren: () => import('./public-course/public-course-list-lazy.module').then(m => m.PublicCourseListLazyModule) },
  { path: 'events', loadChildren: () => import('../publicapp/public-event/public-event.module').then(m => m.PublicEventModule) },
  {
    path: 'blog',
    loadChildren: () => import('./blog/blog.module').then(m => m.BlogModule)
  },
  {
    path: 'category',
    loadChildren: () => import('./public-course/public-category-lazy.module').then(m => m.PublicCategoryLazyModule)
  },
  {
    path: 'course',
    loadChildren: () => import('./public-course/public-course-redirect-lazy.module').then(m => m.PublicCourseRedirectLazyModule)
  },
  {
    path: 'checkout/:courseId',
    canActivate: [CheckoutGuard],
    component: CheckoutComponent
  },
  {
    path: 'payment/success',
    component: PaymentSuccessComponent
  },
  {
    path: 'sso-callback',
    component: RedirectToElearnComponent
  },
  { path: 'dashboard', component: RedirectToAppShellComponent },
  { path: 'company', component: RedirectToAppShellComponent },
  { path: 'admin', component: RedirectToAppShellComponent },
  { path: 'trainer', component: RedirectToAppShellComponent },
  { path: 'student', component: RedirectToAppShellComponent },
  { path: 'management', component: RedirectToAppShellComponent },
  { path: 'affiliate', component: RedirectToAppShellComponent },
  {
    path: '',
    loadChildren: loadMarketingPages,
    canMatch: [marketingPagesCanMatch],
  },
  {
    path: 'page-not-found',
    component: PageNotFoundComponent,
    data: {
      seo: {
        title: 'Page Not Found - Oilandgasclub',
        description: 'The page you are looking for could not be found. Return to our homepage or browse our courses.',
        type: 'website',
        robots: 'noindex, follow'
      }
    } as RouteSeoData
  },
  {
    path: ':slug',
    loadChildren: () => import('./slug-resolver/slug-resolver.module').then(m => m.SlugResolverModule),
    data: { skipRouteLocalization: true }
  },
  {
    path: '**',
    redirectTo: 'page-not-found'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicappRoutingModule {}
