import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { LayoutService } from './service/app.layout.service';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html'
})
export class AppMenuComponent implements OnInit {

    model: any[] = [];

    constructor(public layoutService: LayoutService) { }

    ngOnInit() {
        this.model = [
            {
                label: 'Principal',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] },
                    { label: 'Pedidos', icon: 'pi pi-fw pi-shopping-bag', routerLink: ['/pedidos'] },
                    { label: 'Usuários', icon: 'pi pi-fw pi-users', routerLink: ['/usuarios'] },
                    { label: 'Produtos', icon: 'pi pi-fw pi-tag', routerLink: ['/produtos'] }
                ]
            },
            {
                label: 'Configurações',
                items: [
                    { label: 'Setores', icon: 'pi pi-fw pi-map', routerLink: ['/setores'] },
                    { label: 'Formas de Pagamento', icon: 'pi pi-fw pi-credit-card', routerLink: ['/formas-pagamento'] },
                    { label: 'Configurações do Sistema', icon: 'pi pi-fw pi-cog', routerLink: ['/configuracao'] },
                    { label: 'Logs do Sistema', icon: 'pi pi-fw pi-database', routerLink: ['/logs'] }
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
