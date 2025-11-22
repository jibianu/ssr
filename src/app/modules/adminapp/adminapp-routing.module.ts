import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: 'user', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
  { 
    path: 'course', 
    loadChildren: () => import('./course/course.module').then(
      m => {
        console.log('[AdminappRoutingModule] ✅ CourseModule loaded successfully');
        return m.CourseModule;
      },
      error => {
        console.error('[AdminappRoutingModule] ❌ Failed to load CourseModule:', error);
        console.error('[AdminappRoutingModule]   Error details:', error?.message, error?.stack);
        throw error; // Re-throw to let Angular handle it
      }
    )
  },
  { path: 'category', loadChildren: () => import('./category/category.module').then(m => m.CategoryModule) },
  { path: 'location', loadChildren: () => import('./location/location.module').then(m => m.LocationModule) },
  { path: 'icon', loadChildren: () => import('./icon/icon.module').then(m => m.IconModule) },
  { path: 'event', loadChildren: () => import('./event/event.module').then(m => m.EventModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminappRoutingModule { }
