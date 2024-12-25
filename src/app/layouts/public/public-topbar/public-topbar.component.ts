import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-public-topbar',
  templateUrl: './public-topbar.component.html',
  styleUrls: ['./public-topbar.component.scss']
})
export class PublicTopbarComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    
  }
  isVisible: boolean = false; 
  toggleVisibility() { 
    this.isVisible = true
   }
   toggleinVisibility(){
    this.isVisible = false
   }

}

 