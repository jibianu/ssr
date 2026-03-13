import { Location, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { StorageUtil } from 'src/app/core/utils/storage.util';

@Component({
    selector: 'app-location-metadata',
    templateUrl: './location-metadata.component.html',
    styleUrls: ['./location-metadata.component.scss'],
    standalone: false
})
export class LocationMetadataComponent implements OnInit {

  locationMeataData: any = {};
  courseLocationData = [];
  private readonly isBrowser: boolean;

  constructor(
    private router: Router,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // ✅ SSR: Safe sessionStorage access with platform check and error handling
    if (this.isBrowser) {
      this.locationMeataData = StorageUtil.getItemFromSession('courseData', {});
      if (this.locationMeataData && this.locationMeataData.courseLocations && this.locationMeataData.courseLocations.length > 0) {
        this.courseLocationData = this.locationMeataData.courseLocations;
      }
    }
  }

  goBack() {
    if (this.isBrowser) {
      this.locationMeataData.courseLocations = this.courseLocationData;
      StorageUtil.setItemToSession('courseData', this.locationMeataData);
    }
    this.location.back();
  }

}
