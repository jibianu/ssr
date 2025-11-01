import { Component, Input } from '@angular/core';

/**
 * Skeleton loader component for course list
 * Shows multiple skeleton course cards during loading
 */
@Component({
  selector: 'app-skeleton-course-list',
  template: `
    <div class="skeleton-course-list">
      <div class="skeleton-course-card" *ngFor="let i of skeletonArray">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-subtitle"></div>
          <div class="skeleton-features">
            <div class="skeleton-feature" *ngFor="let j of [1,2,3]"></div>
          </div>
          <div class="skeleton-footer">
            <div class="skeleton-price"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-course-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      padding: 20px 0;
    }

    .skeleton-course-card {
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-image {
      width: 100%;
      height: 200px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }

    .skeleton-content {
      padding: 16px;
    }

    .skeleton-title {
      width: 80%;
      height: 20px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      margin-bottom: 8px;
      border-radius: 4px;
    }

    .skeleton-subtitle {
      width: 60%;
      height: 16px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      margin-bottom: 16px;
      border-radius: 4px;
    }

    .skeleton-features {
      margin-bottom: 16px;
    }

    .skeleton-feature {
      width: 100%;
      height: 14px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      margin-bottom: 8px;
      border-radius: 4px;
    }

    .skeleton-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .skeleton-price {
      width: 80px;
      height: 24px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-button {
      width: 120px;
      height: 36px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
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

    @media (max-width: 768px) {
      .skeleton-course-list {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
      }
    }
  `],
  standalone: false
})
export class SkeletonCourseListComponent {
  @Input() count: number = 6; // Default to 6 skeleton cards
  
  get skeletonArray(): number[] {
    return Array(this.count).fill(0).map((_, i) => i);
  }
}

