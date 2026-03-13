import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedCurriculumListComponent } from './shared-curriculum-list.component';

describe('SharedCurriculumListComponent', () => {
  let component: SharedCurriculumListComponent;
  let fixture: ComponentFixture<SharedCurriculumListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SharedCurriculumListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SharedCurriculumListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
