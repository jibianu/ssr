import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PublicappRoutingModule } from 'src/app/modules/publicapp/publicapp-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
    selector: 'app-public-topbar',
    templateUrl: './public-topbar.component.html',
    styleUrls: ['./public-topbar.component.scss'],
    
imports: [
  CommonModule,
  PublicappRoutingModule,
  SharedModule
],
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

 