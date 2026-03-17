import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogRoutingModule } from './blog-routing.module';
import { BlogListComponent } from './blog-list/blog-list.component';
import { BlogAddEditComponent } from './blog-add-edit/blog-add-edit.component';
import { BlogReviewComponent } from './blog-review/blog-review.component';
import { BlogRejectModalComponent } from './blog-reject-modal/blog-reject-modal.component';
import { SharedModule } from '../../../shared/shared.module';
import { CustomEditorComponent } from '../../../shared/component/custom-editor/custom-editor.component';

@NgModule({
  declarations: [BlogListComponent, BlogAddEditComponent, BlogReviewComponent],
  imports: [
    CommonModule,
    FormsModule,
    BlogRoutingModule,
    SharedModule,
    CustomEditorComponent,
    BlogRejectModalComponent
  ]
})
export class BlogModule { }
