import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { SharedService } from '../../../../shared/service/shared-service.service';
import { ToasterService } from '../../../../shared/component/toaster/toaster.service';
import {
  AdminAffiliateApiService,
  AdminAffiliateCourseOption,
  AdminAffiliateLinkItem,
  AdminAffiliateListItem,
} from '../admin-affiliate-api.service';

@Component({
  selector: 'app-admin-campaign-links',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './campaign-links.component.html',
  styleUrls: ['./campaign-links.component.scss'],
})
export class CampaignLinksComponent implements OnInit, OnDestroy {
  affiliates: AdminAffiliateListItem[] = [];
  courses: AdminAffiliateCourseOption[] = [];
  links: AdminAffiliateLinkItem[] = [];
  loading = false;
  saving = false;
  showForm = false;

  filterAffiliateId = '';
  formAffiliateId = '';
  formCourseId = '';
  formCommission = 10;
  formExpiresAt = '';
  formLabel = '';
  formIsActive = true;

  private sub = new Subscription();

  constructor(
    private api: AdminAffiliateApiService,
    private sharedService: SharedService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Campaign links');
    this.load();
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
    this.sub.unsubscribe();
  }

  get approvedAffiliates(): AdminAffiliateListItem[] {
    return this.affiliates.filter((a) => a.status === 'Approved');
  }

  get totalClicks(): number {
    return this.links.reduce((s, l) => s + l.totalClicks, 0);
  }

  get totalInvalid(): number {
    return this.links.reduce((s, l) => s + l.invalidReferralAttempts, 0);
  }

  get totalEarnings(): number {
    return this.links.reduce((s, l) => s + l.totalCommission, 0);
  }

  load(): void {
    this.loading = true;
    this.api.getList().pipe(first()).subscribe({
      next: (list) => {
        this.affiliates = list || [];
        this.api.getPublishedCoursesForSelection().pipe(first()).subscribe({
          next: (courses) => {
            this.courses = courses || [];
            this.loadLinks();
          },
          error: () => {
            this.loading = false;
            this.toaster.showError('Failed to load courses.');
          },
        });
      },
      error: () => {
        this.loading = false;
        this.toaster.showError('Failed to load affiliates.');
      },
    });
  }

  loadLinks(): void {
    this.api.getCampaignLinks(this.filterAffiliateId || undefined).pipe(first()).subscribe({
      next: (links) => {
        this.links = links || [];
        this.loading = false;
      },
      error: () => {
        this.links = [];
        this.loading = false;
        this.toaster.showError('Failed to load campaign links.');
      },
    });
  }

  openForm(): void {
    this.showForm = true;
    this.formAffiliateId = this.filterAffiliateId || '';
    this.formCourseId = '';
    this.formCommission = 10;
    this.formExpiresAt = '';
    this.formLabel = '';
    this.formIsActive = true;
  }

  createLink(): void {
    if (!this.formAffiliateId || !this.formCourseId) {
      this.toaster.showError('Select affiliate and course.');
      return;
    }
    this.saving = true;
    this.api
      .createCampaignLink({
        affiliateId: this.formAffiliateId,
        courseId: this.formCourseId,
        commissionPercentage: this.formCommission,
        expiresAt: this.formExpiresAt ? new Date(this.formExpiresAt).toISOString() : null,
        label: this.formLabel || undefined,
        isActive: this.formIsActive,
      })
      .pipe(first())
      .subscribe({
        next: () => {
          this.saving = false;
          this.showForm = false;
          this.toaster.showSuccess('Campaign link created.');
          this.loadLinks();
        },
        error: (err) => {
          this.saving = false;
          this.toaster.showError(err?.error?.message || 'Failed to create link.');
        },
      });
  }

  toggleStatus(link: AdminAffiliateLinkItem): void {
    this.api.updateCampaignLinkStatus(link.id, !link.isActive).pipe(first()).subscribe({
      next: () => {
        link.isActive = !link.isActive;
        this.toaster.showSuccess(link.isActive ? 'Link activated.' : 'Link deactivated.');
      },
      error: () => this.toaster.showError('Failed to update status.'),
    });
  }

  deleteLink(link: AdminAffiliateLinkItem): void {
    if (!confirm(`Delete campaign link ${link.trackingCode}?`)) return;
    this.api.deleteCampaignLink(link.id).pipe(first()).subscribe({
      next: () => {
        this.toaster.showSuccess('Link deleted.');
        this.loadLinks();
      },
      error: () => this.toaster.showError('Failed to delete link.'),
    });
  }

  copyLink(url: string): void {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => this.toaster.showSuccess('Link copied.'),
      () => this.toaster.showError('Could not copy link.')
    );
  }
}
