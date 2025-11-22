import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminLayoutComponent } from './layouts/admin/admin-layout.component';
import { PublicLayoutComponent } from './layouts/public/public-layout.component';
import { PageNotFoundComponent } from './modules/publicapp/page-not-found/page-not-found.component';

const routerOptions: ExtraOptions = {
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    scrollOffset: [0, 64],
    initialNavigation: 'enabledBlocking',
    enableTracing: true // ✅ DEBUG: Enable router tracing to see route matching
};

export const routes: Routes = [
    {
        path: '',
        component: PublicLayoutComponent,
        children: [
            // ✅ CRITICAL: Auth route MUST come before empty path to ensure /auth/login is matched correctly
            {
                path: 'auth',
                loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
            },
                {
        path: 'app',
        component: AdminLayoutComponent,
        loadChildren: () => import('./modules/adminapp/adminapp.module').then(m => m.AdminappModule),
        canActivate: [AuthGuard]
    },
            // Public app routes (empty path matches everything else)
            {
                path: '',
                loadChildren: () => import('./modules/publicapp/publicapp.module').then(m => m.PublicappModule)
            }
        ]
    },
    {
        path: 'app',
        component: AdminLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                loadChildren: () => import('./modules/adminapp/adminapp.module').then(m => m.AdminappModule)
            }
            
        ]
    },
    
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
