import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MembershipApiService, MembershipStatusApi } from '../../../services/membership-api.service';
import { StudentSidebarDrawerService } from '../../../core/services/student-sidebar-drawer.service';

@Component({
  selector: 'app-student-sidebar-membership-cta',
  templateUrl: './student-sidebar-membership-cta.component.html',
  styleUrls: ['./student-sidebar-membership-cta.component.scss'],
  standalone: false,
})
export class StudentSidebarMembershipCtaComponent implements OnInit, OnDestroy {
  membershipStatus: MembershipStatusApi | null = null;
  loading = true;
  private sub = new Subscription();

  constructor(
    private membershipApi: MembershipApiService,
    private router: Router,
    private sidebarDrawer: StudentSidebarDrawerService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.membershipApi.getStatus().subscribe({
        next: (status) => {
          this.membershipStatus = status;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get isProMember(): boolean {
    const code = (this.membershipStatus?.planCode || '').toLowerCase();
    return !!this.membershipStatus?.isActiveMember && code === 'professional';
  }

  get hasStudentPlan(): boolean {
    const code = (this.membershipStatus?.planCode || '').toLowerCase();
    return !!this.membershipStatus?.isActiveMember && code === 'student';
  }

  get showCta(): boolean {
    return !this.loading && !this.isProMember;
  }

  get title(): string {
    return this.hasStudentPlan ? 'Upgrade' : 'Subscribe';
  }

  get subtitle(): string {
    return this.hasStudentPlan
      ? 'Unlock Professional Plan features'
      : 'Unlock all the features';
  }

  get buttonLabel(): string {
    return this.hasStudentPlan ? 'Go Professional' : 'View Plans';
  }

  openMembershipPage(): void {
    const queryParams = this.hasStudentPlan ? { highlight: 'professional' } : undefined;
    this.sidebarDrawer.close();
    this.router.navigate(['/app/student/membership'], { queryParams });
  }
}
