import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
  private activeRequests = 0;
  public isLoading = new BehaviorSubject<boolean>(false);

  constructor() { }

  show(): void {
    if (this.activeRequests === 0) {
      this.isLoading.next(true);
    }
    this.activeRequests++;
  }

  hide(): void {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.isLoading.next(false);
    }
  }
}
