import { Component, OnInit } from '@angular/core';
import { Setor } from '../../models/setor.model';
import { Frete } from '../../models/frete.model';
import { SetorService } from '../../services/setor.service';
import { FreteService } from '../../services/frete.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
    selector: 'app-setor',
    templateUrl: './setor.component.html',
    styleUrls: ['./setor.component.css']
})
export class SetorComponent implements OnInit {

    setores: Setor[] = [];
    setorAtual: Setor = this.getNovoSetor();
    filtroDescricaoSetor: string = '';
    modoEdicao: boolean = false;
    activeIndex: number = 0;

    // Relacionamento com Tabela de Frete (p-autoComplete)
    tabelaSelecionada: any;
    tabelasFiltradas: Frete[] = [];
    tabelasVinculadas: Frete[] = [];

    constructor(
        private setorService: SetorService,
        private freteService: FreteService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.carregarSetores();
    }

    getNovoSetor(): Setor {
        return {
            descricao: '',
            ativo: true,
            tabelasFreteIds: []
        };
    }


    carregarSetores(): void {
        this.setorService.listarTodos().subscribe({
            next: (data) => this.setores = data,
            error: (err) => console.error('Erro ao listar setores', err)
        });
    }

    pesquisarSetores(): void {
        if (this.filtroDescricaoSetor.trim()) {
            this.setorService.buscarPorDescricao(this.filtroDescricaoSetor).subscribe({
                next: (data) => this.setores = data,
                error: (err) => console.error('Erro ao pesquisar setores', err)
            });
        } else {
            this.carregarSetores();
        }
    }

    filtrarTabelas(event: any): void {
        const termo = event.query;
        if (termo && termo.length >= 3) {
            this.freteService.buscarPorDescricao(termo).subscribe({
                next: (data) => this.tabelasFiltradas = data.filter(t => t.ativo),
                error: (err) => console.error('Erro ao buscar tabelas de frete', err)
            });
        }
    }

    adicionarTabela(): void {
        if (this.tabelaSelecionada) {
            const tabela = this.tabelaSelecionada;
            if (tabela && !this.tabelasVinculadas.some(t => t.id === tabela.id)) {
                this.tabelasVinculadas.push(tabela);
                this.tabelaSelecionada = null;
                this.tabelasFiltradas = [];
            } else if (tabela) {
                this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Esta tabela já está vinculada ao setor.' });
            }
        }
    }

    removerTabela(tabelaId?: number): void {
        this.tabelasVinculadas = this.tabelasVinculadas.filter(t => t.id !== tabelaId);
    }

    salvar(): void {
        // Definir os IDs de todas as tabelas na lista vinculada
        this.setorAtual.tabelasFreteIds = this.tabelasVinculadas
            .map(t => t.id)
            .filter((id): id is number => id !== undefined);

        if (this.modoEdicao && this.setorAtual.id) {
            this.setorService.alterar(this.setorAtual.id, this.setorAtual).subscribe({
                next: () => {
                    this.finalizarAcao();
                    this.carregarSetores();
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Setor alterado com sucesso!' });
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erro', detail: err.error || 'Erro ao alterar setor' })
            });
        } else {
            this.setorService.cadastrar(this.setorAtual).subscribe({
                next: () => {
                    this.finalizarAcao();
                    this.carregarSetores();
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Setor cadastrado com sucesso!' });
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erro', detail: err.error || 'Erro ao cadastrar setor' })
            });
        }
    }

    editar(setor: Setor): void {
        this.modoEdicao = true;
        this.activeIndex = 0;
        this.setorAtual = { ...setor };

        if (setor.id) {
            this.setorService.buscarPorId(setor.id).subscribe({
                next: (data) => {
                    this.setorAtual = data;
                    this.tabelasVinculadas = data.tabelasFrete || [];
                }
            });
        }
        window.scrollTo(0, 0);
    }

    desativar(setor: Setor): void {
        if (!setor.id) return;
        
        this.confirmationService.confirm({
            message: `Tem certeza que deseja desativar o setor <b>${setor.descricao}</b>?`,
            header: 'Confirmar Desativação',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.setorService.desativar(setor.id!).subscribe({
                    next: () => {
                        this.carregarSetores();
                        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Setor desativado!' });
                    },
                    error: (err) => console.error('Erro ao desativar setor', err)
                });
            }
        });
    }

    ativar(id?: number): void {
        if (id) {
            this.setorService.ativar(id).subscribe({
                next: () => {
                    this.carregarSetores();
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Setor ativado!' });
                },
                error: (err) => console.error('Erro ao ativar setor', err)
            });
        }
    }

    cancelar(): void {
        this.finalizarAcao();
    }

    finalizarAcao(): void {
        this.setorAtual = this.getNovoSetor();
        this.tabelaSelecionada = null;
        this.tabelasFiltradas = [];
        this.tabelasVinculadas = [];
        this.activeIndex = 0;
        this.modoEdicao = false;
    }
}
