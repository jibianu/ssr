import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {

  bgImage = 'https://cdn.evbstatic.com/s3-build/fe/build/images/39ac4703250a1d0fb15911c2c5f10174-generic_1_desktop.webp';
  viewMoreCategory = false;
  viewMoreDate = false;

  constructor() { }

  ngOnInit(): void {
  }

}
