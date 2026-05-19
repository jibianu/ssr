import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { RegisterCompanyComponent } from './register-company.component';
import { AuthenticationService } from '../auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

describe('RegisterCompanyComponent', () => {
  let component: RegisterCompanyComponent;
  let fixture: ComponentFixture<RegisterCompanyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReactiveFormsModule, RouterTestingModule],
      declarations: [RegisterCompanyComponent],
      providers: [
        {
          provide: AuthenticationService,
          useValue: {
            checkCompanySubdomainAvailable: () => of({ available: true }),
            registerCompany: () => of(true)
          }
        },
        {
          provide: ToasterService,
          useValue: { showError: () => {}, showSuccess: () => {} }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterCompanyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
