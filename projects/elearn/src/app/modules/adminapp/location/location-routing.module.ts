import { InternalAuthGuard } from './../../../core/guards/internal-auth.guard';
import { AddLocationComponent } from './add-location/add-location.component';
import { LocationListComponent } from './location-list/location-list.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: 'list',
    component: LocationListComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'add',
    component: AddLocationComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'edit/:id',
    component: AddLocationComponent,
    canActivate: [InternalAuthGuard]
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
export class LocationRoutingModule { }
