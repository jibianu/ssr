import { Component, OnInit } from '@angular/core';
import { PublicAppService } from '../../publicapp.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {

  bgImage = 'https://courseoilandgasbucket.s3.ap-northeast-1.amazonaws.com/Event/header.jpg';
  viewMoreCategory = false;
  viewMoreDate = false;
events:any[]=[]
  constructor(
    private publicAppService: PublicAppService,
  ) { }

  ngOnInit(): void {
    this.publicAppService.getEvents().subscribe(res=>this.events=res);
  }

}
