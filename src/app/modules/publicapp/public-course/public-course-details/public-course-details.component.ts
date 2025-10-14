import { Component, OnDestroy, OnInit, computed, effect, inject, input } from '@angular/core';
import { Subscription } from 'rxjs';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { environment } from './../../../../../environments/environment';

@Component({
    selector: 'app-public-course-details',
    templateUrl: './public-course-details.component.html',
    styleUrls: ['./public-course-details.component.scss'],
    standalone: false
})
export class PublicCourseDetailsComponent {

  courseUrl: string;
  locationUrl: string;
  courseDetails;
  image = '';
  isBrowser = false;
  categoryName = '';
  courseId = '';
  // createdBy=[
  //   'f48824b8-f021-70f5-0cb8-a5cee2516932',
  //   'e0986ef4-e84c-43cb-8a7a-f300a515ef4f'
  // ];
  private readonly createdByList = ['f48824b8-f021-70f5-0cb8-a5cee2516932', 'e0986ef4-e84c-43cb-8a7a-f300a515ef4f'];

  isLoaded=false

  constructor() {
    effect(() => {
      const course = this.courseDetailsFromRoute$();
      const location = this.location$();

      this.setComponentProperties(course, location);
    });
  }

  private readonly canonicalService = inject(CanonicalService);
  private readonly metadataService = inject(MetadataService);

  protected readonly courseDetailsFromRoute$ = input.required<{
    createdByUser?: { id: string };
  }>({alias: 'courseDetails'});
  protected readonly location$ = input<string | null>(null,{alias: 'location'});

  protected readonly isSelfLearning$ = computed(() => {
    const course = this.courseDetailsFromRoute$();
    return course.createdByUser && 
      this.createdByList.includes(course.createdByUser.id);
  })

  setComponentProperties(courseDetails, location: string | null) {
    const canonicalUrl = location ?
      `${courseDetails.canonicalUrl}-${location.toLowerCase()}`:
      `${courseDetails.canonicalUrl}`;
    
      this.courseDetails = courseDetails;
      this.courseId = this.courseDetails.id;
      this.categoryName = (this.courseDetails && this.courseDetails.category) ? this.courseDetails.category.name : '';
      this.image = this.courseDetails.titleImageUrl;

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
      this.canonicalService.setCanonicalURL(environment.seoUrl + canonicalUrl);
  }

  // onImgError(event) {
  //   event.target.src = 'https://via.placeholder.com/468x300?text=OilandGasClub';
  // }

  onImgError(event: any) {
    (event.target as HTMLImageElement).src = 'assets/img/oilandgasclub.jpg';
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

}