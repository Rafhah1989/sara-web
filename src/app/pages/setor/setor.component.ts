import { Component, OnInit } from '@angular/core';
import { Setor } from '../../models/setor.model';
import { Frete } from '../../models/frete.model';
import { SetorService } from '../../services/setor.service';
import { FreteService } from '../../services/frete.service';

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
    abaAtiva: number = 1;

    // Relacionamento com Tabela de Frete
    termoBuscaTabela: string = '';
    tabelasFiltradas: Frete[] = [];
    tabelaSelecionadaId?: number;
    tabelasVinculadas: Frete[] = [];

    constructor(
        private setorService: SetorService,
        private freteService: FreteService
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

    setAba(aba: number): void {
        this.abaAtiva = aba;
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

    onBuscaTabelaInput(event: any): void {
        const termo = event.target.value;
        if (termo && termo.length >= 3) {
            this.freteService.buscarPorDescricao(termo).subscribe({
                next: (data) => this.tabelasFiltradas = data.filter(t => t.ativo),
                error: (err) => console.error('Erro ao buscar tabelas de frete', err)
            });
        } else {
            this.tabelasFiltradas = [];
        }
    }

    adicionarTabela(): void {
        if (this.tabelaSelecionadaId) {
            const tabela = this.tabelasFiltradas.find(t => t.id === Number(this.tabelaSelecionadaId));
            if (tabela && !this.tabelasVinculadas.some(t => t.id === tabela.id)) {
                this.tabelasVinculadas.push(tabela);
                // Limpar busca após adicionar
                this.tabelaSelecionadaId = undefined;
                this.termoBuscaTabela = '';
                this.tabelasFiltradas = [];
            } else if (tabela) {
                alert('Esta tabela já está vinculada ao setor.');
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
                },
                error: (err) => alert(err.error || 'Erro ao alterar setor')
            });
        } else {
            this.setorService.cadastrar(this.setorAtual).subscribe({
                next: () => {
                    this.finalizarAcao();
                    this.carregarSetores();
                },
                error: (err) => alert(err.error || 'Erro ao cadastrar setor')
            });
        }
    }

    editar(setor: Setor): void {
        this.modoEdicao = true;
        this.abaAtiva = 1;
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

    desativar(id?: number): void {
        if (id && confirm('Tem certeza que deseja desativar este setor?')) {
            this.setorService.desativar(id).subscribe({
                next: () => this.carregarSetores(),
                error: (err) => console.error('Erro ao desativar setor', err)
            });
        }
    }

    ativar(id?: number): void {
        if (id) {
            this.setorService.ativar(id).subscribe({
                next: () => this.carregarSetores(),
                error: (err) => console.error('Erro ao ativar setor', err)
            });
        }
    }

    cancelar(): void {
        this.finalizarAcao();
    }

    finalizarAcao(): void {
        this.setorAtual = this.getNovoSetor();
        this.termoBuscaTabela = '';
        this.tabelasFiltradas = [];
        this.tabelaSelecionadaId = undefined;
        this.tabelasVinculadas = [];
        this.abaAtiva = 1;
        this.modoEdicao = false;
    }
}
