import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { Category } from './../category.model';
import { AdminAppService } from './../../adminapp.service';
import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss']
})
export class CategoryListComponent implements OnInit {

  config: any;
  tableSizes = [5, 10, 25, 50];
  subscription: Subscription = new Subscription();
  categories = new Array<Category>();
  term = '';
  sortDir = 1;
  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    this.config = {
      itemsPerPage: 5,
      currentPage: 1,
    };
    this.fetchCategories();
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

  pageChanged(event) {
    this.config.currentPage = event;
  }

  onTableSizeChange(event): void {
    this.config.itemsPerPage = event.target.value;
    this.config.currentPage = 1;
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

  onSortClick(event,colName) {
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
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
