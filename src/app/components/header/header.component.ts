import { Component, OnInit, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  welcomeMessage: string = 'Bem-vindo Usuário';
  dropdownAberto: boolean = false;
  isAutenticado: boolean = false;
  isAdmin: boolean = false;
  private authSub!: Subscription;

  constructor(private eRef: ElementRef, private authService: AuthService) { }

  ngOnInit(): void {
    this.authSub = this.authService.isAuthenticated$.subscribe(auth => {
      this.isAutenticado = auth;
      this.isAdmin = auth && this.authService.getRoleDoToken() === 'ADMIN';
      
      if (auth) {
        // Tenta pegar o CPF/CNPJ ou nome que vem do token pra exibir na UI.
        const subject = this.authService.getSubjectDoToken();
        this.welcomeMessage = `Bem-vindo ${subject ? subject : 'Usuário'}`;
      } else {
        this.welcomeMessage = 'Bem-vindo Usuário';
      }
    });
  }

  logout(event: Event) {
    event.preventDefault();
    this.authService.logout();
  }

  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    const target = event.target as HTMLElement;
    const isDropdown = target.closest('.dropdown');

    if (!isDropdown) {
      this.fecharDropdown();
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownAberto = !this.dropdownAberto;
  }

  fecharDropdown(): void {
    this.dropdownAberto = false;
  }
}
