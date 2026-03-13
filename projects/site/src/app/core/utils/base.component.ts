import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

/**
 * Base component that provides subscription management for cleanup.
 * Extend this class to automatically handle subscription cleanup.
 * 
 * @example
 * @Component({...})
 * export class MyComponent extends BaseComponent {
 *   ngOnInit() {
 *     this.addSubscription(
 *       this.service.getData().subscribe(...)
 *     );
 *   }
 * }
 */
@Injectable()
export abstract class BaseComponent implements OnDestroy {
  protected subscriptions = new Subscription();

  /**
   * Add a subscription to be automatically cleaned up on component destroy
   * @param sub Subscription to track
   */
  protected addSubscription(sub: Subscription): void {
    this.subscriptions.add(sub);
  }

  /**
   * Cleans up all subscriptions when component is destroyed
   */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

