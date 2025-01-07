import { LocationMetadataComponent } from './location-metadata/location-metadata.component';
import { CoursePreviewComponent } from './course-preview/course-preview.component';
import { AddCourseComponent } from './add-course/add-course.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CourseListComponent } from './course-list/course-list.component';

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
  // {
  //   path: '',
  //   redirectTo: 'list',
  //   pathMatch: 'full'
  // },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CourseRoutingModule { }
