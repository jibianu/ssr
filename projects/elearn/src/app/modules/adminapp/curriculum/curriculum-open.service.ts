import { Injectable } from '@angular/core';

/**
 * Holds the curriculum ID to open in the sidebar after add.
 * Used to open the curriculum modal when navigating back from Add Curriculum
 * without using router query params (which could cause auth issues).
 */
@Injectable({ providedIn: 'root' })
export class CurriculumOpenService {
  private _curriculumIdToOpen: string | null = null;

  setCurriculumToOpen(id: string | null): void {
    this._curriculumIdToOpen = id;
  }

  getAndClearCurriculumToOpen(): string | null {
    const id = this._curriculumIdToOpen;
    this._curriculumIdToOpen = null;
    return id;
  }
}
