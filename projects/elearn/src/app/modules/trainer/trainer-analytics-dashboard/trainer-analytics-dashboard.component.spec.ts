import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainerAnalyticsDashboardComponent } from './trainer-analytics-dashboard.component';
import { TrainerDashboardApiService } from '../trainer-dashboard-api.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';

describe('TrainerAnalyticsDashboardComponent', () => {
  let component: TrainerAnalyticsDashboardComponent;
  let fixture: ComponentFixture<TrainerAnalyticsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TrainerAnalyticsDashboardComponent],
      providers: [
        ChangeDetectorRef,
        {
          provide: TrainerDashboardApiService,
          useValue: {
            getSummary: () => of({ totalCoursesCreated: 0, totalCoursesEdited: 0, totalPurchases: 0, totalRevenue: 0 }),
            getPurchasesChart: () => of({ data: [] }),
            getCourseActivityChart: () => of({ created: [], edited: [] }),
            getActivityTable: () => of({ results: [], totalCount: 0 }),
          },
        },
        {
          provide: SharedService,
          useValue: { certificateName: { next: () => {} }, showTrainerDashboardToolbar: { next: () => {} } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainerAnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
