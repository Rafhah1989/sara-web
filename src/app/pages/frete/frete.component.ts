import { Component, OnInit } from '@angular/core';
import { Frete } from '../../models/frete.model';
import { FreteService } from '../../services/frete.service';

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
    valorMascarado: string = '';

    constructor(private freteService: FreteService) { }

    ngOnInit(): void {
        this.carregarTabelas();
    }

    getNovoFrete(): Frete {
        return {
            descricao: '',
            valor: 0,
            ativo: true
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

    applyCurrencyMask(event: any): void {
        let value = event.target.value.replace(/\D/g, '');
        if (!value) {
            this.valorMascarado = '';
            this.freteAtual.valor = 0;
            return;
        }

        const numberValue = (parseFloat(value) / 100);
        this.freteAtual.valor = numberValue;
        this.valorMascarado = numberValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    salvar(): void {
        if (this.modoEdicao && this.freteAtual.id) {
            this.freteService.alterar(this.freteAtual.id, this.freteAtual).subscribe({
                next: () => {
                    this.finalizarAcao();
                    this.carregarTabelas();
                },
                error: (err) => {
                    alert(err.error || 'Erro ao alterar tabela de frete');
                    console.error('Erro ao alterar tabela de frete', err);
                }
            });
        } else {
            this.freteService.cadastrar(this.freteAtual).subscribe({
                next: () => {
                    this.finalizarAcao();
                    this.carregarTabelas();
                },
                error: (err) => {
                    alert(err.error || 'Erro ao cadastrar tabela de frete');
                    console.error('Erro ao cadastrar tabela de frete', err);
                }
            });
        }
    }

    editar(frete: Frete): void {
        this.freteAtual = { ...frete };
        this.valorMascarado = frete.valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        this.modoEdicao = true;
        window.scrollTo(0, 0);
    }

    desativar(id?: number): void {
        if (id && confirm('Tem certeza que deseja desativar esta tabela de frete?')) {
            this.freteService.desativar(id).subscribe({
                next: () => this.carregarTabelas(),
                error: (err) => console.error('Erro ao desativar tabela de frete', err)
            });
        }
    }

    ativar(frete: Frete): void {
        const freteAtivado = { ...frete, ativo: true };
        if (frete.id) {
            this.freteService.alterar(frete.id, freteAtivado).subscribe({
                next: () => this.carregarTabelas(),
                error: (err) => console.error('Erro ao ativar tabela de frete', err)
            });
        }
    }

    cancelar(): void {
        this.finalizarAcao();
    }

    finalizarAcao(): void {
        this.freteAtual = this.getNovoFrete();
        this.valorMascarado = '';
        this.modoEdicao = false;
    }
}
