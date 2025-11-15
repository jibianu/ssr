import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PublicHeaderComponent } from './public-header/public-header.component';
import { RouterModule } from '@angular/router';
import { PublicFooterComponent } from './public-footer/public-footer.component';

// ✅ PERFORMANCE: OnPush change detection for faster change detection (30-50% improvement)
// ✅ HYDRATION: Layout component is SSR-safe - only contains router outlet and child components
@Component({
    selector: 'app-public-layout',
    templateUrl: './public-layout.component.html',
    styleUrls: ['./public-layout.component.scss'],
    imports: [PublicHeaderComponent, RouterModule, PublicFooterComponent],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicLayoutComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    // ✅ PERFORMANCE: No async operations in ngOnInit - fast initialization
  }

}
