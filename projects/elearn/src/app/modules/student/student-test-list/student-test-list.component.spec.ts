import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentTestListComponent } from './student-test-list.component';

describe('StudentTestListComponent', () => {
  let component: StudentTestListComponent;
  let fixture: ComponentFixture<StudentTestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentTestListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentTestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
