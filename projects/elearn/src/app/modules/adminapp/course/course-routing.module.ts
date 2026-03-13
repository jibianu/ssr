import { LocationMetadataComponent } from './location-metadata/location-metadata.component';
import { AddCourseComponent } from './add-course/add-course.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CourseListComponent } from './course-list/course-list.component';

const routes: Routes = [
  {
    path: 'list',
    component: CourseListComponent,
  },
  {
    path: 'add',
    component: AddCourseComponent,
  },
  {
    path: 'edit/:id',
    component: AddCourseComponent,
  },
  {
    path: 'location',
    component: LocationMetadataComponent
  },
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'curriculum',
    loadChildren:() => import('./../curriculum/curriculum.module').then(m => m.CurriculumModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CourseRoutingModule { }
