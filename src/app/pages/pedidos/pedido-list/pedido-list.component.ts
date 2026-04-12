import { Component, OnInit, HostListener } from '@angular/core';
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
    exibirFiltrosMobile: boolean = false;
    itemMenuAberto: number | null = null;
    
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
    
    exibirModalCancelamento: boolean = false;
    motivoCancelamento: string = '';
    pedidoParaCancelar: Pedido | null = null;

    exibirModalNotaFiscal: boolean = false;
    pedidoParaNotaFiscal: Pedido | null = null;
    arquivoSelecionado: File | null = null;
    uploadingNotaFiscal: boolean = false;
    isDragging: boolean = false;
    notificarCliente: boolean = true;
    numeroNotaFiscal: string = '';
    
    // Confirmação de Pedido
    exibirModalConfirmacao: boolean = false;
    pedidoParaConfirmar: Pedido | null = null;
    novaSituacaoParaConfirmar: string = '';
    enviarEmailConfirmacao: boolean = true;

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
        if (this.sortField !== campo) return 'pi-sort-alt';
        return this.sortDir === 'asc' ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
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
        this.fecharFiltrosMobile();
    }

    abrirFiltrosMobile(): void {
        this.exibirFiltrosMobile = true;
    }

    fecharFiltrosMobile(): void {
        this.exibirFiltrosMobile = false;
    }

    alternarMenuAcoes(pedidoId: number, event: Event): void {
        event.stopPropagation();
        if (this.itemMenuAberto === pedidoId) {
            this.itemMenuAberto = null;
        } else {
            this.itemMenuAberto = pedidoId;
        }
    }

    @HostListener('document:click')
    clickFora(): void {
        this.itemMenuAberto = null;
    }

    novoPedido(): void {
        this.router.navigate(['/pedidos/novo']);
    }

    editarPedido(id: number): void {
        this.router.navigate(['/pedidos/editar', id]);
    }

    visualizarPagamentoOnline(pedido: Pedido): void {
        const proximo = this.getProximoPagamentoOnline(pedido);
        if (!proximo || !proximo.id) return;

        this.router.navigate(['/pedidos/pix', pedido.id], { queryParams: { pagamentoId: proximo.id } });
    }

    getProximoPagamentoOnline(pedido: Pedido): any {
        if (!pedido.pagamentos) return null;
        return pedido.pagamentos
            .filter(p => !p.pago && p.pagamentoOnline && (p.boletoPdfUrl || p.pixCopiaECola || p.mercadopagoPagamentoId))
            .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())[0];
    }

    temPagamentoOnlinePendente(pedido: Pedido): boolean {
        if (!pedido.pagamentos) return false;
        return pedido.pagamentos.some(p => !p.pago && p.pagamentoOnline && (p.boletoPdfUrl || p.pixCopiaECola || p.mercadopagoPagamentoId));
    }

    cancelarPedido(pedido: Pedido): void {
        const role = this.authService.getRoleDoToken();
        if (role === 'CLIENTE' && pedido.situacao !== 'PENDENTE' && pedido.situacao !== 'EM_PRODUCAO') {
            alert('Apenas pedidos com situação Pendente ou Em Produção podem ser cancelados por clientes.');
            return;
        }

        this.pedidoParaCancelar = pedido;
        this.motivoCancelamento = '';
        this.exibirModalCancelamento = true;
    }

    confirmarCancelamento(): void {
        if (!this.pedidoParaCancelar) return;

        this.pedidoService.cancelar(this.pedidoParaCancelar.id, this.motivoCancelamento).subscribe(() => {
            alert('Pedido cancelado com sucesso!');
            this.fecharModalCancelamento();
            this.carregarPedidos();
        });
    }

    fecharModalCancelamento(): void {
        this.exibirModalCancelamento = false;
        this.pedidoParaCancelar = null;
        this.motivoCancelamento = '';
    }

    alterarSituacao(pedido: Pedido, novaSituacao: string): void {
        if (!this.isAdmin) return;

        if (novaSituacao === 'CONFIRMADO') {
            this.pedidoParaConfirmar = pedido;
            this.novaSituacaoParaConfirmar = novaSituacao;
            this.enviarEmailConfirmacao = true;
            this.exibirModalConfirmacao = true;
            return;
        }
        
        this.executarAlteracaoSituacao(pedido, novaSituacao, false);
    }

    executarAlteracaoSituacao(pedido: Pedido, novaSituacao: string, enviarEmail: boolean): void {
        const obs = novaSituacao === 'CONFIRMADO' 
            ? this.pedidoService.confirmar(pedido.id, enviarEmail)
            : this.pedidoService.alterarSituacao(pedido.id, novaSituacao, enviarEmail);

        obs.subscribe(() => {
            pedido.situacao = novaSituacao;
            const sitObj = this.situacoesPedido.find(s => s.codigo === novaSituacao);
            if (sitObj) {
                pedido.situacaoDescricao = sitObj.descricao;
            }
            if (this.exibirModalConfirmacao) {
                this.fecharModalConfirmacao();
                alert('Pedido confirmado com sucesso!');
            }
        }, error => {
            console.error('Erro ao alterar situação', error);
            alert('Erro ao alterar situação do pedido.');
            this.carregarPedidos(); // Revert local changes by reloading
        });
    }

    confirmarPedido(): void {
        if (!this.pedidoParaConfirmar) return;
        this.executarAlteracaoSituacao(this.pedidoParaConfirmar, this.novaSituacaoParaConfirmar, this.enviarEmailConfirmacao);
    }

    fecharModalConfirmacao(): void {
        this.exibirModalConfirmacao = false;
        this.pedidoParaConfirmar = null;
        this.novaSituacaoParaConfirmar = '';
    }

    alterarStatusPago(pedido: Pedido, pago: boolean): void {
        if (!this.isAdmin) return;
        
        this.pedidoService.alterarStatusPago(pedido.id, pago).subscribe(() => {
            pedido.pago = pago;
        }, error => {
            console.error('Erro ao alterar status de pagamento', error);
            alert('Erro ao alterar status de pagamento do pedido.');
            this.carregarPedidos();
        });
    }

    verificarPagamentoManual(pedido: Pedido): void {
        if (!this.isAdmin) return;
        
        const pendentesOnline = pedido.pagamentos?.filter(p => 
            !p.pago && p.pagamentoOnline && p.mercadopagoPagamentoId
        ) || [];
        
        if (pendentesOnline.length === 0) {
            alert('Não há parcelas online pendentes para verificação automática.');
            return;
        }

        this.loading = true;
        let sucessos = 0;
        let total = pendentesOnline.length;

        pendentesOnline.forEach(p => {
            if (p.id) {
                this.pedidoService.verificarPagamentoManual(p.id).subscribe({
                    next: (res) => {
                        sucessos++;
                        if (sucessos === total) {
                            alert('Verificação concluída.');
                            this.carregarPedidos();
                        }
                    },
                    error: (err) => {
                        console.error('Erro ao verificar parcela', p.id, err);
                        total--; // Ignora erro para contagem de finalização se necessário
                        if (sucessos === total || total === 0) {
                            alert('Verificação concluída com erros.');
                            this.carregarPedidos();
                        }
                    }
                });
            }
        });
    }

    verificarTodosPagamentosPendentes(): void {
        const pendentes = this.pedidos.filter(p => !p.pago && p.pagamentoOnline);
        if (pendentes.length === 0) {
            alert('Não há pedidos PIX pendentes na lista atual.');
            return;
        }

        if (confirm(`Deseja verificar o status de ${pendentes.length} pedido(s) PIX pendente(s)?`)) {
            this.loading = true;
            let processados = 0;
            pendentes.forEach(p => {
                this.pedidoService.verificarPagamentoManual(p.id).subscribe({
                    next: () => {
                        processados++;
                        if (processados === pendentes.length) {
                            alert('Verificação em lote concluída.');
                            this.carregarPedidos();
                        }
                    },
                    error: () => {
                        processados++;
                        if (processados === pendentes.length) {
                            alert('Verificação em lote concluída com alguns erros.');
                            this.carregarPedidos();
                        }
                    }
                });
            });
        }
    }

    gerarPdf(id: number): void {
        this.avisoPdf = true;
        this.pedidoService.gerarPdf(id).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Mantém o aviso aberto conforme solicitado pelo usuário
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

    abrirModalNotaFiscal(pedido: Pedido): void {
        this.pedidoParaNotaFiscal = pedido;
        this.arquivoSelecionado = null;
        this.numeroNotaFiscal = pedido.numeroNotaFiscal || '';
        this.notificarCliente = true; // Default checked
        this.exibirModalNotaFiscal = true;
    }

    fecharModalNotaFiscal(): void {
        this.exibirModalNotaFiscal = false;
        this.pedidoParaNotaFiscal = null;
        this.arquivoSelecionado = null;
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    private handleFile(file: File): void {
        if (file.type !== 'application/pdf') {
            alert('Por favor, selecione apenas arquivos PDF.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('O arquivo deve ter no máximo 10 MB.');
            return;
        }
        this.arquivoSelecionado = file;
    }

    salvarNotaFiscal(): void {
        if (!this.pedidoParaNotaFiscal || !this.numeroNotaFiscal) {
            alert('Por favor, informe o número da nota fiscal.');
            return;
        }

        if (!this.arquivoSelecionado && !this.pedidoParaNotaFiscal.notaFiscalPath) {
            alert('Por favor, selecione o arquivo da nota fiscal.');
            return;
        }

        this.uploadingNotaFiscal = true;
        
        // Se já tem nota e não selecionou arquivo novo, e quer apenas mudar o número (opcionalmente)
        // Por enquanto o backend exige o arquivo no uploadNotaFiscal.
        // Vou assumir que o usuário anexa sempre ou vou ajustar o TS se orçar.
        // O usuário pediu "Possibilitar alterar o número nota", vou garantir que passe o numeroNotaFiscal.
        
        this.pedidoService.uploadNotaFiscal(this.pedidoParaNotaFiscal.id, this.numeroNotaFiscal, this.arquivoSelecionado, this.notificarCliente).subscribe({
            next: () => {
                alert(this.notificarCliente ? 'Nota Fiscal anexada e e-mail enviado!' : 'Nota Fiscal anexada com sucesso!');
                this.carregarPedidos();
                this.fecharModalNotaFiscal();
                this.uploadingNotaFiscal = false;
            },
            error: (err) => {
                console.error('Erro ao fazer upload da nota fiscal', err);
                alert('Erro ao anexar Nota Fiscal. Verifique se o arquivo é um PDF válido.');
                this.uploadingNotaFiscal = false;
            }
        });
    }

    excluirNotaFiscal(): void {
        if (!this.pedidoParaNotaFiscal) return;

        if (confirm('Tem certeza que deseja excluir esta Nota Fiscal deste pedido?')) {
            this.uploadingNotaFiscal = true;
            this.pedidoService.excluirNotaFiscal(this.pedidoParaNotaFiscal.id).subscribe({
                next: () => {
                    alert('Nota Fiscal excluída com sucesso!');
                    this.carregarPedidos();
                    this.fecharModalNotaFiscal();
                    this.uploadingNotaFiscal = false;
                },
                error: (err) => {
                    console.error('Erro ao excluir nota fiscal', err);
                    alert('Erro ao excluir Nota Fiscal.');
                    this.uploadingNotaFiscal = false;
                }
            });
        }
    }

    reenviarEmailNotaFiscal(): void {
        if (!this.pedidoParaNotaFiscal) return;

        this.uploadingNotaFiscal = true;
        this.pedidoService.enviarEmailNotaFiscal(this.pedidoParaNotaFiscal.id).subscribe({
            next: () => {
                alert('E-mail de notificação reenviado com sucesso!');
                this.uploadingNotaFiscal = false;
            },
            error: (err) => {
                console.error('Erro ao reenviar e-mail', err);
                alert('Erro ao reenviar e-mail de notificação.');
                this.uploadingNotaFiscal = false;
            }
        });
    }

    visualizarNotaFiscal(pedido: Pedido): void {
        if (!pedido.notaFiscalPath) return;

        this.pedidoService.visualizarNotaFiscal(pedido.id).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (!win || win.closed || typeof win.closed === 'undefined') {
                alert('O navegador bloqueou a abertura da nota fiscal. Por favor, autorize pop-ups para este site.');
            }
        }, error => {
            console.error('Erro ao visualizar nota fiscal', error);
            alert('Erro ao carregar a nota fiscal para visualização.');
        });
    }
}
