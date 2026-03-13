import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionsBankComponent } from './questions-bank.component';

describe('QuestionsBankComponent', () => {
  let component: QuestionsBankComponent;
  let fixture: ComponentFixture<QuestionsBankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuestionsBankComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionsBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
