import { Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild } from '@angular/core';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-event-details',
  templateUrl: './event-details.component.html',
  styleUrls: ['./event-details.component.scss']
})
export class EventDetailsComponent implements OnInit {

  constructor(private elRef: ElementRef, private renderer: Renderer2, private modalService: NgbModal) {}
  @ViewChild('stickySection', {static: false}) public stickySection!: ElementRef;
  stickyTop = 0;

  bgImage = 'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F935098893%2F2194700540003%2F1%2Foriginal.20250114-070250?crop=focalpoint&fit=crop&w=940&auto=format%2Ccompress&q=75&sharp=10&fp-x=0.417955571955&fp-y=0.327681496879&s=ba16dfa89eb36e033ae72207acd91b33';
  desigantion = null;
  department = null;
  dropdownSettings: IDropdownSettings = {
    singleSelection: true,
    idField: 'item_id',
    textField: 'item_text',
    selectAllText: 'Select All',
    unSelectAllText: 'UnSelect All',
    itemsShowLimit: 3,
    allowSearchFilter: true
  };

  @HostListener('window:scroll', [])
  onWindowScroll() {
    console.log(this.stickySection.nativeElement);
    
    const stickyDiv = this.stickySection.nativeElement.querySelectorAll('.sticky-div');
    const scrollPosition = stickyDiv[0]?.pageYOffset;
    console.log(scrollPosition, this.stickyTop);
    
    if (scrollPosition > this.stickyTop) {
      this.renderer.setStyle(stickyDiv, 'position', 'fixed');
      this.renderer.setStyle(stickyDiv, 'top', '0');
    } else {
      this.renderer.removeStyle(stickyDiv, 'position');
      this.renderer.removeStyle(stickyDiv, 'top');
    }


  }

  ngOnInit(): void {
  }

  openRegisterModal(longContent: any) {
    this.modalService.open(longContent, { scrollable: true });
  }

  onViewMoreInfo () {
    const text = document.getElementById('largeText');
    const button = document.getElementById('viewMoreBtn');
    if (text && button) {
      text?.classList.toggle('text-collapse');
      button.textContent = text.classList.contains('text-collapse') ? 'View More' : 'View Less';
    }
   
  }

}
