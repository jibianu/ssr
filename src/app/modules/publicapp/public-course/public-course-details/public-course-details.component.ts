import { environment } from './../../../../../environments/environment';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { PublicAppService } from '../../publicapp.service';

@Component({
  selector: 'app-public-course-details',
  templateUrl: './public-course-details.component.html',
  styleUrls: ['./public-course-details.component.scss']
})
export class PublicCourseDetailsComponent implements OnInit, OnDestroy {

  subscription: Subscription = new Subscription();
  courseUrl: string;
  locationUrl: string;
  courseDetails;
  image = '';
  isBrowser = false;
  categoryName = '';
  courseId = '';
  createdBy='e0986ef4-e84c-43cb-8a7a-f300a515ef4f'
  isLoaded=false;

  constructor(
    private publicAppService: PublicAppService,
    private activatedRoute: ActivatedRoute,
    private canonicalService: CanonicalService,
    private metadataService: MetadataService
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.url) {
          this.courseUrl = params.url;
        }
        if (params.location) {
          this.locationUrl = params.location;
        }
      });
      // debugger
    if (this.courseUrl && this.locationUrl) {
      this.getCourseByCanonicalLocationURL(this.courseUrl, this.locationUrl);
    } else {
      // if(!this.isLoaded){
        this.getCourseByCanonicalURL(this.courseUrl);
      // }
    }
  }

  getCourseByCanonicalURL(url) {
    // debugger
    // this.isLoaded=true;
    // this.subscription.add(this.publicAppService.getCourseByCanonicalURL(url).subscribe((res: any) => {
      this.subscription.add(this.activatedRoute.data.subscribe((response: any) => {
        var res=response.course;
      if (res) {
        this.courseDetails = res;
        this.categoryName = (this.courseDetails && this.courseDetails.category) ? this.courseDetails.category.name : '';
        this.courseId = this.courseDetails.id;
        this.image = this.courseDetails.titleImageUrl;
        if (this.metadataService) {
          this.metadataService.updateMetadata({
            title: this.courseDetails.title,
            description: this.courseDetails.metaDescription,
            author: this.courseDetails.createdByUser?.firstname + this.courseDetails?.createdByUser?.lastname,
            image: this.courseDetails.titleImageUrl,
            time: this.courseDetails.createdOn,
            updatedTime: this.courseDetails.updatedOn,
            category: this.categoryName,
            seoUrl: environment.seoUrl + this.courseDetails.canonicalUrl
          });
        }
        this.canonicalService.setCanonicalURL(environment.seoUrl + this.courseDetails.canonicalUrl);
      }
    }));
  }

  getCourseByCanonicalLocationURL(courseUrl, locationUrl) {
    this.subscription.add(this.publicAppService.getCourseByCanonicalLocationURL(courseUrl, locationUrl).subscribe((res: any) => {
      if (res) {
        this.courseDetails = res;
        this.courseId = this.courseDetails.id;
        let canonicalUrl = (`${this.courseUrl} ${this.locationUrl}`).split(' ').join('-');
        this.categoryName = (this.courseDetails && this.courseDetails.category) ? this.courseDetails.category.name : '';
        this.image = this.courseDetails.titleImageUrl;
        if (this.metadataService) {
          this.metadataService.updateMetadata({
            title: this.courseDetails.title,
            description: this.courseDetails.metaDescription,
            author: this.courseDetails.createdByUser?.firstname + this.courseDetails?.createdByUser?.lastname,
            image: this.courseDetails.titleImageUrl,
            time: this.courseDetails.createdOn,
            updatedTime: this.courseDetails.updatedOn,
            category: this.categoryName,
            seoUrl: environment.seoUrl + canonicalUrl
          });
        }
        this.canonicalService.setCanonicalURL(environment.seoUrl + canonicalUrl);
      }
    }));
  }

  onImgError(event) {
    event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
