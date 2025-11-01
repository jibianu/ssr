import { Component } from '@angular/core';

/**
 * Skeleton loader component for event cards
 */
@Component({
  selector: 'app-skeleton-event-card',
  template: `
    <div class="skeleton-event-card">
      <div class="skeleton-header">
        <div class="skeleton-badge"></div>
        <div class="skeleton-date"></div>
      </div>
      <div class="skeleton-title"></div>
      <div class="skeleton-tags">
        <div class="skeleton-tag" *ngFor="let i of [1,2,3]"></div>
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-price"></div>
        <div class="skeleton-info"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-event-card {
      background: #fff;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .skeleton-badge {
      width: 60px;
      height: 24px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-date {
      width: 150px;
      height: 18px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-title {
      width: 70%;
      height: 24px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      margin-bottom: 16px;
      border-radius: 4px;
    }

    .skeleton-tags {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .skeleton-tag {
      width: 80px;
      height: 20px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .skeleton-price {
      width: 100px;
      height: 20px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-info {
      width: 120px;
      height: 24px;
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
  `],
  standalone: false
})
export class SkeletonEventCardComponent { }

