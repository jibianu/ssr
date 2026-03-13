import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RedirectToElearnComponent } from './core/redirect-to-elearn/redirect-to-elearn.component';
import { AdminLayoutComponent } from './layouts/admin/admin-layout.component';
import { PublicLayoutComponent } from './layouts/public/public-layout.component';
import { ElearnLayoutComponent } from './layouts/public/elearn-layout/elearn-layout.component';
import { CourseByIdResolver } from './modules/publicapp/public-course/course-by-id.resolver';

const routerOptions: ExtraOptions = {
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    scrollOffset: [0, 64],
    initialNavigation: 'enabledBlocking',
    enableTracing: false // Set true only for local route debugging
};

export const routes: Routes = [
    // ✅ ADMIN ROUTES: Admin routes with AdminLayoutComponent (no footer)
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
    // ✅ ELEARN COURSE ROUTE: Same course content, Elearn layout (header, sidebar, footer). Canonical still points to public URL.
    {
        path: 'elearn',
        component: ElearnLayoutComponent,
        children: [
            {
                path: 'course/:id',
                resolve: { course: CourseByIdResolver },
                loadChildren: () => import('./modules/elearn-course/elearn-course.module').then(m => m.ElearnCourseModule)
            }
        ]
    },
    // ✅ PUBLIC ROUTES: Public routes with PublicLayoutComponent (includes footer)
    {
        path: '',
        component: PublicLayoutComponent,
        children: [
            { path: 'login', component: RedirectToElearnComponent },
            {
                path: 'auth',
                children: [
                    { path: '', pathMatch: 'full', component: RedirectToElearnComponent },
                    { path: 'login', component: RedirectToElearnComponent },
                    { path: 'register', component: RedirectToElearnComponent },
                    { path: '**', component: RedirectToElearnComponent }
                ]
            },
            {
                path: '',
                loadChildren: () => import('./modules/publicapp/publicapp.module').then(m => m.PublicappModule)
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
