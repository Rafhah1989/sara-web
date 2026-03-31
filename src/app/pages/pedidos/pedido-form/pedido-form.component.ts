import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { PedidoService, Pedido, PedidoProduto } from '../../../services/pedido.service';
import { UsuarioService } from '../../../services/usuario.service';
import { AuthService } from '../../../services/auth.service';
import { ProdutoService } from '../../../services/produto.service';
import { Usuario } from '../../../models/usuario.model';
import { Produto } from '../../../models/produto.model';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, filter, tap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { MetodoPagamentoAutorizado } from '../../../models/metodo-pagamento-autorizado.enum';
import { OpcaoParcelamentoService } from '../../../services/opcao-parcelamento.service';
import { OpcaoParcelamento } from '../../../models/opcao-parcelamento.model';

@Component({
    selector: 'app-pedido-form',
    templateUrl: './pedido-form.component.html',
    styleUrls: ['./pedido-form.component.css']
})
export class PedidoFormComponent implements OnInit {
    pedidoForm: FormGroup;
    modoEdicao: boolean = false;
    pedidoId?: number;

    usuariosFiltrados: Usuario[] = [];
    produtosFiltrados: Produto[] = [];

    termoBuscaProduto: string = '';
    showUsuariosDropdown: boolean = false;
    showProdutosDropdown: boolean = false;

    formasPagamento: any[] = [];
    formasPagamentoExibicao: any[] = [];
    situacoesPedido: any[] = [];
    descontoUsuarioAtual: number = 0;
    isAdmin: boolean = false;
    metodoPagamentoAutorizadoCliente?: MetodoPagamentoAutorizado;
    ativarDescontoAVista: boolean = false;

    exibirSucesso: boolean = false;
    exibirVisualizacaoImagem: boolean = false;
    imagemUrlVisualizacao: string = '';
    avisoPdf: boolean = false;
    pendenteRedirecionamento: boolean = false;
    notaFiscalPath?: string;
    descontoManual: boolean = false;
    isCarregandoPedido: boolean = false;
    // Parcelamento
    permitirParcelamento: boolean = false;
    opcoesParcelamentoAutorizadas: OpcaoParcelamento[] = [];
    opcaoParcelamentoSelecionada?: OpcaoParcelamento;
    quantidadeParcelas: number = 1;
    parcelasGeradas: { 
        id?: number, 
        dataVencimento: string, 
        valor: number, 
        valorFormatado?: string, 
        pago: boolean, 
        formaPagamentoId?: number,
        formaPagamentoDescricao?: string,
        pagamentoOnline?: boolean,
        pagamentoOnlineSalvo?: boolean,
        pixCopiaECola?: string,
        boletoPdfUrl?: string,
        boletoLinhaDigitavel?: string,
        boletoCodigoBarras?: string,
        mercadopagoPagamentoId?: string,
        dataExpiracao?: string
    }[] = [];

    // Modal Alternativo State
    exibirModalProdutosAlternativo: boolean = false;
    produtosModal: any[] = [];
    produtosModalFiltrados: any[] = [];
    filtroModalNome: string = '';
    filtroModalTamanho: string = '';
    filtroModalPrecoMin: string = '';
    filtroModalPrecoMax: string = '';
    produtosModalAgrupadosPorTamanho: { tamanho: string, produtos: any[] }[] = [];

    produtoService: ProdutoService;
    route: ActivatedRoute;
    router: Router;

    private freteConfig: any = null; // Store freight config

    constructor(
        private fb: FormBuilder,
        private pedidoService: PedidoService,
        private usuarioService: UsuarioService,
        private authService: AuthService,
        private opcaoParcelamentoService: OpcaoParcelamentoService,
        productService: ProdutoService,
        route: ActivatedRoute,
        router: Router
    ) {
        this.produtoService = productService;
        this.route = route;
        this.router = router;

        this.pedidoForm = this.fb.group({
            usuarioId: ['', Validators.required],
            usuarioNome: ['', Validators.required],
            formaPagamentoId: [null, Validators.required],
            desconto: [0],
            frete: ['R$ 0,00'],
            situacao: ['PENDENTE'],
            observacao: [''],
            valorTotal: [{ value: 0, disabled: true }],
            pagamentoOnline: [false],
            itens: this.fb.array([])
        });
    }

    getLabelMeioPagamentoOnline(): string {
        const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
        const forma = this.formasPagamento.find(f => f.id === formaId);
        if (forma && (forma.descricao?.toUpperCase().includes('BOLETO') || forma.nome?.toUpperCase().includes('BOLETO'))) {
            return 'Boleto Bancário';
        }
        return 'QR Code (PIX)';
    }

    ngOnInit(): void {
        const id = this.route.snapshot.params['id'];
        this.isAdmin = this.authService.getRoleDoToken() === 'ADMIN';

        if (id) {
            this.modoEdicao = true;
            this.pedidoId = id;
        }

        this.carregarFormasPagamento().subscribe(() => {
            if (id) {
                this.carregarPedido(id);
            }
        });
        this.carregarSituacoes();
        
        // Disable fields for CLIENTE globally
        if (!this.isAdmin) {
            this.pedidoForm.get('desconto')?.disable();
            this.pedidoForm.get('frete')?.disable();
            this.pedidoForm.get('situacao')?.disable();
            this.pedidoForm.get('usuarioNome')?.disable();

            if (this.modoEdicao) {
                this.pedidoForm.get('formaPagamentoId')?.disable();
                this.pedidoForm.get('pagamentoOnline')?.disable();
            } else {
                // Se é um NOVO pedido e é CLIENTE, já carrega os dados dele
                const userId = this.authService.getUsuarioIdDoToken();
                if (userId) {
                    this.usuarioService.buscarPorId(userId).subscribe(u => {
                        this.selecionarUsuario(u);
                    });
                }
            }
        }

        if (this.isAdmin) {
            this.setupBuscaUsuarios();
        }
    }

    get isPedidoBloqueadoParaUsuario(): boolean {
        if (this.isAdmin) return false;
        if (!this.modoEdicao) return false;
        return this.pedidoForm.get('situacao')?.value !== 'PENDENTE';
    }

    carregarSituacoes(): void {
        this.pedidoService.obterSituacoesPedido().subscribe(situacoes => {
            this.situacoesPedido = situacoes;
        });
    }

    carregarFormasPagamento(): Observable<any> {
        return this.pedidoService.obterFormasPagamento().pipe(
            tap(formas => {
                this.formasPagamento = (formas || []).map((f: any) => ({
                    ...f,
                    id: Number(f.id)
                }));
                this.formasPagamentoExibicao = this.formasPagamento;
                this.filtrarMetodosPagamentoAutorizados();
            })
        );
    }

    get itens() {
        return this.pedidoForm.get('itens') as FormArray;
    }

