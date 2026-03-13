import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticeQuestionsComponent } from './practice-questions.component';

describe('PracticeQuestionsComponent', () => {
  let component: PracticeQuestionsComponent;
  let fixture: ComponentFixture<PracticeQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PracticeQuestionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PracticeQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
