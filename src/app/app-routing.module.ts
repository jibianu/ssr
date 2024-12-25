import { PublicLayoutComponent } from './layouts/public/public-layout.component';
import { AdminLayoutComponent } from './layouts/admin/admin-layout.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule, ExtraOptions } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { PageNotFoundComponent } from './modules/publicapp/page-not-found/page-not-found.component';

const routerOptions: ExtraOptions = {
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    scrollOffset: [0, 64],
    relativeLinkResolution: 'legacy'
// }{
//     scrollPositionRestoration: 'enabled',
//     anchorScrolling: 'enabled',
//     scrollOffset: [0, 64],
//     relativeLinkResolution: 'legacy'
 };

const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  
    // {path:'/page-not-found',component:PageNotFoundComponent},
  {
    path: 'app',
    component: AdminLayoutComponent,
    loadChildren: () => import('./modules/adminapp/adminapp.module').then(m => m.AdminappModule),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    component: PublicLayoutComponent,
    loadChildren: () => import('./modules/publicapp/publicapp.module').then(m => m.PublicappModule),
    // canActivate: [AuthGuard]
  },
  { path: '**', pathMatch:'full',redirectTo:'/page-not-found' }, 


];

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

