import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export type EventStatusFilterValue = 'all' | 'pending-review';

@Component({
  selector: 'app-search-event',
  templateUrl: './search-event.component.html',
  styleUrls: ['./search-event.component.scss'],
  standalone: false
})
export class SearchEventComponent {
  selectedLabel = 'All events';
  statusFilter: number | null = null;
  statusLabel: string | null = null;

  /** Initial status filter when opening (1 = Pending Review, null = All). */
  initialStatusFilter: number | null = null;

  constructor(public activeModal: NgbActiveModal) {}

  setInitialStatusFilter(value: number | null): void {
    this.initialStatusFilter = value;
    if (value === 1) {
      this.selectedLabel = 'Trainer requested review';
      this.statusFilter = 1;
      this.statusLabel = 'Trainer requested review';
    } else {
      this.selectedLabel = 'All events';
      this.statusFilter = null;
      this.statusLabel = null;
    }
  }

  filterByStatus(value: EventStatusFilterValue): void {
    if (value === 'pending-review') {
      this.selectedLabel = 'Trainer requested review';
      this.statusFilter = 1;
      this.statusLabel = 'Trainer requested review';
    } else {
      this.selectedLabel = 'All events';
      this.statusFilter = null;
      this.statusLabel = null;
    }
  }

  reset(): void {
    this.selectedLabel = 'All events';
    this.statusFilter = null;
    this.statusLabel = null;
    this.activeModal.close({ statusFilter: null, statusLabel: null });
  }

  search(): void {
    this.activeModal.close({ statusFilter: this.statusFilter, statusLabel: this.statusLabel });
  }
}
