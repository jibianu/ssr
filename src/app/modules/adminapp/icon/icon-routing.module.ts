import { AddIconComponent } from './add-icon/add-icon.component';
import { IconListComponent } from './icon-list/icon-list.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: 'list',
    component: IconListComponent,
  },
  {
    path: 'add',
    component: AddIconComponent,
  },
  {
    path: 'edit/:id',
    component: AddIconComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IconRoutingModule { }
