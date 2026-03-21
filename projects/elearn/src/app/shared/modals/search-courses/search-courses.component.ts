import { ChangeDetectionStrategy, Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-search-courses',
    templateUrl: './search-courses.component.html',
    styleUrls: ['./search-courses.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class SearchCoursesComponent implements OnInit, OnChanges {
  createdDate: any;
  updatedDate: any;

  SelectedPublishType = 'All course';
  SelectedCategory = 'All Category';
  SelectedAuthor = 'All Author';
  @Input() categories: any;
  @Input() AuthorList: any;
  /** Initial filter state when opening the modal (so the panel shows the currently applied filter). */
  @Input() initialPublishFilter: PublishFilterTypeValue = 'all';
  @Input() initialCategoryId: string | null = null;
  @Input() initialCategoryName: string | null = null;
  @Input() initialAuthorId: string | null = null;
  @Input() initialAuthorName: string | null = null;
  @Input() initialCreatedDate: any = null;
  @Input() initialUpdatedDate: any = null;
  sendData: {
    isPublish: boolean | null;
    showOnPublicListing: boolean | null;
    publishFilter: PublishFilterTypeValue;
    statusFilter: number | null;
    categoryID: string | null;
    authorID: string | null;
    createdDate: any;
    updatedDate: any;
    categoryName: string | null;
    publish: string | null;
    authorName: string | null;
  } = {
    isPublish: null,
    showOnPublicListing: null,
    publishFilter: 'all',
    statusFilter: null,
    categoryID: null,
    authorID: null,
    createdDate: null,
    updatedDate: null,
    categoryName: null,
    publish: null,
    authorName: null
  };

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    this.applyInitialState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialPublishFilter'] || changes['initialCategoryId'] || changes['initialAuthorId']) {
      this.applyInitialState();
    }
  }

  private applyInitialState(): void {
    this.filterByPublishType(this.initialPublishFilter);
    if (this.initialCategoryId != null && this.initialCategoryName != null) {
      this.filterByCategory(this.initialCategoryId, this.initialCategoryName);
    }
    if (this.initialAuthorId != null && this.initialAuthorName != null && this.AuthorList?.length) {
      const author = this.AuthorList.find((a: any) => a.id === this.initialAuthorId);
      if (author) this.filterByAuthor(author);
    }
    this.sendData.createdDate = this.initialCreatedDate ?? null;
    this.sendData.updatedDate = this.initialUpdatedDate ?? null;
  }

  filterByAuthor(item) {
    if (item) {
      this.SelectedAuthor = item.email;
      this.sendData.authorID = item.id;
      this.sendData.authorName = item.email;
    } else {
      this.SelectedAuthor = 'All Author';
      this.sendData.authorID = null;
      this.sendData.authorName = null;
    }
  }

  filterByCategory(id, name) {
    this.SelectedCategory = name;
    this.sendData.categoryID = id;
    this.sendData.categoryName = id != null ? name : null;
  }

  filterByPublishType(publishFilter: PublishFilterTypeValue) {
    this.sendData.publishFilter = publishFilter;
    const labels: Record<PublishFilterTypeValue, string> = {
      'all': 'All course',
      'pending-review': 'Trainer requested review',
      'published-lms': 'Published on the Elearn LMS',
      'published-public': 'Published on Public marketing course page',
      'unpublished-lms': 'Unpublished on the Elearn LMS',
      'unpublished-public': 'Published on the Elearn but unpublished on Public marketing course page'
    };
    this.SelectedPublishType = labels[publishFilter];
    this.sendData.publish = publishFilter === 'all' ? null : labels[publishFilter];
    this.sendData.statusFilter = publishFilter === 'pending-review' ? 1 : null;
    switch (publishFilter) {
      case 'all':
        this.sendData.isPublish = null;
        this.sendData.showOnPublicListing = null;
        break;
      case 'pending-review':
        this.sendData.isPublish = null;
        this.sendData.showOnPublicListing = null;
        break;
      case 'published-lms':
        this.sendData.isPublish = true;
        this.sendData.showOnPublicListing = null;
        break;
      case 'published-public':
        this.sendData.isPublish = null;
        this.sendData.showOnPublicListing = true;
        break;
      case 'unpublished-lms':
        this.sendData.isPublish = false;
        this.sendData.showOnPublicListing = null;
        break;
      case 'unpublished-public':
        this.sendData.isPublish = true;  // published on Elearn LMS
        this.sendData.showOnPublicListing = false;  // but not on Public marketing
        break;
    }
  }

  reset() {
    this.SelectedPublishType = 'All course';
    this.sendData = {
      isPublish: null,
      showOnPublicListing: null,
      publishFilter: 'all',
      statusFilter: null,
      categoryID: null,
      authorID: null,
      createdDate: null,
      updatedDate: null,
      categoryName: null,
      publish: null,
      authorName: null
    };
    this.activeModal.close(this.sendData);
  }

  search() {
    this.activeModal.close(this.sendData);
  }
}

/** Publish filter values for the search dropdown */
export type PublishFilterTypeValue = 'all' | 'pending-review' | 'published-lms' | 'published-public' | 'unpublished-lms' | 'unpublished-public';
