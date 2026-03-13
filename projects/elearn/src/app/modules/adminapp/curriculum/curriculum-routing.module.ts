import { CurriculumQuestionSetQuestionsListComponent } from './curriculum-questions-set/curriculum-question-set-questions-list/curriculum-question-set-questions-list.component';
import { QuestionListComponent } from './curriculum-questions/question-list/question-list.component';
import { AddCurriculumComponent } from './add-curriculum/add-curriculum.component';
import { CurriculumListComponent } from './curriculum-list/curriculum-list.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CurriculumDetailComponent } from './curriculum-detail/curriculum-detail.component';

const routes: Routes = [
  {
    path: 'list/:courseId',
    component: CurriculumListComponent,
  },
  {
    path: 'add/:courseId',
    component: AddCurriculumComponent,
  },
  {
    path: 'edit/:curriculumId',
    component: AddCurriculumComponent,
  },
  {
    path: 'details/:curriculumId',
    component: CurriculumDetailComponent,
  },
  {
    path: 'questionlist/:questionSetId',
    component: CurriculumQuestionSetQuestionsListComponent,
  },
  // {
  //   path: '',
  //   redirectTo: 'list/:courseId',
  //   pathMatch: 'full'
  // },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CurriculumRoutingModule { }
