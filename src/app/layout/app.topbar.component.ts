import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LayoutService } from "./service/app.layout.service";
import { AuthService } from '../services/auth.service';
import { CarrinhoService } from '../services/carrinho.service';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html'
})
export class AppTopBarComponent implements OnInit {

    menuItems: MenuItem[] = [];
    burgerItems: MenuItem[] = [];
    nomeUsuario: string = '';
    isAutenticado: boolean = false;

    @ViewChild('menubutton') menuButton!: ElementRef;
    @ViewChild('topbarmenubutton') topbarMenuButton!: ElementRef;
    @ViewChild('topbarmenu') menu!: ElementRef;

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private carrinhoService: CarrinhoService
    ) { }

    qtdCarrinho: number = 0;

    ngOnInit() {
        this.authService.isAuthenticated$.subscribe(autenticado => {
            this.isAutenticado = autenticado;
            this.nomeUsuario = autenticado ? this.authService.getSubjectDoToken() : '';
            
            if (autenticado) {
                const userId = this.authService.getUsuarioIdDoToken();
                if (userId) {
                    this.carrinhoService.atualizarContagem(userId);
                }
            } else {
                this.carrinhoService.limparContagem();
            }

            this.configurarMenus();
        });

        this.carrinhoService.quantidadeItensUnicos$.subscribe(qtd => {
            this.qtdCarrinho = qtd;
            this.configurarMenus(); // Reconfigura para atualizar o badge no MenuItem
        });
    }

    configurarMenus() {
        const role = this.authService.getRoleDoToken();
        const isAdmin = role === 'ADMIN';

        // Menu Base (Sempre visível)
        const baseItems: MenuItem[] = [
            { label: 'Início', icon: 'pi pi-fw pi-home', routerLink: ['/'], routerLinkActiveOptions: { exact: true } },
            { label: 'Quem Somos', icon: 'pi pi-fw pi-info-circle', routerLink: ['/quem-somos'] }
        ];

        // Itens Privados
        const privateItems: MenuItem[] = [];
        if (this.isAutenticado) {
            privateItems.push({ label: 'Loja', icon: 'pi pi-fw pi-shopping-cart', routerLink: ['/loja'] });
            privateItems.push({ label: 'Pedidos', icon: 'pi pi-fw pi-list', routerLink: ['/pedidos'] });
            
            if (isAdmin) {
                privateItems.push({
                    label: 'Administrador',
                    icon: 'pi pi-fw pi-user-edit',
                    items: [
                        { label: 'Produtos', icon: 'pi pi-fw pi-tag', routerLink: ['/produtos'] },
                        { label: 'Usuários', icon: 'pi pi-fw pi-users', routerLink: ['/usuarios'] },
                        { label: 'Formas de Pagamento', icon: 'pi pi-fw pi-credit-card', routerLink: ['/formas-pagamento'] },
                        { label: 'Setores', icon: 'pi pi-fw pi-map', routerLink: ['/setores'] },
                        { label: 'Tabelas de Frete', icon: 'pi pi-fw pi-truck', routerLink: ['/frete'] },
                        { label: 'Configurações', icon: 'pi pi-fw pi-cog', routerLink: ['/configuracao'] },
                        { label: 'Logs de Acesso', icon: 'pi pi-fw pi-database', routerLink: ['/logs'] }
                    ]
                });
            }
            privateItems.push({ 
                label: 'Carrinho', 
                icon: 'pi pi-fw pi-shopping-bag', 
                routerLink: ['/carrinho'],
                badge: this.qtdCarrinho > 0 ? this.qtdCarrinho.toString() : undefined,
                badgeStyleClass: 'p-badge-success'
            });
        }

        // Montagem do menuItems (Desktop)
        this.menuItems = [...baseItems, ...privateItems];

        // Montagem do burgerItems (Mobile)
        // No mobile mostramos apenas o que não está nos botões de acesso rápido
        this.burgerItems = [
            { label: 'Quem Somos', icon: 'pi pi-fw pi-info-circle', routerLink: ['/quem-somos'] }
        ];

        if (this.isAutenticado) {
            if (isAdmin) {
                this.burgerItems.push({
                    label: 'Administrador',
                    icon: 'pi pi-fw pi-user-edit',
                    items: [
                        { label: 'Produtos', icon: 'pi pi-fw pi-tag', routerLink: ['/produtos'] },
                        { label: 'Usuários', icon: 'pi pi-fw pi-users', routerLink: ['/usuarios'] },
                        { label: 'Formas de Pagamento', icon: 'pi pi-fw pi-credit-card', routerLink: ['/formas-pagamento'] },
                        { label: 'Setores', icon: 'pi pi-fw pi-map', routerLink: ['/setores'] },
                        { label: 'Tabelas de Frete', icon: 'pi pi-fw pi-truck', routerLink: ['/frete'] },
                        { label: 'Configurações', icon: 'pi pi-fw pi-cog', routerLink: ['/configuracao'] },
                        { label: 'Logs de Acesso', icon: 'pi pi-fw pi-database', routerLink: ['/logs'] }
                    ]
                });
            }
            this.burgerItems.push({ separator: true });
            this.burgerItems.push({ label: 'Sair', icon: 'pi pi-fw pi-sign-out', command: () => this.onLogout() });
        } else {
            this.burgerItems.push({ separator: true });
            this.burgerItems.push({ label: 'Entrar', icon: 'pi pi-fw pi-sign-in', routerLink: ['/login'] });
        }
    }

    onLogout() {
        this.authService.logout();
    }
}
