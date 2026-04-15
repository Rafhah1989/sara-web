import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PedidoService, Pedido } from '../../services/pedido.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-historico-cliente-modal',
    templateUrl: './historico-cliente-modal.component.html',
    styleUrls: ['./historico-cliente-modal.component.css']
})
export class HistoricoClienteModalComponent implements OnInit {
    @Input() usuarioId!: number;
    @Input() usuarioNome!: string;
    @Output() fechar = new EventEmitter<void>();

    pedidos: any[] = [];
    loading: boolean = false;
    
    // Filtros
    exibirCancelados: boolean = false;
    filtroSituacao: string = '';
    situacoesPedido: any[] = [];
    display: boolean = true;

    constructor(
        private pedidoService: PedidoService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.carregarSituacoes();
        this.carregarHistorico();
    }

    carregarSituacoes(): void {
        this.pedidoService.obterSituacoesPedido().subscribe({
            next: (data) => this.situacoesPedido = data,
            error: (err) => console.error('Erro ao carregar situações', err)
        });
    }

    carregarHistorico(): void {
        this.loading = true;
        // Parâmetros: id, clienteNome, dataInicio, dataFim, situacao, page, size, sort, exibirCancelados, usuarioId
        this.pedidoService.listar(
            undefined, 
            undefined, 
            undefined, 
            undefined, 
            this.filtroSituacao || undefined, 
            0, 
            100, 
            'dataPedido,desc', 
            this.exibirCancelados, 
            this.usuarioId
        ).subscribe({
            next: (data) => {
                this.pedidos = data.content;
                this.loading = false;
            },
            error: (err) => {
                console.error('Erro ao carregar histórico', err);
                this.loading = false;
            }
        });
    }

    getSeverity(situacao: string): string {
        switch (situacao) {
            case 'PENDENTE': return 'warning';
            case 'CONFIRMADO': return 'info';
            case 'EM_PRODUCAO': return 'primary';
            case 'PRONTO_PARA_ENTREGA': return 'success';
            case 'ENTREGUE': return 'success';
            case 'CANCELADO': return 'danger';
            default: return 'secondary';
        }
    }

    editarPedido(id: number): void {
        this.fechar.emit();
        this.router.navigate(['/pedidos/editar', id]);
    }

    onFechar(): void {
        this.fechar.emit();
    }
}
