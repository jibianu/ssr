import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SharedModule } from '../../shared.module';
import { LessonEditorModule } from '../lesson-editor/lesson-editor.module';
import { CustomRichTextEditorComponent } from '../custom-rich-text-editor/custom-rich-text-editor.component';
import { DocumentPreviewComponent } from './document-preview/document-preview.component';
import { FileUploadPanelComponent } from './file-upload-panel/file-upload-panel.component';
import { StudyMaterialSectionAdminComponent } from './study-material-section-admin/study-material-section-admin.component';
import { StudyMaterialReaderComponent } from './study-material-reader/study-material-reader.component';
import { PdfInlineViewerComponent } from './pdf-inline-viewer/pdf-inline-viewer.component';

@NgModule({
  declarations: [
    PdfInlineViewerComponent,
    DocumentPreviewComponent,
    FileUploadPanelComponent,
    StudyMaterialSectionAdminComponent,
    StudyMaterialReaderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    SharedModule,
    LessonEditorModule,
    CustomRichTextEditorComponent
  ],
  exports: [
    CustomRichTextEditorComponent,
    DocumentPreviewComponent,
    FileUploadPanelComponent,
    StudyMaterialSectionAdminComponent,
    StudyMaterialReaderComponent
  ]
})
export class StudyMaterialModule {}