    setupBuscaUsuarios(): void {
        this.pedidoForm.get('usuarioNome')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(value => typeof value === 'string' && value.length >= 3),
            switchMap(value => this.usuarioService.buscarPorNome(value))
        ).subscribe(usuarios => {
            this.usuariosFiltrados = usuarios;
            this.showUsuariosDropdown = usuarios.length > 0;
        });
    }

    selecionarUsuario(usuario: Usuario): void {
        this.descontoUsuarioAtual = usuario.desconto || 0;
        
        this.pedidoForm.patchValue({
            usuarioId: usuario.id,
            usuarioNome: usuario.nome,
            desconto: this.calcularDescontoTotal(this.pedidoForm.get('formaPagamentoId')?.value)
        }, { emitEvent: false });
        this.metodoPagamentoAutorizadoCliente = usuario.metodoPagamentoAutorizado;
        this.permitirParcelamento = usuario.permitirParcelamento || false;
        this.ativarDescontoAVista = usuario.ativarDescontoAVista || false;
        this.opcoesParcelamentoAutorizadas = usuario.opcoesParcelamento || [];
        this.filtrarMetodosPagamentoAutorizados(); // Re-filter payment methods based on user
        this.verificarRegrasPagamentoOnline();
        this.descontoManual = false;
        this.atualizarOpcoesParcelamento();
        this.showUsuariosDropdown = false;

        // Fetch freight config regardless of mode (though in edit mode we might want to preserve existing? 
        // Logic says "No cadastro e edição... realizar as seguintes operações... a partir da tabela_frete relacionada ao cliente")
        // So we should fetch it.
        this.carregarConfiguracaoFrete(usuario.id!);
    }

    carregarConfiguracaoFrete(usuarioId: number): void {
        this.pedidoService.obterSugestaoFrete(usuarioId).subscribe(config => {
            this.freteConfig = config;
            if (!this.modoEdicao) {
                // Initial set for new order
                this.atualizarValorFrete();
            } else {
                // In edit mode, we just store config for future calculations when items change
                // But we should probably recalculate immediately based on current items to match user expectation?
                // Or preserve what was saved?
                // Usually "edit" starts with saved values.
                // But if items change, we recalculate.
                // Let's rely on calcularTotais trigger. But calculating totals requires config.
                // calculated totals is called after items change.
            }
        });
    }

    aoSelecionarFormaPagamento(id: number): void {
        const formaId = Number(id);
        if (this.isCarregandoPedido) return;

        if (!this.descontoManual) {
            const descT = this.calcularDescontoTotal(formaId);
            this.pedidoForm.get('desconto')?.setValue(descT, { emitEvent: false });
        }
        this.verificarRegrasPagamentoOnline();
        this.calcularTotais(this.modoEdicao, formaId); // Passa o ID novo explicitamente
        // Nota: calcularTotais já chama atualizarOpcoesParcelamento
    }

    onDescontoManualChange(): void {
        let currentVal = this.pedidoForm.get('desconto')?.value || 0;
        if (currentVal < 0) {
            currentVal = 0;
            this.pedidoForm.get('desconto')?.setValue(0, { emitEvent: false });
        }
        
        this.descontoManual = true;
        const formaId = Number(this.pedidoForm.get('formaPagamentoId')?.value);
        let maxForma = 0;
        
        if (formaId && Number(this.quantidadeParcelas) === 1 && this.ativarDescontoAVista) {
            const fp = this.formasPagamento.find(f => Number(f.id) === formaId);
            if (fp) maxForma = fp.desconto || 0;
        }
        this.descontoUsuarioAtual = currentVal - maxForma;
        this.calcularTotais(true, formaId);
    }

    atualizarOpcoesParcelamento(manterParcelasExistentes: boolean = false, formaIdForcado?: number): void {
      const formaIdRaw = formaIdForcado !== undefined ? formaIdForcado : this.pedidoForm.get('formaPagamentoId')?.value;
      const formaId = formaIdRaw ? Number(formaIdRaw) : null;

      // Se for para manter as parcelas, apenas atualizamos a forma de pagamento se o usuário explicitamente mudou a principal (formaIdForcado)
      // Bloqueamos qualquer alteração se estivermos apenas carregando o pedido do banco
      if (manterParcelasExistentes && this.parcelasGeradas.length > 0 && formaIdForcado !== undefined && !this.isCarregandoPedido) {
          this.parcelasGeradas.forEach(p => {
              if (!p.pago) {
                  p.formaPagamentoId = formaId ? Number(formaId) : undefined;
                  const fp = this.formasPagamento.find(f => Number(f.id) === Number(formaId));
                  p.formaPagamentoDescricao = fp ? (fp.descricao || fp.nome) : '';
                  
                  // Se trocou a forma principal, limpa metadados MP das parcelas pendentes
                  p.boletoPdfUrl = null;
                  p.pixCopiaECola = null;
                  p.mercadopagoPagamentoId = null;
              }
          });
      }

      if (!this.permitirParcelamento || !formaId) {
          this.opcaoParcelamentoSelecionada = undefined;
          this.quantidadeParcelas = 1;
          if (!manterParcelasExistentes && !this.isCarregandoPedido) {
              this.parcelasGeradas = [];
          }
          return;
      }

      const op = this.opcoesParcelamentoAutorizadas.find(o => Number(o.formaPagamentoId) === formaId);
      
      if (op) {
          this.opcaoParcelamentoSelecionada = op;
          
          // Preserva a quantidade de parcelas se ela ainda for válida no novo cenário de total
          const disponiveis = this.opcoesParcelasDisponiveis;
          const qtdAtual = Number(this.quantidadeParcelas);
          if (qtdAtual > 0 && !disponiveis.includes(qtdAtual)) {
              this.quantidadeParcelas = 1;
          }

          // Se não estiver carregando, e se (não for modo manter ou a contagem mudou), gera novas parcelas
          const qtdDesejada = Number(this.quantidadeParcelas);
          const contagemDiferente = qtdDesejada > 0 && qtdDesejada !== this.parcelasGeradas.length;
          
          // TRAVA DE SEGURANÇA: Se já temos parcelas com ID (salvas), nunca apagamos autonomamente 
          // a menos que a contagem tenha sofrido uma alteração REAL e INTENCIONAL (não apenas forçada pela regra)
          const temParcelasSalvas = this.parcelasGeradas.some(p => p.id);
          const deveIgnorarGeralPreview = temParcelasSalvas && manterParcelasExistentes && !contagemDiferente;

          if (!deveIgnorarGeralPreview && (!manterParcelasExistentes || this.parcelasGeradas.length === 0 || contagemDiferente) && !this.isCarregandoPedido) {
              console.log('>>> [SEGURANÇA] Gerando preview de parcelas...');
              this.gerarParcelasPreview();
          }
      } else {
          this.opcaoParcelamentoSelecionada = undefined;
          this.quantidadeParcelas = 0; // Se não tem regra, fica em Selecione
          if (!manterParcelasExistentes) {
              this.parcelasGeradas = [];
          }
      }
    }

    get opcoesParcelasDisponiveis(): number[] {
        if (!this.opcaoParcelamentoSelecionada) return [];
        const valorTotal = this.pedidoForm.get('valorTotal')?.value || 0;
        const result: number[] = [];
        
        // 1x sempre disponível
        result.push(1);

        for (let i = 2; i <= this.opcaoParcelamentoSelecionada.qtdMaxParcelas; i++) {
            const valorParcela = valorTotal / i;
            if (valorParcela >= (this.opcaoParcelamentoSelecionada.valorMinimoParcela || 0)) {
                result.push(i);
            }
        }
        return result;
    }

    getLabelParcela(n: number): string {
        const valor = this.getValorParcelaPreview(n);
        const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
        
        if (n === 1) {
            const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
            const fp = this.formasPagamento.find(f => Number(f.id) === Number(formaId));
            const descForma = (fp && this.ativarDescontoAVista) ? (fp.desconto || 0) : 0;
            const suffix = descForma > 0 ? ` (-${descForma}% à vista)` : '';
            return `À vista (1x) de ${valorFmt}${suffix}`;
        }

        if (!this.opcaoParcelamentoSelecionada) return `${n}x de ${valorFmt}`;

        const interval = this.opcaoParcelamentoSelecionada.diasVencimentoIntervalo;
        const dias: number[] = [];
        for (let i = 1; i <= n; i++) {
            dias.push(i * interval);
        }
        
        return `${n}x (${dias.join('/')}) de ${valorFmt}`;
    }

    onQuantidadeParcelasChange(): void {
        if (this.isCarregandoPedido) return;
        this.descontoManual = false;
        this.calcularTotais(this.modoEdicao);
    }

    gerarParcelasPreview(): void {
        if (Number(this.quantidadeParcelas) === 0) return; // Não faz nada se estiver em "SELECIONE"

        const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
        if (!this.opcaoParcelamentoSelecionada || !formaId) {
            this.parcelasGeradas = [];
            return;
        }

        const valorTotal = this.pedidoForm.get('valorTotal')?.value || 0;
        const valorPorParcela = parseFloat((valorTotal / this.quantidadeParcelas).toFixed(2));
        let saldo = valorTotal;
        this.parcelasGeradas = [];

        const dataBase = new Date();
        const diaBase = dataBase.getDate();
        // Se for parcelado (> 1x), o primeiro pagamento é após o intervalo (offset 1)
        // Se for à vista (1x), o pagamento é hoje (offset 0)
        const offset = Number(this.quantidadeParcelas) > 1 ? 1 : 0;

        for (let i = 0; i < this.quantidadeParcelas; i++) {
            let data = new Date(dataBase);
            
            if (this.opcaoParcelamentoSelecionada.diasVencimentoIntervalo === 30) {
                // Lógica de "mesmo dia" (Ex.: 22/04, 22/05, 22/06...)
                data.setMonth(dataBase.getMonth() + i + offset);
                
                // Trata meses com menos dias que o diaBase (ex: 31/03 -> 30/04)
                if (data.getDate() !== diaBase) {
                    data.setDate(0); // Último dia do mês anterior
                }
            } else {
                // Lógica padrão de dias corridos
                data.setDate(data.getDate() + ((i + offset) * this.opcaoParcelamentoSelecionada.diasVencimentoIntervalo));
            }
            
            let v = valorPorParcela;
            if (i === this.quantidadeParcelas - 1) {
                v = parseFloat(saldo.toFixed(2));
            }
            saldo -= v;

            this.parcelasGeradas.push({
                dataVencimento: data.toISOString().split('T')[0],
                valor: v,
                valorFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
                pago: false,
                formaPagamentoId: Number(formaId),
                formaPagamentoDescricao: this.formasPagamento.find(f => Number(f.id) === Number(formaId))?.descricao,
                pagamentoOnline: this.pedidoForm.get('pagamentoOnline')?.value || false
            });
        }
    }

    filtrarMetodosPagamentoAutorizados(): void {
        if (this.isAdmin || !this.metodoPagamentoAutorizadoCliente) {
            this.formasPagamentoExibicao = this.formasPagamento;
            return;
        }
        // ... por enquanto mantemos a lista completa no HTML para evitar sumiço inesperado
        this.formasPagamentoExibicao = this.formasPagamento;
    }

    verificarRegrasPagamentoOnline(): void {
        const formaPagamentoId = Number(this.pedidoForm.get('formaPagamentoId')?.value);
        const forma = this.formasPagamento.find(f => Number(f.id) === formaPagamentoId);
        const isOnlineMetodo = forma && (
            (forma.descricao && (forma.descricao.toUpperCase().includes('PIX') || forma.descricao.toUpperCase().includes('BOLETO'))) || 
            (forma.nome && (forma.nome.toUpperCase().includes('PIX') || forma.nome.toUpperCase().includes('BOLETO')))
        );

        if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.APENAS_ONLINE) {
            this.pedidoForm.get('pagamentoOnline')?.setValue(true);
        } else if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE) {
            if (!isOnlineMetodo) {
                this.pedidoForm.get('pagamentoOnline')?.setValue(false);
            }
        } else {
            // Para administradores ou outros, permitimos manter online se for um método suportado (PIX ou Boleto)
            if (!this.isAdmin || !isOnlineMetodo) {
                this.pedidoForm.get('pagamentoOnline')?.setValue(false);
            }
        }
        
        // Sincroniza com as parcelas já geradas
        this.onPagamentoOnlineChange();
    }

    onPagamentoOnlineChange(): void {
        const val = this.pedidoForm.get('pagamentoOnline')?.value;
        if (this.parcelasGeradas) {
            this.parcelasGeradas.forEach(p => p.pagamentoOnline = val);
        }
    }

    deveMostrarCampoPagamentoOnline(): boolean {
        const formaPagamentoId = this.pedidoForm.get('formaPagamentoId')?.value;
        const forma = this.formasPagamento.find(f => f.id == formaPagamentoId);
        const isOnlineMetodo = forma && (
            (forma.descricao && (forma.descricao.toUpperCase().includes('PIX') || forma.descricao.toUpperCase().includes('BOLETO'))) || 
            (forma.nome && (forma.nome.toUpperCase().includes('PIX') || forma.nome.toUpperCase().includes('BOLETO')))
        );

        // O campo de toggle só deve aparecer se o cliente tiver a opção de escolher (ENTREGA_E_ONLINE)
        // Se for APENAS_ONLINE, o pagamento é obrigatoriamente online e o checkbox é ocultado (valor é setado via verificarRegrasPagamentoOnline)
        return !!isOnlineMetodo && (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE || this.isAdmin);
    }


    getDescricaoPagamentoOnline(): string {
        const label = this.getLabelMeioPagamentoOnline();
        if (label === 'Boleto Bancário') {
            return 'A linha digitável e o PDF do boleto serão gerados';
        }
        return 'O QR Code para pagamento será gerado';
    }

    getValorParcelaPreview(n: number): number {
        const items = this.itens.getRawValue();
        const subtotal = items.reduce((acc: number, it: any) => acc + (this.parseMoeda(it.valor) * it.quantidade), 0);
        const frete = this.parseMoeda(this.pedidoForm.get('frete')?.value);
        
        const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
        const totalDescPerc = this.calcularDescontoTotal(formaId, n);
        
        const valorComDesconto = subtotal * (1 - (totalDescPerc / 100));
        return (valorComDesconto + frete) / n;
    }

    calcularDescontoTotal(formaPagamentoId?: number, n?: number): number {
        const qtdParcelas = n !== undefined ? n : (Number(this.quantidadeParcelas) || this.parcelasGeradas.length || 1);
        let maxForma = 0;
        
        // O desconto da forma de pagamento só é aplicado se for À Vista (1 parcela) E se o usuário tiver o desconto ativo
        if (formaPagamentoId && qtdParcelas === 1 && this.ativarDescontoAVista) {
            const fp = this.formasPagamento.find(f => Number(f.id) === Number(formaPagamentoId));
            if (fp) maxForma = fp.desconto || 0;
        }

        // Se o desconto é manual, a base ja foi ajustada em onDescontoManualChange
        // Se não é manual, usamos o desconto padrão do usuário atual (carregado do cadastro)
        return (this.descontoUsuarioAtual || 0) + maxForma;
    }

    // --- Início Modal Alternativo ---
    abrirModalProdutosAlternativo(): void {
        this.exibirModalProdutosAlternativo = true;
        this.filtroModalNome = '';
        this.filtroModalTamanho = '';
        this.filtroModalPrecoMin = '';
        this.filtroModalPrecoMax = '';
        
        // Se já carregou antes, não precisa baixar tudo de novo (Cache)
        if (this.produtosModal && this.produtosModal.length > 0) {
            this.filtrarProdutosModal();
            return;
        }

        this.produtoService.listarAtivos().subscribe(produtos => {
            this.produtosModal = produtos.map(p => ({
                ...p,
                quantidadeSelecionada: 0
            }));
            this.filtrarProdutosModal();
        });
    }

    fecharModalProdutosAlternativo(): void {
        this.exibirModalProdutosAlternativo = false;
    }

    limparFiltrosModal(): void {
        this.filtroModalNome = '';
        this.filtroModalTamanho = '';
        this.filtroModalPrecoMin = '';
        this.filtroModalPrecoMax = '';
        this.filtrarProdutosModal();
    }

    filtrarProdutosModal(): void {
        const termo = this.filtroModalNome?.toLowerCase() || '';
        
        const filtrados = this.produtosModal.filter(p => {
            let matchNome = true;
            let matchTamanho = true;
            let matchPreco = true;

            if (termo && termo.length >= 3) {
                matchNome = p.nome.toLowerCase().includes(termo) || (p.codigo?.toLowerCase().includes(termo) || false);
            }
            if (this.filtroModalTamanho && this.filtroModalTamanho.trim() !== '') {
                matchTamanho = p.tamanho != null && p.tamanho.toString().toLowerCase() === this.filtroModalTamanho.toLowerCase();
            }

            if (this.filtroModalPrecoMin) {
                let clearMin = this.filtroModalPrecoMin.toString().replace(/[^\d,]/g, '').replace(',', '.');
                let parsedMin = parseFloat(clearMin);
                if (!isNaN(parsedMin) && parsedMin > 0) {
                    matchPreco = p.preco !== undefined && p.preco !== null && p.preco >= parsedMin;
                }
            }
            
            if (this.filtroModalPrecoMax && matchPreco) {
                let clearMax = this.filtroModalPrecoMax.toString().replace(/[^\d,]/g, '').replace(',', '.');
                let parsedMax = parseFloat(clearMax);
                if (!isNaN(parsedMax) && parsedMax > 0) {
                    matchPreco = p.preco !== undefined && p.preco !== null && p.preco <= parsedMax;
                }
            }

            return matchNome && matchTamanho && matchPreco;
        });

        // Ordenação por prioridade: Prefixo > Sufixo > Nome
        this.produtosModalFiltrados = filtrados.sort((a, b) => {
            if (termo && termo.length >= 3) {
                const aCodigo = a.codigo?.toLowerCase() || '';
                const bCodigo = b.codigo?.toLowerCase() || '';
                
                const aPrefix = aCodigo.startsWith(termo);
                const bPrefix = bCodigo.startsWith(termo);
                if (aPrefix && !bPrefix) return -1;
                if (!aPrefix && bPrefix) return 1;

                const aSuffix = aCodigo.endsWith(termo);
                const bSuffix = bCodigo.endsWith(termo);
                if (aSuffix && !bSuffix) return -1;
                if (!aSuffix && bSuffix) return 1;
            }
            return a.nome.localeCompare(b.nome);
        });

        this.atualizarAgrupamentoTamanhos();
    }

    atualizarAgrupamentoTamanhos(): void {
        const grupos = new Map<string, any[]>();
        this.produtosModalFiltrados.forEach(p => {
            const tamanho = p.tamanho != null ? p.tamanho.toString() : 'Sem Tamanho';
            if (!grupos.has(tamanho)) {
                grupos.set(tamanho, []);
            }
            grupos.get(tamanho)?.push(p);
        });

        this.produtosModalAgrupadosPorTamanho = Array.from(grupos.entries()).map(([tamanho, produtos]) => ({
            tamanho,
            produtos
        })).sort((a, b) => {
            if (a.tamanho === 'Sem Tamanho') return 1;
            if (b.tamanho === 'Sem Tamanho') return -1;
            return a.tamanho.localeCompare(b.tamanho, undefined, { numeric: true });
        });
    }

    applyFiltroMoedaMaskMin(event: any): void {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        if (value === '') {
            this.filtroModalPrecoMin = '';
            this.filtrarProdutosModal();
            return;
        }
        value = (Number(value) / 100).toFixed(2);
        this.filtroModalPrecoMin = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
        this.filtrarProdutosModal();
    }

    applyFiltroMoedaMaskMax(event: any): void {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        if (value === '') {
            this.filtroModalPrecoMax = '';
            this.filtrarProdutosModal();
            return;
        }
        value = (Number(value) / 100).toFixed(2);
        this.filtroModalPrecoMax = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
        this.filtrarProdutosModal();
    }

    get totalModalAlternativo(): number {
        return this.produtosModalFiltrados.reduce((acc, p) => acc + ((p.quantidadeSelecionada || 0) * (p.preco || 0)), 0);
    }

    get totalModalAlternativoQtd(): number {
        return this.produtosModalFiltrados.reduce((acc, p) => acc + (Number(p.quantidadeSelecionada) || 0), 0);
    }

    calcularQtdGrupo(grupo: any): number {
        return grupo.produtos.reduce((acc: number, p: any) => acc + (Number(p.quantidadeSelecionada) || 0), 0);
    }

    calcularTotalGrupo(grupo: any): number {
        return grupo.produtos.reduce((acc: number, p: any) => acc + ((Number(p.quantidadeSelecionada) || 0) * (p.preco || 0)), 0);
    }

    adicionarProdutosModal(): void {
        const produtosSelecionados = this.produtosModalFiltrados.filter(p => p.quantidadeSelecionada > 0);
        
        produtosSelecionados.forEach(p => {
            const itemExistente = this.itens.controls.find(c => c.get('produtoId')?.value === p.id);
            if (itemExistente) {
                const qtd = itemExistente.get('quantidade')?.value || 0;
                itemExistente.patchValue({ quantidade: qtd + p.quantidadeSelecionada });
            } else {
                const valorInicialFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco || 0);
                const itemForm = this.fb.group({
                    produtoId: [p.id],
                    produtoNome: [p.nome],
                    produtoCodigo: [p.codigo],
                    tamanho: [p.tamanho],
                    quantidade: [{ value: p.quantidadeSelecionada, disabled: this.pedidoForm.get('situacao')?.value !== 'PENDENTE' && !this.isAdmin }, [Validators.required, Validators.min(0.01)]],
                    valor: [{ value: valorInicialFormatado, disabled: !this.isAdmin }, Validators.required],
                    total: [{ value: 0, disabled: true }],
                    imagem: [p.imagem],
                    temImagem: [p.temImagem],
                    peso: [p.peso || 0]
                });
                
                const index = this.findInsertionIndex(p.nome, p.tamanho, p.preco || 0);
                this.itens.insert(index, itemForm);
            }
            
            p.quantidadeSelecionada = 0;
        });

        this.atualizarValorFrete();
        this.fecharModalProdutosAlternativo();
    }
    // --- Fim Modal Alternativo ---

    buscarProduto(): void {
        if (this.termoBuscaProduto.length >= 3) {
            this.produtoService.buscarPorNome(this.termoBuscaProduto).subscribe(produtos => {
                this.produtosFiltrados = produtos.filter(p => p.ativo);
                this.showProdutosDropdown = this.produtosFiltrados.length > 0;
            });
        }
    }

    adicionarProduto(produto: Produto): void {
        const itemExistente = this.itens.controls.find(c => c.get('produtoId')?.value === produto.id);
        if (itemExistente) {
            const qtd = itemExistente.get('quantidade')?.value;
            itemExistente.patchValue({ quantidade: qtd + 1 });
        } else {
            const valorInicial = produto.preco || 0;
            const valorInicialFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorInicial);

            const itemForm = this.fb.group({
                produtoId: [produto.id],
                produtoNome: [produto.nome],
                produtoCodigo: [produto.codigo],
                tamanho: [produto.tamanho],
                quantidade: [{ value: 1, disabled: this.pedidoForm.get('situacao')?.value !== 'PENDENTE' }, [Validators.required, Validators.min(0.01)]],
                valor: [{ value: valorInicialFormatado, disabled: !this.isAdmin }, Validators.required],
                total: [{ value: 0, disabled: true }],
                imagem: [produto.imagem],
                peso: [produto.peso || 0]
            });
            
            const index = this.findInsertionIndex(produto.nome, produto.tamanho, valorInicial);
            this.itens.insert(index, itemForm);
        }

        this.showProdutosDropdown = false;
        this.termoBuscaProduto = '';
        this.atualizarValorFrete();
    }

    private findInsertionIndex(nome: string, tamanho: number | undefined, valor: number): number {
        const controls = this.itens.controls;
        for (let i = 0; i < controls.length; i++) {
            const item = controls[i].value;
            const itemNome = item.produtoNome.toLowerCase();
            const itemTamanho = item.tamanho || 0;
            const itemValor = this.parseMoeda(item.valor);

            if (nome.toLowerCase() < itemNome) return i;
            if (nome.toLowerCase() === itemNome) {
                if ((tamanho || 0) < itemTamanho) return i;
                if ((tamanho || 0) === itemTamanho) {
                    if (valor < itemValor) return i;
                }
            }
        }
        return controls.length;
    }

    removerItem(index: number): void {
        this.itens.removeAt(index);
        this.atualizarValorFrete();
    }

    incrementarQtd(index: number): void {
        const item = this.itens.at(index);
        const qtd = Number(item.get('quantidade')?.value) || 0;
        item.get('quantidade')?.setValue(qtd + 1);
        this.onItemChange();
    }

    decrementarQtd(index: number): void {
        const item = this.itens.at(index);
        const qtd = Number(item.get('quantidade')?.value) || 0;
        if (qtd > 1) {
            item.get('quantidade')?.setValue(qtd - 1);
            this.onItemChange();
        }
    }

    applyMoedaMask(event: any, controlIndex: number): void {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');

        // Remove leading zeros
        value = (Number(value) / 100).toFixed(2);

        // Format to BRL currency
        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Number(value));

        this.itens.at(controlIndex).get('valor')?.setValue(formatted, { emitEvent: false });

        this.calcularTotais();
    }

    applyFreteMask(event: any): void {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        value = (Number(value) / 100).toFixed(2);
        const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
        this.pedidoForm.patchValue({ frete: formatted }, { emitEvent: false });
        this.calcularTotais();
    }

    parseMoeda(valor: any): number {
        if (typeof valor === 'number') return valor;
        if (!valor) return 0;
        // Remove 'R$', dots, replace comma with dot
        const clean = valor.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    }

    onItemChange(): void {
        this.atualizarValorFrete();
    }

    atualizarValorFrete(): void {
        if (!this.freteConfig) {
            this.calcularTotais();
            return;
        }

        let pesoTotal = 0;
        this.itens.controls.forEach(control => {
            const qtd = Number(control.get('quantidade')?.value) || 0;
            // We need to access the product weight. 
            // The item form should store it.
            const peso = Number(control.get('peso')?.value) || 0;
            pesoTotal += (peso * qtd);
        });

        let freteCalculado = this.freteConfig.valor || 0;

        if (this.freteConfig.quantidadeFaixa && this.freteConfig.valorFaixa) {
            let pesoParaCalculo = pesoTotal;

            // Check for minimum threshold
            if (this.freteConfig.minimoFaixa && pesoTotal > this.freteConfig.minimoFaixa) {
                pesoParaCalculo = pesoTotal - this.freteConfig.minimoFaixa;
                // quantidadeFaixa here is actually "Peso por Faixa" now
                // Using Math.ceil to ensure any excess >= 1g counts as a full range unit.
                // Ex: 1g / 1000 = 0.001 -> Ceil = 1.
                // Ex: 1000g / 1000 = 1 -> Ceil = 1.
                // Ex: 1001g / 1000 = 1.001 -> Ceil = 2.
                const faixas = Math.ceil(pesoParaCalculo / this.freteConfig.quantidadeFaixa);

                freteCalculado += (faixas * this.freteConfig.valorFaixa);
            } else if (!this.freteConfig.minimoFaixa) {
                // If no minimum set, calculate on total weight directly (old logic)
                const faixas = Math.ceil(pesoParaCalculo / this.freteConfig.quantidadeFaixa);
                freteCalculado += (faixas * this.freteConfig.valorFaixa);
            }
        }

        const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteCalculado);
        this.pedidoForm.patchValue({ frete: formatted }, { emitEvent: false });

        this.calcularTotais();
    }

    calcularTotais(manterParcelasExistentes: boolean = false, formaIdForcado?: number): void {
        // Then calculate totals
        let subtotal = 0;
        const items = this.itens.getRawValue();
        items.forEach((item: any, index: number) => {
            const qtd = item.quantidade || 0;
            const valor = this.parseMoeda(item.valor);
            const totalItem = qtd * valor;
            this.itens.at(index).get('total')?.setValue(totalItem, { emitEvent: false });
            subtotal += totalItem;
        });

        // Determina o desconto CORRETO baseado no plano atual (À vista vs Parcelado)
        const formaId = formaIdForcado !== undefined ? formaIdForcado : this.pedidoForm.get('formaPagamentoId')?.value;
        const totalDescPerc = this.calcularDescontoTotal(formaId);
        
        // Atualiza o input de desconto visualmente para incluir o bônus de à vista
        this.pedidoForm.get('desconto')?.setValue(totalDescPerc, { emitEvent: false });

        const freteRaw = this.pedidoForm.get('frete')?.value;
        const frete = this.parseMoeda(freteRaw);

        const valorDesconto = subtotal * (totalDescPerc / 100);
        const totalGeral = (subtotal - valorDesconto) + frete;
        this.pedidoForm.get('valorTotal')?.setValue(totalGeral, { emitEvent: false });

        // Auto-deseleciona se a forma escolhida se tornar inválida devido a mudanças no total
        if (formaId) {
            const fp = this.formasPagamento.find(f => Number(f.id) === Number(formaId));
            if (fp && !this.isFormaPagamentoDisponivel(fp)) {
                this.pedidoForm.get('formaPagamentoId')?.setValue(null, { emitEvent: false });
                this.aoSelecionarFormaPagamento(null);
            }
        }
        this.atualizarOpcoesParcelamento(manterParcelasExistentes, formaId);

        // Só redistribui autonomamente se NÃO estivermos no modo de "manter parcelas" (ex.: carregamento ou edição manual)
        if (this.parcelasGeradas.length > 0 && !manterParcelasExistentes) {
            this.redistribuirTotalNasParcelas();
        }
    }

    private redistribuirTotalNasParcelas(): void {
        if (this.parcelasGeradas.length === 0) return;
        
        const valorTotal = this.pedidoForm.get('valorTotal')?.value || 0;
        const qtdParcelas = this.parcelasGeradas.length;
        const valorPorParcela = parseFloat((valorTotal / qtdParcelas).toFixed(2));
        let saldo = valorTotal;

        for (let i = 0; i < qtdParcelas; i++) {
            let v = valorPorParcela;
            if (i === qtdParcelas - 1) {
                v = parseFloat(saldo.toFixed(2));
            }
            this.parcelasGeradas[i].valor = v;
            this.parcelasGeradas[i].valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
            saldo -= v;
        }
    }

    isFormaPagamentoDisponivel(forma: any): boolean {
        // Admins podem tudo, inclusive ignorar o mínimo configurado se necessário na edição
        if (this.isAdmin) return true;

        const valorTotal = this.pedidoForm.get('valorTotal')?.value || 0;
        const minVista = forma.valorMinimo || 0;
        
        const op = this.opcoesParcelamentoAutorizadas.find(o => o.formaPagamentoId == forma.id);
        const minParcelado = op ? (op.valorMinimoParcela * 2) : Infinity;

        const menorMinimo = Math.min(minVista, minParcelado);
        return valorTotal >= menorMinimo;
    }

    getMensagemMinimo(forma: any): string {
        const valorTotal = this.pedidoForm.get('valorTotal')?.value || 0;
        const minVista = forma.valorMinimo || 0;
        
        const op = this.opcoesParcelamentoAutorizadas.find(o => o.formaPagamentoId == forma.id);
        const minParcelado = op ? (op.valorMinimoParcela * 2) : Infinity;

        const menorMinimo = Math.min(minVista, minParcelado);

        if (valorTotal < menorMinimo) {
            const falta = menorMinimo - valorTotal;
            const faltaFmt = falta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            return `Faltam ${faltaFmt} para o mínimo`;
}
        return '';
    }

    carregarPedido(id: number): void {
        this.isCarregandoPedido = true;
        this.pedidoService.buscarPorId(id).subscribe({
            next: (pedido) => {
                const freteFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.frete || 0);

                this.pedidoForm.patchValue({
                    usuarioId: pedido.usuarioId,
                    usuarioNome: pedido.usuarioNome,
                    formaPagamentoId: pedido.formaPagamentoId ? Number(pedido.formaPagamentoId) : null,
                    desconto: pedido.desconto,
                    frete: freteFormatted,
                    situacao: pedido.situacao,
                    observacao: pedido.observacao,
                    pagamentoOnline: pedido.pagamentoOnline
                }, { emitEvent: true });

                if (!this.isAdmin) {
                    this.pedidoForm.get('formaPagamentoId')?.disable();
                }

                this.notaFiscalPath = pedido.notaFiscalPath;
                this.carregarConfiguracaoFrete(pedido.usuarioId);

                // 1. Carregar parcelas PRIMEIRO para garantir que isCarregandoPedido as proteja
                if (pedido.pagamentos && pedido.pagamentos.length > 0) {
                    this.parcelasGeradas = pedido.pagamentos.map(p => {
                        const formaId = Number(p.formaPagamentoId);
                        const formaMestre = this.formasPagamento.find(f => Number(f.id) === formaId);
                        return {
                            id: p.id,
                            dataVencimento: p.dataVencimento.toString(),
                            valor: p.valor,
                            valorFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor),
                            pago: p.pago,
                            formaPagamentoId: formaId,
                            formaPagamentoDescricao: formaMestre ? (formaMestre.descricao || formaMestre.nome) : p.formaPagamentoDescricao,
                            pagamentoOnline: p.pagamentoOnline,
                            pagamentoOnlineSalvo: p.pagamentoOnline,
                            pixCopiaECola: p.pixCopiaECola,
                            boletoPdfUrl: p.boletoPdfUrl,
                            boletoLinhaDigitavel: p.boletoLinhaDigitavel,
                            boletoCodigoBarras: p.boletoCodigoBarras,
                            mercadopagoPagamentoId: p.mercadopagoPagamentoId,
                            dataExpiracao: p.dataExpiracao?.toString()
                        };
                    });
                    this.quantidadeParcelas = 0;
                }

                // 2. Carregar produtos
                this.itens.clear();
                pedido.produtos.sort((a, b) => {
                    const nomeA = (a.produtoNome || '').toLowerCase();
                    const nomeB = (b.produtoNome || '').toLowerCase();
                    if (nomeA < nomeB) return -1;
                    if (nomeA > nomeB) return 1;
                    return a.valor - b.valor;
                }).forEach(p => {
                    const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor);
                    const itemForm = this.fb.group({
                        id: [p.id],
                        produtoId: [p.produtoId],
                        produtoNome: [p.produtoNome],
                        produtoCodigo: [p.produtoCodigo],
                        tamanho: [p.tamanho],
                        quantidade: [{ value: p.quantidade, disabled: pedido.situacao !== 'PENDENTE' }, Validators.required],
                        valor: [{ value: valorFormatted, disabled: !this.isAdmin }, Validators.required],
                        total: [{ value: p.quantidade * p.valor, disabled: true }],
                        imagem: [p.imagem],
                        peso: [p.peso || 0]
                    });
                    this.itens.push(itemForm);
                });

                // 3. Carregar dados do usuário e disparar recálculo final
                this.usuarioService.buscarPorId(pedido.usuarioId).subscribe({
                    next: (user) => {
                        this.metodoPagamentoAutorizadoCliente = user.metodoPagamentoAutorizado;
                        this.permitirParcelamento = user.permitirParcelamento || false;
                        this.ativarDescontoAVista = user.ativarDescontoAVista || false;
                        this.opcoesParcelamentoAutorizadas = user.opcoesParcelamento || [];

                        const formaIdReg = pedido.formaPagamentoId;
                        let descontoFormaExtraido = 0;
                        if (formaIdReg && pedido.pagamentos && pedido.pagamentos.length === 1 && this.ativarDescontoAVista) {
                            const fp = this.formasPagamento.find(f => f.id == formaIdReg);
                            if (fp) descontoFormaExtraido = fp.desconto || 0;
                        }
                        this.descontoUsuarioAtual = (pedido.desconto || 0) - descontoFormaExtraido;

                        this.filtrarMetodosPagamentoAutorizados();
                        this.calcularTotais(true);
                        
                        setTimeout(() => this.isCarregandoPedido = false, 500);
                    },
                    error: () => this.isCarregandoPedido = false
                });
            },
            error: (err) => {
                console.error('Erro ao carregar pedido', err);
                this.isCarregandoPedido = false;
            }
        });
    }

    salvar(notificar: boolean = false): void {
        if (this.pedidoForm.invalid || this.itens.length === 0) {
            alert('Preencha todos os campos obrigatórios e adicione ao menos um produto.');
            return;
        }

        const formValue = this.pedidoForm.getRawValue();
        const pedidoData: any = {
            usuarioId: formValue.usuarioId,
            formaPagamentoId: formValue.formaPagamentoId,
            desconto: formValue.desconto,
            frete: this.parseMoeda(formValue.frete),
            situacao: this.pedidoForm.get('situacao')?.value || 'PENDENTE',
            valorTotal: formValue.valorTotal,
            observacao: formValue.observacao,
            pagamentoOnline: formValue.pagamentoOnline || false,
            notificar: notificar,
            produtos: formValue.itens.map((it: any) => ({
                produtoId: it.produtoId,
                valor: this.parseMoeda(it.valor), // Clean currency string
                quantidade: it.quantidade,
                desconto: 0,
                peso: 0
            })),
            pagamentos: this.parcelasGeradas.length > 0 ? this.parcelasGeradas.map(p => ({
                id: p.id ? Number(p.id) : null,
                dataVencimento: p.dataVencimento,
                valor: p.valor,
                pago: Boolean(p.pago),
                formaPagamentoId: Number(p.formaPagamentoId || formValue.formaPagamentoId),
                pagamentoOnline: Boolean(p.pagamentoOnline)
            })) : [
                { 
                    dataVencimento: new Date().toISOString().split('T')[0], 
                    valor: formValue.valorTotal, 
                    pago: false, 
                    formaPagamentoId: formValue.formaPagamentoId,
                    pagamentoOnline: formValue.pagamentoOnline || false
                }
            ]
        };

        if (!formValue.formaPagamentoId) {
            alert('Por favor, selecione uma forma de pagamento antes de salvar.');
            return;
        }

        if (this.isPedidoBloqueadoParaUsuario) {
            alert('Este pedido não pode ser alterado pois não está na situação PENDENTE.');
            return;
        }

        if (this.modoEdicao) {
            this.pedidoService.alterar(this.pedidoId!, pedidoData).subscribe({
                next: () => {
                    alert('Pedido alterado com sucesso!');
                    this.voltar();
                },
                error: (err) => {
                    console.error('Erro ao alterar pedido', err);
                    alert('Erro ao salvar as alterações do pedido. Verifique os dados e tente novamente.');
                }
            });
        } else {
            this.pedidoService.salvar(pedidoData).subscribe({
                next: (salvo) => {
                    this.pedidoId = salvo.id;
                    if (pedidoData.pagamentoOnline) {
                        const proximo = salvo.pagamentos?.find((p: any) => p.pagamentoOnline && !p.pago);
                        this.router.navigate(['/pedidos/pix', salvo.id], { 
                            queryParams: proximo ? { pagamentoId: proximo.id } : {} 
                        });
                    } else {
                        // Se não for online ou se for Boleto, volta para a lista passando o ID para mostrar o modal de sucesso (com opção de PDF)
                        this.router.navigate(['/pedidos'], { state: { novoPedidoCriadoId: salvo.id } });
                    }
                },
                error: (err) => {
                    console.error('Erro ao salvar novo pedido', err);
                    alert('Erro ao criar o novo pedido. Verifique se todos os campos obrigatórios esto preenchidos.');
                }
            });
        }
    }

    voltar(): void {
        this.router.navigate(['/pedidos']);
    }

    toggleParcelaPago(p: any): void {
        if (!this.isAdmin && this.isPedidoBloqueadoParaUsuario) return;
        p.pago = !p.pago;
    }

    adicionarPagamentoManual(): void {
        const hoje = new Date().toISOString().split('T')[0];
        const valorRestante = this.calcularValorRestantePagamentos();
        
        const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
        this.parcelasGeradas.push({
            dataVencimento: hoje,
            valor: valorRestante > 0 ? valorRestante : 0,
            valorFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorRestante > 0 ? valorRestante : 0),
            pago: false,
            formaPagamentoId: formaId,
            formaPagamentoDescricao: this.formasPagamento.find(f => f.id == formaId)?.descricao,
            pagamentoOnline: this.pedidoForm.get('pagamentoOnline')?.value || false
        });
        this.descontoManual = false;
        this.quantidadeParcelas = this.parcelasGeradas.length;
    }

    removerPagamentoManual(index: number): void {
        if (confirm('Deseja remover este pagamento?')) {
            this.parcelasGeradas.splice(index, 1);
            this.quantidadeParcelas = this.parcelasGeradas.length;
        }
    }

    private calcularValorRestantePagamentos(): number {
        const totalPedido = this.pedidoForm.get('valorTotal')?.value || 0;
        const totalJaAlocado = this.parcelasGeradas.reduce((acc, p) => acc + (p.valor || 0), 0);
        return Math.max(0, totalPedido - totalJaAlocado);
    }

    applyParcelaMoedaMask(event: any, index: number): void {
        let value = event.target.value;
        value = value.replace(/\D/g, '');
        if (value === '') value = '0';
        const valorNumerico = Number(value) / 100;
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNumerico);
        
        event.target.value = valorFormatado;
        this.parcelasGeradas[index].valorFormatado = valorFormatado;
        this.parcelasGeradas[index].valor = valorNumerico;
    }

    fecharAvisoPdf(): void {
        this.avisoPdf = false;
        if (this.pendenteRedirecionamento) {
            this.pendenteRedirecionamento = false;
            this.posGeracaoSucesso();
        }
    }

    confirmarPdf(sim: boolean): void {
        this.exibirSucesso = false;
        if (sim && this.pedidoId) {
            this.avisoPdf = true;
            this.pendenteRedirecionamento = true;
            this.pedidoService.gerarPdf(this.pedidoId).subscribe({
                next: (blob) => {
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    // Mantém o aviso aberto e aguarda o fechamento manual para redirecionar
                },
                error: (err) => {
                    console.error('Erro ao gerar PDF', err);
                    alert('Erro ao gerar PDF. Tente novamente.');
                    this.avisoPdf = false;
                    this.pendenteRedirecionamento = false;
                    this.posGeracaoSucesso();
                }
            });
        } else {
            this.posGeracaoSucesso();
        }
    }

    private posGeracaoSucesso(): void {
        const proximo = this.parcelasGeradas.find(p => !p.pago && p.pagamentoOnline);
        if (proximo && this.pedidoId) {
            this.router.navigate(['/pedidos/pix', this.pedidoId], { queryParams: { pagamentoId: proximo.id } });
        } else {
            this.voltar();
        }
    }

    togglePagamentoOnlineParcela(p: any): void {
        if (!this.isAdmin) return;
        p.pagamentoOnline = !p.pagamentoOnline;
    }

    verificarPagamentoManualParcela(p: any): void {
        if (!this.isAdmin || !p.id) return;
        
        this.pedidoService.verificarPagamentoManual(p.id).subscribe({
            next: (res) => {
                alert(`Status da parcela: ${res.status || 'OK'}`);
                this.carregarPedido(this.pedidoId!);
            },
            error: (err) => {
                console.error('Erro ao verificar parcela', err);
                alert('Erro ao verificar status no Mercado Pago.');
            }
        });
    }

    podeExibirPagamentoOnline(p: any, index: number): boolean {
        // Regra 1: Deve ser um pagamento salvo, online, pendente
        if (!p.id || !p.pagamentoOnline || !p.pagamentoOnlineSalvo || p.pago) return false;
        
        // Regra 2: Só exibe se todas as parcelas Online ANTERIORES já estiverem pagas
        // EXCEÇÃO: Se for Boleto, permite visualizar qualquer uma (conforme pedido do usuário)
        if (this.isBoleto(p)) {
            return true;
        }

        for (let j = 0; j < index; j++) {
            const anterior = this.parcelasGeradas[j];
            if (anterior.pagamentoOnline && anterior.pagamentoOnlineSalvo && !anterior.pago) {
                return false;
            }
        }
        return true;
    }

    visualizarPagamentoOnlineParcela(p: any): void {
        if (!p.id || !this.pedidoId) return;
        this.router.navigate(['/pedidos/pix', this.pedidoId], { queryParams: { pagamentoId: p.id } });
    }

    podeExibirSincronizacao(p: any): boolean {
        // Só habilita se o pagamento já estiver salvo e for online pendente (PIX ou BOLETO)
        return !!p.id && !!p.pagamentoOnline && !!p.pagamentoOnlineSalvo && !p.pago && (this.isPix(p) || this.isBoleto(p));
    }

    podeExibirNotificacaoPagamento(p: any): boolean {
        // Regra: Admin, online já salvo, pendente, com ID e de forma PIX ou BOLETO
        return this.isAdmin && !!p.pagamentoOnline && !!p.pagamentoOnlineSalvo && !p.pago && !!p.id && (this.isPix(p) || this.isBoleto(p));
    }

    notificarCobrancaPagamento(p: any): void {
        if (!this.pedidoId || !p.id) return;
        
        this.pedidoService.notificarCobrancaPagamento(this.pedidoId, p.id).subscribe({
            next: () => {
                alert('E-mail de cobrança enviado com sucesso para o cliente!');
            },
            error: (err: any) => {
                console.error('Erro ao enviar e-mail de cobrança', err);
                alert('Erro ao enviar e-mail: ' + (err.error?.message || err.message));
            }
        });
    }

    onFormaPagamentoParcelaChange(p: any): void {
        const formaId = Number(p.formaPagamentoId);
        p.formaPagamentoId = formaId; // Garante tipo Number
        
        const fp = this.formasPagamento.find(f => Number(f.id) === formaId);
        if (fp) {
            p.formaPagamentoDescricao = fp.descricao || fp.nome;
            
            const isOnlineMetodo = (
                (fp.descricao && (fp.descricao.toUpperCase().includes('PIX') || fp.descricao.toUpperCase().includes('BOLETO'))) || 
                (fp.nome && (fp.nome.toUpperCase().includes('PIX') || fp.nome.toUpperCase().includes('BOLETO')))
            );

            if (!isOnlineMetodo) {
                p.pagamentoOnline = false;
            }
            
            // Se mudou na linha, assume-se que deve limpar dados antigos MP para gerar novos ao salvar
            p.boletoPdfUrl = null;
            p.mercadopagoPagamentoId = null;
            p.pixCopiaECola = null;
            p.pixQrCode = null;
            p.boletoLinhaDigitavel = null;
            p.boletoCodigoBarras = null;
        }
    }

    isPix(p: any): boolean {
        if (!p) return false;
        // Tenta pelo ID primeiro (ID 1 geralmente é PIX no sistema)
        if (p.formaPagamentoId == 1) return true;
        // Fallback pela descrição
        const desc = p.formaPagamentoDescricao?.toUpperCase() || '';
        return desc.includes('PIX');
    }

    isBoleto(p: any): boolean {
        if (!p) return false;
        // Tenta pelo ID primeiro (ID 3 geralmente é BOLETO no sistema)
        if (p.formaPagamentoId == 3) return true;
        // Fallback pela descrição
        const desc = p.formaPagamentoDescricao?.toUpperCase() || '';
        return desc.includes('BOLETO');
    }

    compareFormas(o1: any, o2: any): boolean {
        if (o1 === o2) return true;
        if (o1 === null || o1 === undefined || o2 === null || o2 === undefined) return false;
        
        const val1 = Number(o1);
        const val2 = Number(o2);
        
        if (isNaN(val1) || isNaN(val2)) return o1 === o2;
        return val1 === val2;
    }

    podeExibirBotaoPagamento(p: any, index: number): boolean {
        // Se já está pago, não precisa mostrar botão de pagamento
        if (p.pago) return false;

        // Se não tem dados de pagamento gerados no Mercado Pago / Boleto, não mostra
        if (!p.mercadopagoPagamentoId && !p.boletoPdfUrl && !p.pixCopiaECola) return false;
        
        // Se for boleto, mostra sempre (conforme solicitado: "Cada boleto individualmente está correto")
        if (this.isBoleto(p)) return true;
        
        // Se for PIX, mostra apenas se for a PRIMEIRA parcela PIX pendente de pagamento
        if (this.isPix(p)) {
            const primeiraPendentePixIndex = this.parcelasGeradas.findIndex(parcela => 
                this.isPix(parcela) && !parcela.pago
            );
            return index === primeiraPendentePixIndex;
        }
        
        return true;
    }

    visualizarImagem(produto: any): void {
        const id = produto.id || produto.produtoId;
        this.imagemUrlVisualizacao = ''; // Reset previous image
        
        if (!produto.imagem && (produto.temImagem || id)) {
            this.produtoService.buscarPorId(id).subscribe({
                next: (p) => {
                    produto.imagem = p.imagem;
                    this.imagemUrlVisualizacao = p.imagem || '';
                    this.exibirVisualizacaoImagem = true;
                },
                error: () => {
                    this.exibirVisualizacaoImagem = true;
                }
            });
        } else {
            this.imagemUrlVisualizacao = produto.imagem || '';
            this.exibirVisualizacaoImagem = true;
        }
    }

    fecharVisualizacaoImagem(): void {
        this.exibirVisualizacaoImagem = false;
    }

    gerarCatalogoPdf(): void {
        this.avisoPdf = true;
        this.produtoService.gerarCatalogo().subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                // Mantém o aviso aberto conforme solicitado
            },
            error: (err) => {
                console.error('Erro ao gerar catálogo', err);
                alert('Ocorreu um erro ao gerar o catálogo.');
                this.avisoPdf = false;
            }
        });
    }

    visualizarNotaFiscal(): void {
        if (!this.notaFiscalPath || !this.pedidoId) return;

        this.pedidoService.visualizarNotaFiscal(this.pedidoId).subscribe(blob => {
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
