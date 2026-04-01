import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { first } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import { AdminAffiliateApiService, AdminAffiliateCourseOption, AdminAffiliateListItem, AdminAffiliateDetail } from '../admin-affiliate-api.service';

@Component({
  selector: 'app-affiliate-allow-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './allow-courses.component.html',
  styleUrls: ['./allow-courses.component.scss'],
})
export class AllowCoursesComponent implements OnInit, OnDestroy {
  readonly ALL_USERS_ID = '__all__';
  affiliates: AdminAffiliateListItem[] = [];
  courses: AdminAffiliateCourseOption[] = [];
  selectedAffiliateId = '';
  loading = false;
  saving = false;

  /** When true, affiliate can promote all published courses. */
  allowAllCourses = true;
  /** Explicit allowlist (used only when allowAllCourses=false). */
  allowedCourseIds = new Set<string>();
  dirty = false;

  private sub = new Subscription();

  constructor(
    private api: AdminAffiliateApiService,
    private sharedService: SharedService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Allow courses');
    // Show the topbar button on this page too (same permission gate already handled elsewhere).
    this.sharedService.showAffiliateAllowCoursesButton.next(true);
    this.load();
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
    this.sharedService.showAffiliateAllowCoursesButton.next(false);
    this.sub.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.dirty = false;
    this.allowAllCourses = true;
    this.allowedCourseIds.clear();

    this.api.getList().pipe(first()).subscribe({
      next: (list) => {
        this.affiliates = Array.isArray(list) ? list : [];
        // Always reset selection to "All users" on refresh/page load.
        this.selectedAffiliateId = this.ALL_USERS_ID;
        this.loadCourses();
      },
      error: () => {
        this.loading = false;
        this.affiliates = [];
        this.toaster.showError('Failed to load affiliates.');
      },
    });
  }

  enableIndividualAffiliates(): void {
    // no-op (individual selection removed)
  }

  private loadCourses(): void {
    this.api.getPublishedCoursesForSelection().pipe(first()).subscribe({
      next: (courses) => {
        this.courses = Array.isArray(courses) ? courses : [];
        this.loading = false;
        // In "All users" mode, show the saved allowlist by loading any one affiliate's current allowlist.
        // (Bulk-save writes the same allowlist to all affiliates.)
        if (this.selectedAffiliateId === this.ALL_USERS_ID) {
          const anyAffiliateId = this.affiliates?.[0]?.id;
          if (anyAffiliateId) this.loadAllowedForAffiliate(anyAffiliateId);
          return;
        }
        if (this.selectedAffiliateId) this.loadAllowedForAffiliate(this.selectedAffiliateId);
      },
      error: () => {
        this.courses = [];
        this.loading = false;
        this.toaster.showError('Failed to load courses.');
      },
    });
  }

  onAffiliateChange(): void {
    if (!this.selectedAffiliateId) return;
    if (this.selectedAffiliateId === this.ALL_USERS_ID) {
      // Bulk mode: admin can select courses then Save applies to all affiliates.
      this.saving = false;
      this.dirty = false;
      this.allowAllCourses = true;
      this.allowedCourseIds.clear();
      return;
    }
    this.loadAllowedForAffiliate(this.selectedAffiliateId);
  }

  private loadAllowedForAffiliate(affiliateId: string): void {
    this.saving = false;
    this.dirty = false;
    this.allowAllCourses = true;
    this.allowedCourseIds.clear();
    this.api.getDetails(affiliateId).pipe(first()).subscribe({
      next: (detail: AdminAffiliateDetail) => {
        const ids = detail.allowedCourseIds ?? [];
        if (ids.length > 0) {
          this.allowAllCourses = false;
          this.allowedCourseIds = new Set<string>(ids.map((x) => String(x)));
        } else {
          // Empty list means "allow all" (no restriction)
          this.allowAllCourses = true;
          this.allowedCourseIds.clear();
        }
        this.dirty = false;
      },
      error: () => {
        this.toaster.showError('Failed to load affiliate details.');
      },
    });
  }

  isAllowed(courseId: string): boolean {
    if (this.allowAllCourses) return true;
    return this.allowedCourseIds.has(String(courseId));
  }

  toggle(courseId: string, checked: boolean): void {
    const id = String(courseId);
    if (this.allowAllCourses) {
      // If currently "allow all", unchecking a single course should convert to an explicit allowlist (all minus this course).
      if (!checked) {
        this.allowAllCourses = false;
        this.allowedCourseIds = new Set<string>((this.courses ?? []).map((c) => String(c.id)));
        this.allowedCourseIds.delete(id);
      } else {
        // already allowed; no state change needed
      }
      this.dirty = true;
      return;
    }

    if (checked) this.allowedCourseIds.add(id);
    else this.allowedCourseIds.delete(id);
    this.dirty = true;
  }

  allowAll(): void {
    this.allowAllCourses = true;
    this.allowedCourseIds.clear();
    this.dirty = true;
  }

  save(): void {
    if (!this.selectedAffiliateId || this.saving || !this.dirty) return;
    this.saving = true;
    const ids = this.allowAllCourses ? [] : Array.from(this.allowedCourseIds);
    if (this.selectedAffiliateId === this.ALL_USERS_ID) {
      const targets = (this.affiliates ?? []).map((a) => a.id).filter(Boolean);
      if (!targets.length) {
        this.saving = false;
        this.toaster.showError('No affiliates found.');
        return;
      }
      forkJoin(targets.map((id) => this.api.updateCommission(id, { allowedCourseIds: ids }))).pipe(first()).subscribe({
        next: () => {
          this.saving = false;
          this.dirty = false;
          this.toaster.showSuccess('Allowed courses saved for all users.');
        },
        error: () => {
          this.saving = false;
          this.toaster.showError('Failed to save allowed courses for all users.');
        }
      });
      return;
    }

    this.api.updateCommission(this.selectedAffiliateId, { allowedCourseIds: ids }).pipe(first()).subscribe({
      next: () => {
        this.saving = false;
        this.dirty = false;
        this.toaster.showSuccess('Allowed courses saved.');
      },
      error: () => {
        this.saving = false;
        this.toaster.showError('Failed to save allowed courses.');
      },
    });
  }

  displayAffiliate(a: AdminAffiliateListItem): string {
    const name = (a?.name ?? '').trim();
    const email = (a?.email ?? '').trim();
    if (name && email && name.toLowerCase() !== email.toLowerCase()) return `${name} (${email})`;
    return name || email || a?.id || '';
  }
}

