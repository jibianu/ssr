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
    initialNavigation: 'enabledBlocking'
};

export const routes: Routes = [
    {
        path: '',
        component: PublicLayoutComponent,
        children: [
            {
                path: '',
                loadChildren: () => import('./modules/publicapp/publicapp.module').then(m => m.PublicappModule)
            },
            {
                path: 'auth',
                loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
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
    { 
        path: 'page-not-found', 
        component: PageNotFoundComponent 
    },
    { 
        path: '**', 
        redirectTo: 'page-not-found' 
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
