import { Component, OnInit } from '@angular/core';
import { Frete } from '../../models/frete.model';
import { FreteService } from '../../services/frete.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
    selector: 'app-frete',
    templateUrl: './frete.component.html',
    styleUrls: ['./frete.component.css']
})
export class FreteComponent implements OnInit {

    tabelasFrete: Frete[] = [];
    freteAtual: Frete = this.getNovoFrete();
    filtroDescricao: string = '';
    modoEdicao: boolean = false;

    constructor(
        private freteService: FreteService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.carregarTabelas();
    }

    getNovoFrete(): Frete {
        return {
            descricao: '',
            valor: 0,
            ativo: true,
            quantidadeFaixa: undefined,
            valorFaixa: undefined,
            minimoFaixa: undefined
        };
    }

    carregarTabelas(): void {
        this.freteService.listarTodas().subscribe({
            next: (data) => this.tabelasFrete = data,
            error: (err) => console.error('Erro ao listar tabelas de frete', err)
        });
    }

    pesquisar(): void {
        if (this.filtroDescricao.trim()) {
            this.freteService.buscarPorDescricao(this.filtroDescricao).subscribe({
                next: (data) => this.tabelasFrete = data,
                error: (err) => console.error('Erro ao pesquisar tabelas de frete', err)
            });
        } else {
            this.carregarTabelas();
        }
    }


    salvar(): void {
        if (this.modoEdicao && this.freteAtual.id) {
            this.freteService.alterar(this.freteAtual.id, this.freteAtual).subscribe({
                next: () => {
                    this.finalizarAcao();
                    this.carregarTabelas();
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tabela de Frete alterada!' });
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erro', detail: err.error || 'Erro ao alterar tabela de frete' })
            });
        } else {
            this.freteService.cadastrar(this.freteAtual).subscribe({
                next: () => {
                    this.finalizarAcao();
                    this.carregarTabelas();
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tabela de Frete cadastrada!' });
                },
                error: (err) => this.messageService.add({ severity: 'error', summary: 'Erro', detail: err.error || 'Erro ao cadastrar tabela de frete' })
            });
        }
    }

    editar(frete: Frete): void {
        this.freteAtual = { ...frete };
        this.modoEdicao = true;
        window.scrollTo(0, 0);
    }

    desativar(id?: number): void {
        if (!id) return;
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja desativar esta tabela de frete?',
            header: 'Confirmar Desativação',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.freteService.desativar(id).subscribe({
                    next: () => {
                        this.carregarTabelas();
                        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tabela desativada!' });
                    },
                    error: (err) => console.error('Erro ao desativar tabela de frete', err)
                });
            }
        });
    }

    ativar(frete: Frete): void {
        const freteAtivado = { ...frete, ativo: true };
        if (frete.id) {
            this.freteService.alterar(frete.id, freteAtivado).subscribe({
                next: () => {
                    this.carregarTabelas();
                    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tabela ativada!' });
                },
                error: (err) => console.error('Erro ao ativar tabela de frete', err)
            });
        }
    }

    cancelar(): void {
        this.finalizarAcao();
    }

    finalizarAcao(): void {
        this.freteAtual = this.getNovoFrete();
        this.modoEdicao = false;
    }
}
