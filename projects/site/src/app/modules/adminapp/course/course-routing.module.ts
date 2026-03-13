import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // ✅ FIX: Put redirect FIRST to ensure it matches before other routes
  // This ensures /app/course redirects to /app/course/list immediately
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadChildren: () => import('./course-list/course-list.module').then(
      m => {
        console.log('[CourseRoutingModule] ✅ CourseListModule loaded successfully');
        return m.CourseListModule;
      },
      error => {
        console.error('[CourseRoutingModule] ❌ Failed to load CourseListModule:', error);
        console.error('[CourseRoutingModule]   Error details:', error?.message, error?.stack);
        throw error; // Re-throw to let Angular handle it
      }
    ),
  },
  {
    path: 'add',
    loadChildren: () => import('./add-course/add-course.module').then(
      m => m.AddCourseModule,
      error => {
        console.error('[CourseRoutingModule] ❌ Failed to load AddCourseModule:', error);
        throw error;
      }
    ),
  },
  {
    path: 'edit/:id',
    loadChildren: () => import('./add-course/add-course.module').then(
      m => m.AddCourseModule,
      error => {
        console.error('[CourseRoutingModule] ❌ Failed to load AddCourseModule:', error);
        throw error;
      }
    ),
  },
  {
    path: 'preview',
    loadChildren: () => import('./course-preview/course-preview.module').then(
      m => m.CoursePreviewModule,
      error => {
        console.error('[CourseRoutingModule] ❌ Failed to load CoursePreviewModule:', error);
        throw error;
      }
    ),
  },
  {
    path: 'location',
    loadChildren: () => import('./location-metadata/locationmetadata.module').then(
      m => m.LocationMetadataModule,
      error => {
        console.error('[CourseRoutingModule] ❌ Failed to load LocationMetadataModule:', error);
        throw error;
      }
    ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CourseRoutingModule { }
