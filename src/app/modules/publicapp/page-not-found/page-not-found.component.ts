import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-page-not-found',
    templateUrl: './page-not-found.component.html',
    styleUrls: ['./page-not-found.component.scss'],
    standalone: true,
    imports: [CommonModule],
    // ✅ FIX: Move ngSkipHydration to component host element (required by Angular)
    host: {
      'ngSkipHydration': 'true'
    }
})
export class PageNotFoundComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
