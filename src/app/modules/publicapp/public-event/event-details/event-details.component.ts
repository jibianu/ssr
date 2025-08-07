import { Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild } from '@angular/core';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { ActivatedRoute } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
    selector: 'app-event-details',
    templateUrl: './event-details.component.html',
    styleUrls: ['./event-details.component.scss'],
    standalone: false
})
export class EventDetailsComponent implements OnInit {

  constructor(private elRef: ElementRef, private renderer: Renderer2, private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private publicAppService: PublicAppService,
    private toasterService: ToasterService,

  ) {
    activatedRoute.data.subscribe((data) => {
      this.event = data.event;
      this.eventId=this.event["id"];
      this.bgImage = this.event.eventDetails.find((item) => item.section === 'image')?.imageUrl || this.bgImage;
      // console.log(this.bgImage)
        });
  }
  @ViewChild('stickySection', {static: false}) public stickySection!: ElementRef;
  stickyTop = 0;

  event:any;
  events:any=[];
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

  items = [];
  categories = [];
  eventId:string;
  modalRef:NgbModalRef;
  subscription: Subscription = new Subscription();
  eventUserForm: UntypedFormGroup;
  customOptions: OwlOptions = {
    loop: false,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false,
    navSpeed: 700,
    margin: 5,
    navText: ['<i class="fa fa-chevron-left fa-3x"></i>', '<i class="fa fa-chevron-right fa-3x"></i>'],
    nav: true,
    responsive: {
      0: {
        items: 1
      },
      400: {
        items: 2
      },
      740: {
        items: 3
      },
      940: {
        items: 3
      }
    },
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (window.innerWidth > 935) {
      const stickyDiv = this.stickySection.nativeElement;
      const stickySec = stickyDiv?.querySelector('.sticky-sec');
      const scrollPosition = stickyDiv?.getBoundingClientRect();
      const coursesCarousel = document.getElementById('related-courses-section');
      const cPos = coursesCarousel.getBoundingClientRect().top;
      if (cPos >= this.stickyTop && cPos <= stickySec.offsetHeight) {
        this.renderer.removeClass(stickySec, 'fixed-section');
      } else {
        if ((scrollPosition?.top || 0) <= this.stickyTop) {
          this.renderer.addClass(stickySec, 'fixed-section');
        } else {
          this.renderer.removeClass(stickySec, 'fixed-section');
        }
      }
   
    }
 
  }

  ngOnInit(): void {
    
    this.eventUserForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      mobile: ['', Validators.required],
      companyName: ['', Validators.required],
      designation: ['', Validators.required],
      department: ['', Validators.required],
      paymentRefNo: [''],
    });
    this.publicAppService.getUpcomingEvents(this.eventId).subscribe(res=>{
      this.events=res;
      // this.events=[1,2,3,4,5,6];
    })
  }
  getInfo(section:string):any[]{
    return this.event.eventDetails.filter((item)=>item.section===section);
  }
  sumAmount(section: string): number {
    return this.event.eventDetails.filter((item) => item.section === section)
        .reduce((acc, item) => acc + item.amount, 0);
}
getRemaining(dt: string): any {
  const eventDate = new Date(dt);
  const currentDate = new Date();
  var days = 0;
  var hours = 0;

  if (eventDate > currentDate) {
      var diff = eventDate.getTime() - currentDate.getTime();
      days = Math.floor(diff / (1000 * 60 * 60 * 24));
      hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  }
  return { days, hours };
}
getValue(section: string, title: string, key: string): any {
  return this.event.eventDetails.find((item) => item.section === section && item.title === title)?.[key] || '';
}

  openRegisterModal(longContent: any) {
    this.modalRef= this.modalService.open(longContent, { scrollable: true });
  }

  onViewMoreInfo () {
    const text = document.getElementById('largeText');
    const button = document.getElementById('viewMoreBtn');
    if (text && button) {
      text?.classList.toggle('text-collapse');
      button.textContent = text.classList.contains('text-collapse') ? 'View More' : 'View Less';
    }
   
  }
  getEventDt(event:any,section:string,ix:number):any{
    return event.eventDetails.filter((item) => item.section === section)[ix];
}
  paymentProcess(){
    if (this.eventUserForm.invalid) {
      return;
  }
  
  this.subscription.add(this.publicAppService.createEventUser(this.eventId,this.eventUserForm.value).subscribe((x) => {
    var url=x.paymentRefNo;

    this.toasterService.showSuccess('Event registration successfully');
    this.modalRef.close();
    window.location.href=url;
    // this.goBack();
}));
  }

}


