import { Component, OnInit, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CarrinhoService } from '../../services/carrinho.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  welcomeMessage: string = 'Bem-vindo Usuário';
  userName: string = 'Usuário';
  dropdownAberto: boolean = false;
  isAutenticado: boolean = false;
  isAdmin: boolean = false;
  quantidadeCarrinho: number = 0;

  // Mobile Menu State
  mobileMenuAberto: boolean = false;
  adminTreeAberto: boolean = false;

  private authSub!: Subscription;
  private carrinhoSub!: Subscription;

  constructor(
    private eRef: ElementRef,
    private authService: AuthService,
    private carrinhoService: CarrinhoService
  ) { }

  ngOnInit(): void {
    this.authSub = this.authService.isAuthenticated$.subscribe(auth => {
      this.isAutenticado = auth;
      this.isAdmin = auth && this.authService.getRoleDoToken() === 'ADMIN';

      if (auth) {
        // Tenta pegar o CPF/CNPJ ou nome que vem do token pra exibir na UI.
        const subject = this.authService.getSubjectDoToken();
        const usuarioId = this.authService.getUsuarioIdDoToken();
        this.userName = subject ? subject : 'Usuário';
        this.welcomeMessage = `Bem-vindo(a) ${this.userName}`;

        if (usuarioId) {
          this.carrinhoService.atualizarContagem(usuarioId);
        }
      } else {
        this.userName = 'Usuário';
        this.welcomeMessage = 'Bem-vindo Usuário';
        this.carrinhoService.limparContagem();
      }
    });

    this.carrinhoSub = this.carrinhoService.quantidadeItensUnicos$.subscribe(qtd => {
      this.quantidadeCarrinho = qtd;
    });
  }

  logout(event: Event) {
    event.preventDefault();
    this.authService.logout();
    this.carrinhoService.limparContagem();
  }

  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
    if (this.carrinhoSub) {
      this.carrinhoSub.unsubscribe();
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

  toggleMobileMenu(): void {
    this.mobileMenuAberto = !this.mobileMenuAberto;
    if (!this.mobileMenuAberto) {
      this.adminTreeAberto = false; // Fecha a árvore ao fechar o menu
    }
  }

  fecharMobileMenu(): void {
    this.mobileMenuAberto = false;
    this.adminTreeAberto = false;
  }

  toggleAdminTree(event: Event): void {
    event.stopPropagation();
    this.adminTreeAberto = !this.adminTreeAberto;
  }
}
