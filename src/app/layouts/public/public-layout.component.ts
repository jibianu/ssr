import { Component, OnInit } from '@angular/core';
import { PublicTopbarComponent } from './public-topbar/public-topbar.component';
import { RouterModule } from '@angular/router';
import { PublicFooterComponent } from './public-footer/public-footer.component';

@Component({
    selector: 'app-public-layout',
    templateUrl: './public-layout.component.html',
    styleUrls: ['./public-layout.component.scss'],
    imports: [PublicTopbarComponent, RouterModule, PublicFooterComponent],
    standalone: true
})
export class PublicLayoutComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
