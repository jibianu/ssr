// import { NgModule } from '@angular/core';
// import { Routes, RouterModule } from '@angular/router';
// import { EventListComponent } from './event-list/event-list.component';
// import { AddEventComponent } from './add-event/add-event.component';
// import { EventUserListComponent } from './event-user-list/event-user-list.component';
// import { InternalAuthGuard } from 'src/app/core/guards/internal-auth.guard';

// const routes: Routes = [
//   {
//     path: 'list',
//     loadChildren: () => import('./event-list/event-list.component').then(m => m.EventListComponent),
//   },
//   {
//     path: 'add',
//     loadChildren: () => import('./add-event/add-event.component').then(m => m.AddEventComponent),
//   },
//   {
//     path: 'edit/:id',
//     loadChildren: () => import('./add-event/add-event.component').then(m => m.AddEventComponent),
//   },
//   {
//     path: 'preview',
//     loadChildren: () => import('./event-user-list/event-user-list.component').then(m => m.EventUserListComponent),
//   },
//    {
//      path: '',
//      redirectTo: 'list',
//      pathMatch: 'full'
//    },
// ];

// @NgModule({
//   imports: [RouterModule.forChild(routes)],
//   exports: [RouterModule]
// })
// export class EventRoutingModule { }
