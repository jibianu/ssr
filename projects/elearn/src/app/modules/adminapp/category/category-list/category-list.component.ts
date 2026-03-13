import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { Category } from './../category.model';
import { AdminAppService } from './../../adminapp.service';
import { Component, Inject, OnInit, OnDestroy, DOCUMENT } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';

import { UpdateCourseListComponent } from './../../../../shared/component/update-course-list/update-course-list.component';

@Component({
    selector: 'app-category-list',
    templateUrl: './category-list.component.html',
    styleUrls: ['./category-list.component.scss'],
    standalone: false
})
export class CategoryListComponent implements OnInit, OnDestroy {

  config: { itemsPerPage: number; currentPage: number };
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  categories = new Array<Category>();
  term = '';
  sortDir = 1;
  txtRoute: string;

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Category List');
    this.config = {
      itemsPerPage: 20,
      currentPage: 1,
    };
    this.sharedService.showAddCategoryButton.next(true);
    this.subscription.add(
      this.sharedService.addCategoryClick$.subscribe(() => this.goToAddCategory())
    );
    this.fetchCategories();
    let routeData = this.document.location.href.includes('management');
    if (routeData) {
      this.txtRoute = 'management';
    } else {
      this.txtRoute = 'admin';
    }
  }

  goToAddCategory(): void {
    this.router.navigate(['/app', this.txtRoute, 'category', 'add']);
  }

  deleteCategory(id) {
    this.open(id);
  }

  fetchCategories() {
    this.subscription.add(this.appService.getCategories()
      .subscribe(
        response => {
          this.categories = response;
          this.sortArr('name');
        },
        error => {
          console.log(error);
        }));
  }

  /** Filter categories by search term (same logic as filter pipe). */
  get filteredCategories(): Category[] {
    const items = this.categories || [];
    if (!this.term || !this.term.trim()) return items;
    const searchText = this.term.toLowerCase().trim();
    return items.filter(item =>
      Object.keys(item).some(key => {
        const value = (item as any)[key];
        return value != null && value.toString().toLowerCase().includes(searchText);
      })
    );
  }

  get filteredCategoryCount(): number {
    return this.filteredCategories.length;
  }

  /** Slice for current page (client-side pagination). */
  get paginatedCategories(): Category[] {
    const list = this.filteredCategories;
    const start = (this.config.currentPage - 1) * this.config.itemsPerPage;
    return list.slice(start, start + this.config.itemsPerPage);
  }

  pageChanged(event: number) {
    this.config.currentPage = event;
  }

  onPageSizeChange(size: number): void {
    if (!Number.isNaN(size) && size > 0) {
      this.config.itemsPerPage = size;
      this.config.currentPage = 1;
    }
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Category Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong> <br> <p>All the course associated with this category will be delete too.</p>'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCategoryById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Category deleted successfully');
              this.fetchCategories();
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  onSortClick(event, colName) {
    let target = event.currentTarget,
      classList = target.classList;

    if (classList.contains('fa-caret-up')) {
      classList.remove('fa-caret-up');
      classList.add('fa-caret-down');
      this.sortDir = -1;
    } else {
      classList.add('fa-caret-up');
      classList.remove('fa-caret-down');
      this.sortDir = 1;
    }
    this.sortArr(colName);
  }

  sortArr(colName: any) {
    this.categories.sort((a, b) => {
      a = a[colName].toLowerCase();
      b = b[colName].toLowerCase();
      if (a < b) {
        return -1 * this.sortDir;
      }
      else if (a > b) {
        return 1 * this.sortDir;
      }
      else {
        return 0;
      }
    });
  }

  ngOnDestroy() {
    this.sharedService.certificateName.next('');
    this.sharedService.showAddCategoryButton.next(false);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  getCourse(item) {
    this.appService.getCourseByCategory(item.id).then(
      res => {
        const courseModal = this.modalService.open(UpdateCourseListComponent, { windowClass: 'modal-right' });
        courseModal.componentInstance.CategoryID = item.id;
        courseModal.componentInstance.CourseList = res;
        courseModal.componentInstance.Category= item.name;
      }
    )
  }

}
