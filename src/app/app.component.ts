import { Component, HostListener } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'sara-web';

  constructor(private authService: AuthService) {}

  @HostListener('document:click', ['$event'])
  @HostListener('document:keydown', ['$event'])
  @HostListener('document:mousemove', ['$event'])
  resetTimer(event?: any) {
    this.authService.resetInactivityTimer();
  }
}
