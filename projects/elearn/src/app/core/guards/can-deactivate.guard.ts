import { Injectable } from '@angular/core';
import { PracticeQuestionsComponent } from 'src/app/sharedModules/practice-questions/practice-questions.component';
import { ConfirmationService } from '../services/confirmation.service';

@Injectable({
  providedIn: 'root'
})
export class CanDeactivateGuard {

  constructor(private confirmation: ConfirmationService) {}

  async canDeactivate(component: PracticeQuestionsComponent): Promise<boolean> {
    if (component.forceClose) {
      return true;
    }
    return this.confirmation.confirm({
      title: 'Leave this page?',
      message: 'Your progress may not be saved. Are you sure you want to leave?',
      confirmStyle: 'default',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay'
    });
  }
}
