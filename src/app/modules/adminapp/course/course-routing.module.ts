import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'list',
    loadChildren: () => import('./course-list/course-list.module').then(m => m.CourseListModule),
  },
  {
    path: 'add',
    loadChildren: () => import('./add-course/add-course.module').then(m => m.AddCourseModule),
  },
  {
    path: 'edit/:id',
    loadChildren: () => import('./add-course/add-course.module').then(m => m.AddCourseModule),
  },
  {
    path: 'preview',
    loadChildren: () => import('./course-preview/course-preview.module').then(m => m.CoursePreviewModule),
  },
  {
    path: 'location',
    loadChildren: () => import('./location-metadata/locationmetadata.module').then(m => m.LocationMetadataModule),
  },
   {
     path: '',
     redirectTo: 'list',
     pathMatch: 'full'
   },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CourseRoutingModule { }
