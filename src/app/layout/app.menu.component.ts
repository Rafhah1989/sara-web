import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { LayoutService } from './service/app.layout.service';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html'
})
export class AppMenuComponent implements OnInit {

    model: any[] = [];

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService
    ) { }

    ngOnInit() {
        const isAdmin = this.authService.getRoleDoToken() === 'ADMIN';

        this.model = [
            {
                label: 'Principal',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] },
                    { label: 'Pedidos', icon: 'pi pi-fw pi-shopping-bag', routerLink: ['/pedidos'] },
                    { label: 'Usuários', icon: 'pi pi-fw pi-users', routerLink: ['/usuarios'], visible: isAdmin },
                    { label: 'Produtos', icon: 'pi pi-fw pi-tag', routerLink: ['/produtos'], visible: isAdmin }
                ]
            },
            {
                label: 'Configurações',
                items: [
                    { label: 'Setores', icon: 'pi pi-fw pi-map', routerLink: ['/setores'], visible: isAdmin },
                    { label: 'Tabelas de Frete', icon: 'pi pi-fw pi-truck', routerLink: ['/frete'], visible: isAdmin },
                    { label: 'Formas de Pagamento', icon: 'pi pi-fw pi-credit-card', routerLink: ['/formas-pagamento'], visible: isAdmin },
                    { label: 'Configurações do Sistema', icon: 'pi pi-fw pi-cog', routerLink: ['/configuracao'], visible: isAdmin },
                    { label: 'Logs do Sistema', icon: 'pi pi-fw pi-database', routerLink: ['/logs'], visible: isAdmin }
                ]
            },
            {
                label: 'Institucional',
                items: [
                    { label: 'Quem Somos', icon: 'pi pi-fw pi-info-circle', routerLink: ['/quem-somos'] }
                ]
            }
        ];
    }
}
