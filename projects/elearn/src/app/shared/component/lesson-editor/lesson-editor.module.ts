import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LessonEditorComponent } from './lesson-editor.component';
import { TextBlockComponent } from './text-block/text-block.component';
import { VideoBlockComponent } from './video-block/video-block.component';
import { QuizBlockComponent } from './quiz-block/quiz-block.component';
import { AssignmentBlockComponent } from './assignment-block/assignment-block.component';
import { AutoGrowDirective } from './auto-grow.directive';
@NgModule({
  declarations: [
    LessonEditorComponent,
    TextBlockComponent,
    VideoBlockComponent,
    QuizBlockComponent,
    AssignmentBlockComponent
  ],
  imports: [CommonModule, FormsModule, AutoGrowDirective],
  exports: [LessonEditorComponent]
})
export class LessonEditorModule {}
