import { Component, OnInit } from '@angular/core';
import { PedidoService, Pedido } from '../../../services/pedido.service';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-pedido-list',
    templateUrl: './pedido-list.component.html',
    styleUrls: ['./pedido-list.component.css']
})
export class PedidoListComponent implements OnInit {
    pedidos: Pedido[] = [];
    usuarios: Usuario[] = [];
    filtroCliente: string = '';
    isAdmin: boolean = false;
    filtroId: number | null = null;
    filtroDataInicio: string = '';
    filtroDataFim: string = '';
    filtroSituacao: string = '';
    exibirCancelados: boolean = false;
    
    situacoesPedido: any[] = [];

    currentPage: number = 0;
    pageSize: number = 10;
    totalElements: number = 0;
    pageSizeOptions: number[] = [10, 20, 30, 40, 50];
    sortField: string = 'dataPedido';
    sortDir: string = 'desc';
    
    get totalPages(): number {
        return Math.ceil(this.totalElements / this.pageSize);
    }

    loading: boolean = false;
    avisoPdf: boolean = false;
    exibirModalSucessoNovoPedido: boolean = false;
    pedidoRecemCriadoId: number | null = null;

    constructor(
        private pedidoService: PedidoService,
        private usuarioService: UsuarioService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.isAdmin = this.authService.getRoleDoToken() === 'ADMIN';
        this.carregarSituacoes();
        this.carregarPedidos();

        if (history.state && history.state.novoPedidoCriadoId) {
            this.pedidoRecemCriadoId = history.state.novoPedidoCriadoId;
            this.exibirModalSucessoNovoPedido = true;
            // Limpa o state para evitar reabertura no refresh
            window.history.replaceState({}, '');
        }
    }

    carregarSituacoes(): void {
        this.pedidoService.obterSituacoesPedido().subscribe(situacoes => {
            this.situacoesPedido = situacoes;
        });
    }

    carregarPedidos(): void {
        this.loading = true;
        const sortParam = `${this.sortField},${this.sortDir}`;

        let dataInicioISO = undefined;
        let dataFimISO = undefined;

        if (this.filtroDataInicio) {
            dataInicioISO = `${this.filtroDataInicio}T00:00:00`;
        }
        if (this.filtroDataFim) {
            dataFimISO = `${this.filtroDataFim}T23:59:59`;
        }

        this.pedidoService.listar(
            this.filtroId || undefined,
            this.filtroCliente || undefined,
            dataInicioISO,
            dataFimISO,
            this.filtroSituacao || undefined,
            this.currentPage,
            this.pageSize,
            sortParam,
            this.exibirCancelados
        ).subscribe(response => {
            this.pedidos = response.content;
            this.totalElements = response.totalElements;
            this.loading = false;
        }, error => {
            console.error('Erro ao carregar pedidos', error);
            this.loading = false;
        });
    }

    alternarOrdenacao(campo: string): void {
        if (this.sortField === campo) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = campo;
            this.sortDir = 'asc';
        }
        this.carregarPedidos();
    }

    getSortIcon(campo: string): string {
        if (this.sortField !== campo) return 'fa-sort';
        return this.sortDir === 'asc' ? 'fa-sort-asc' : 'fa-sort-desc';
    }

    onPageChange(event: any): void {
        this.currentPage = event.pageIndex;
        this.pageSize = event.pageSize;
        this.carregarPedidos();
    }

    filtrarPedidos(): void {
        this.currentPage = 0;
        this.carregarPedidos();
    }

    limparFiltros(): void {
        this.filtroCliente = '';
        this.filtroId = null;
        this.filtroDataInicio = '';
        this.filtroDataFim = '';
        this.filtroSituacao = '';
        this.filtrarPedidos();
    }

    novoPedido(): void {
        this.router.navigate(['/pedidos/novo']);
    }

    editarPedido(id: number): void {
        this.router.navigate(['/pedidos/editar', id]);
    }

    cancelarPedido(pedido: Pedido): void {
        const role = this.authService.getRoleDoToken();
        if (role === 'CLIENTE' && pedido.situacao !== 'PENDENTE' && pedido.situacao !== 'EM_PRODUCAO') {
            alert('Apenas pedidos com situação Pendente ou Em Produção podem ser cancelados por clientes.');
            return;
        }

        const confirmacao = confirm(`Deseja realmente cancelar o pedido #${pedido.id}?\nCliente: ${pedido.usuarioNome}\nData: ${new Date(pedido.dataPedido).toLocaleDateString()}`);
        if (confirmacao) {
            this.pedidoService.cancelar(pedido.id).subscribe(() => {
                alert('Pedido cancelado com sucesso!');
                this.carregarPedidos();
            });
        }
    }

    alterarSituacao(pedido: Pedido, novaSituacao: string): void {
        if (!this.isAdmin) return;
        
        this.pedidoService.alterarSituacao(pedido.id, novaSituacao).subscribe(() => {
            pedido.situacao = novaSituacao;
            const sitObj = this.situacoesPedido.find(s => s.codigo === novaSituacao);
            if (sitObj) {
                pedido.situacaoDescricao = sitObj.descricao;
            }
        }, error => {
            console.error('Erro ao alterar situação', error);
            alert('Erro ao alterar situação do pedido.');
            this.carregarPedidos(); // Revert local changes by reloading
        });
    }

    gerarPdf(id: number): void {
        this.avisoPdf = true;
        this.pedidoService.gerarPdf(id).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pedido_${id}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        }, error => {
            console.error('Erro ao gerar PDF', error);
            alert('Erro ao gerar PDF. Tente novamente.');
            this.avisoPdf = false;
        });
    }

    fecharAvisoPdf(): void {
        this.avisoPdf = false;
    }

    fecharModalSucesso(baixarPdf: boolean): void {
        this.exibirModalSucessoNovoPedido = false;
        if (baixarPdf && this.pedidoRecemCriadoId) {
            this.gerarPdf(this.pedidoRecemCriadoId);
        }
        this.pedidoRecemCriadoId = null;
    }
}
