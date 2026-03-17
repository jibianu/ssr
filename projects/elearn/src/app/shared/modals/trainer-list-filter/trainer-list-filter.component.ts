import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface TrainerListFilterResult {
  createdOnFrom: string;
  createdOnTo: string;
  lastLoginFrom: string;
  lastLoginTo: string;
  hasCoursePermission: boolean;
  hasEventPermission: boolean;
  hasBlogPermission: boolean;
  hasPendingPermissionRequest: boolean | null;
  pendingPermissionContentType: string;
}

/** Single selection for trainer content filter: '' = no filter, 'Course' | 'Event' | 'Blog' */
export type TrainerContentFilterValue = '' | 'Course' | 'Event' | 'Blog';

@Component({
  selector: 'app-trainer-list-filter',
  templateUrl: './trainer-list-filter.component.html',
  styleUrls: ['./trainer-list-filter.component.scss'],
  standalone: false,
})
export class TrainerListFilterComponent {
  readonly contentFilterPlaceholder = 'Choose one - Course, Blog, or Event';
  readonly contentFilterOptions: { value: TrainerContentFilterValue; label: string }[] = [
    { value: '', label: 'Choose one - Course, Blog, or Event' },
    { value: 'Course', label: 'Course' },
    { value: 'Event', label: 'Event' },
    { value: 'Blog', label: 'Blog' },
  ];

  /** Permission request filter: '' = any, 'pending' = has pending, 'none' = no pending */
  readonly permissionRequestFilterOptions: { value: string; label: string }[] = [
    { value: '', label: 'Any' },
    { value: 'pending', label: 'Has pending request' },
    { value: 'none', label: 'No pending request' },
  ];
  readonly permissionRequestContentOptions: { value: string; label: string }[] = [
    { value: '', label: 'Any type' },
    { value: 'Course', label: 'Course' },
    { value: 'Event', label: 'Event' },
    { value: 'Blog', label: 'Blog' },
  ];

  createdOnFrom = '';
  createdOnTo = '';
  lastLoginFrom = '';
  lastLoginTo = '';
  /** Single selection: Course, Event, or Blog. Shown in filter placeholder. */
  contentFilter: TrainerContentFilterValue = '';
  /** '' = any, 'pending' = has pending request, 'none' = no pending request */
  permissionRequestFilter = '';
  /** When permissionRequestFilter === 'pending', optionally filter by content type. */
  pendingPermissionContentType = '';

  @Input() initialCreatedOnFrom = '';
  @Input() initialCreatedOnTo = '';
  @Input() initialLastLoginFrom = '';
  @Input() initialLastLoginTo = '';
  @Input() initialHasCoursePermission = false;
  @Input() initialHasEventPermission = false;
  @Input() initialHasBlogPermission = false;
  @Input() initialHasPendingPermissionRequest: boolean | null = null;
  @Input() initialPendingPermissionContentType = '';

  constructor(public activeModal: NgbActiveModal) {
  }

  ngOnInit(): void {
    this.createdOnFrom = this.initialCreatedOnFrom || '';
    this.createdOnTo = this.initialCreatedOnTo || '';
    this.lastLoginFrom = this.initialLastLoginFrom || '';
    this.lastLoginTo = this.initialLastLoginTo || '';
    if (this.initialHasCoursePermission) this.contentFilter = 'Course';
    else if (this.initialHasEventPermission) this.contentFilter = 'Event';
    else if (this.initialHasBlogPermission) this.contentFilter = 'Blog';
    else this.contentFilter = '';
    if (this.initialHasPendingPermissionRequest === true) this.permissionRequestFilter = 'pending';
    else if (this.initialHasPendingPermissionRequest === false) this.permissionRequestFilter = 'none';
    else this.permissionRequestFilter = '';
    this.pendingPermissionContentType = this.initialPendingPermissionContentType || '';
  }

  apply(): void {
    const hasPending = this.permissionRequestFilter === 'pending' ? true : this.permissionRequestFilter === 'none' ? false : null;
    this.activeModal.close({
      createdOnFrom: this.createdOnFrom || '',
      createdOnTo: this.createdOnTo || '',
      lastLoginFrom: this.lastLoginFrom || '',
      lastLoginTo: this.lastLoginTo || '',
      hasCoursePermission: this.contentFilter === 'Course',
      hasEventPermission: this.contentFilter === 'Event',
      hasBlogPermission: this.contentFilter === 'Blog',
      hasPendingPermissionRequest: hasPending,
      pendingPermissionContentType: (hasPending && this.pendingPermissionContentType) ? this.pendingPermissionContentType : '',
    } as TrainerListFilterResult);
  }

  clear(): void {
    this.createdOnFrom = '';
    this.createdOnTo = '';
    this.lastLoginFrom = '';
    this.lastLoginTo = '';
    this.contentFilter = '';
    this.permissionRequestFilter = '';
    this.pendingPermissionContentType = '';
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
