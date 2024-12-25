import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-location-metadata',
  templateUrl: './location-metadata.component.html',
  styleUrls: ['./location-metadata.component.scss']
})
export class LocationMetadataComponent implements OnInit {

  locationMeataData: any = {};
  courseLocationData = []
  constructor(
    private router: Router,
    private location: Location,
  ) { }

  ngOnInit(): void {
    this.locationMeataData = JSON.parse(window.sessionStorage.getItem('courseData'))
    if (this.locationMeataData && this.locationMeataData.courseLocations && this.locationMeataData.courseLocations.length > 0) {
      this.courseLocationData = this.locationMeataData.courseLocations;
    }
  }

  goBack() {
    this.locationMeataData.courseLocations = this.courseLocationData;
    window.sessionStorage.setItem('courseData', JSON.stringify(this.locationMeataData));
    this.location.back();
  }

}
