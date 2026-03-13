import { Component, Input } from '@angular/core';

/**
 * Skeleton loader component for related courses table
 */
@Component({
  selector: 'app-skeleton-related-course',
  template: `
    <div class="skeleton-table">
      <div class="skeleton-row" *ngFor="let i of skeletonArray">
        <div class="skeleton-cell-image">
          <div class="skeleton-image"></div>
        </div>
        <div class="skeleton-cell-content">
          <div class="skeleton-title"></div>
        </div>
        <div class="skeleton-cell-price">
          <div class="skeleton-price"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-table {
      width: 100%;
    }

    .skeleton-row {
      display: flex;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #e0e0e0;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-cell-image {
      flex: 0 0 100px;
      margin-right: 16px;
    }

    .skeleton-image {
      width: 100px;
      height: 75px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-cell-content {
      flex: 1;
      margin-right: 16px;
    }

    .skeleton-title {
      width: 70%;
      height: 20px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-cell-price {
      flex: 0 0 100px;
      text-align: right;
    }

    .skeleton-price {
      width: 80px;
      height: 20px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
      margin-left: auto;
    }

    @keyframes loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
    }
  `],
  standalone: false
})
export class SkeletonRelatedCourseComponent {
  @Input() count: number = 5; // Default to 5 skeleton rows
  
  get skeletonArray(): number[] {
    return Array(this.count).fill(0).map((_, i) => i);
  }
}

