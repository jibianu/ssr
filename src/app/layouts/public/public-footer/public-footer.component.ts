import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-public-footer',
  templateUrl: './public-footer.component.html',
  styleUrls: ['./public-footer.component.scss']
})
export class PublicFooterComponent implements OnInit {

  Year = new Date().getFullYear();
  constructor() { }

  ngOnInit(): void {
  }

}
