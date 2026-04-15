import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { UsuarioService } from '../../services/usuario.service';
import { Usuario } from '../../models/usuario.model';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

@Component({
    selector: 'app-usuarios',
    templateUrl: './usuarios.component.html',
    styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit, OnDestroy {
    users: Usuario[] = [];
    filtroNome: string = '';
    
    // Busca Dinâmica
    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    // Modal Histórico
    usuarioSelecionadoHistorico?: Usuario;
    exibirModalHistorico: boolean = false;

    // Menu de Ações
    @ViewChild('menu') menu!: Menu;
    menuItems: MenuItem[] = [];
    usuarioSelecionado?: Usuario;

    constructor(
        private usuarioService: UsuarioService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.carregarUsuarios();

        // Configura busca dinâmica por nome
        this.searchSubject.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(nome => {
            if (nome.length >= 3) {
                this.pesquisarNome(nome);
            } else if (nome.length === 0) {
                this.carregarUsuarios();
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    carregarUsuarios(): void {
        this.usuarioService.listarTodos().subscribe({
            next: (data) => this.users = data,
            error: (err) => console.error('Erro ao listar usuários', err)
        });
    }

    onNomeInput(): void {
        this.searchSubject.next(this.filtroNome);
    }

    pesquisarNome(nome: string): void {
        this.usuarioService.buscarPorNome(nome).subscribe({
            next: (data) => this.users = data,
            error: (err) => console.error('Erro ao pesquisar usuários', err)
        });
    }

    cadastrarNovo(): void {
        this.router.navigate(['/usuarios/novo']);
    }

    editar(user: Usuario): void {
        this.router.navigate(['/usuarios/editar', user.id]);
    }

    verHistorico(user: Usuario): void {
        this.usuarioSelecionadoHistorico = user;
        this.exibirModalHistorico = true;
    }

    fecharHistorico(): void {
        this.exibirModalHistorico = false;
        this.usuarioSelecionadoHistorico = undefined;
    }

    reenviarConvite(user: Usuario): void {
        if (!user.id) return;
        if (confirm(`Deseja reenviar o e-mail de convite para ${user.nome}? Uma nova senha provisória será gerada.`)) {
            this.usuarioService.reenviarEmailConvite(user.id).subscribe({
                next: () => alert('E-mail de convite enviado com sucesso!'),
                error: (err) => alert('Erro ao reenviar convite: ' + (err.error || err.message))
            });
        }
    }

    desativar(id?: number): void {
        if (id && confirm('Tem certeza que deseja desativar este usuário?')) {
            this.usuarioService.desativar(id).subscribe({
                next: () => this.carregarUsuarios(),
                error: (err) => alert(err.error || 'Erro ao desativar usuário')
            });
        }
    }

    ativar(id?: number): void {
        if (id) {
            this.usuarioService.ativar(id).subscribe({
                next: () => this.carregarUsuarios(),
                error: (err) => alert(err.error || 'Erro ao ativar usuário')
            });
        }
    }

    configurarMenu(user: Usuario, event: Event): void {
        this.usuarioSelecionado = user;
        this.menuItems = [
            {
                label: 'Ações',
                items: [
                    { label: 'Editar', icon: 'pi pi-pencil', command: () => this.editar(user) },
                    { label: 'Histórico', icon: 'pi pi-history', command: () => this.verHistorico(user) },
                    { label: 'Reenviar Convite', icon: 'pi pi-envelope', command: () => this.reenviarConvite(user) },
                    { 
                        label: user.ativo ? 'Desativar' : 'Ativar', 
                        icon: user.ativo ? 'pi pi-ban' : 'pi pi-check',
                        styleClass: user.ativo ? 'text-danger' : 'text-success',
                        command: () => user.ativo ? this.desativar(user.id) : this.ativar(user.id)
                    }
                ]
            }
        ];
        this.menu.toggle(event);
    }
}
