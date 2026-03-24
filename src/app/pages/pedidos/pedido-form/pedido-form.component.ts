import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { PedidoService, Pedido, PedidoProduto } from '../../../services/pedido.service';
import { UsuarioService } from '../../../services/usuario.service';
import { AuthService } from '../../../services/auth.service';
import { ProdutoService } from '../../../services/produto.service';
import { Usuario } from '../../../models/usuario.model';
import { Produto } from '../../../models/produto.model';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { of } from 'rxjs';
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
    
    // Parcelamento
    permitirParcelamento: boolean = false;
    opcoesParcelamentoAutorizadas: OpcaoParcelamento[] = [];
    opcaoParcelamentoSelecionada?: OpcaoParcelamento;
    quantidadeParcelas: number = 1;
    parcelasGeradas: { id?: number, dataVencimento: string, valor: number, valorFormatado?: string, pago: boolean, formaPagamentoId?: number }[] = [];

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
            formaPagamentoId: [null],
            desconto: [0],
            frete: ['R$ 0,00'],
            situacao: ['PENDENTE'],
            observacao: [''],
            valorTotal: [{ value: 0, disabled: true }],
            pagamentoOnline: [false],
            itens: this.fb.array([])
        });
    }

    ngOnInit(): void {
        const id = this.route.snapshot.params['id'];
        this.isAdmin = this.authService.getRoleDoToken() === 'ADMIN';

        if (id) {
            this.modoEdicao = true;
            this.pedidoId = id;
            this.carregarPedido(id);
        } else {
            // New order
            if (!this.isAdmin) {
                // If CLIENTE, auto-fill and disable client selection
                const userId = this.authService.getUsuarioIdDoToken();
                const userNome = this.authService.getSubjectDoToken();
                if (userId) {
                    // simulate user selection to load freight
                    this.pedidoForm.patchValue({
                        usuarioId: userId,
                        usuarioNome: userNome
                    });
                    this.pedidoForm.get('usuarioNome')?.disable();
                    this.usuarioService.buscarPorId(userId).subscribe(user => {
                        this.selecionarUsuario(user);
                    });
                }
            }
        }

        // Only search users if ADMIN
        if (this.isAdmin) {
            this.setupBuscaUsuarios();
        }
        
        this.carregarFormasPagamento();
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
            }
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

    carregarFormasPagamento(): void {
        this.pedidoService.obterFormasPagamento().subscribe(formas => {
            this.formasPagamento = formas;
        });
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
        this.verificarRegrasPagamentoOnline();
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
        const descT = this.calcularDescontoTotal(id);
        this.pedidoForm.get('desconto')?.setValue(descT, { emitEvent: false });
        this.verificarRegrasPagamentoOnline();
        this.calcularTotais();
        // Nota: calcularTotais já chama atualizarOpcoesParcelamento
    }

    onDescontoManualChange(): void {
        const currentVal = this.pedidoForm.get('desconto')?.value || 0;
        const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
        let maxForma = 0;
        // Se estiver em 1x, o valor no input inclui o desconto da forma. 
        // Subtraímos para obter o "Base" que será preservado ao mudar para parcelado.
        if (formaId && Number(this.quantidadeParcelas) === 1) {
            const fp = this.formasPagamento.find(f => f.id == formaId);
            if (fp) maxForma = fp.desconto || 0;
        }
        this.descontoUsuarioAtual = currentVal - maxForma;
        this.calcularTotais();
    }

    atualizarOpcoesParcelamento(manterParcelasExistentes: boolean = false): void {
      if (!this.permitirParcelamento || !this.pedidoForm.get('formaPagamentoId')?.value) {
          this.opcaoParcelamentoSelecionada = undefined;
          this.quantidadeParcelas = 1;
          if (!manterParcelasExistentes) {
              this.parcelasGeradas = [];
          }
          return;
      }

      const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
      const op = this.opcoesParcelamentoAutorizadas.find(o => o.formaPagamentoId == formaId);
      
      if (op) {
          this.opcaoParcelamentoSelecionada = op;
          
          // Preserva a quantidade de parcelas se ela ainda for válida no novo cenário de total
          const disponiveis = this.opcoesParcelasDisponiveis;
          const qtdAtual = Number(this.quantidadeParcelas);
          if (qtdAtual > 0 && !disponiveis.includes(qtdAtual)) {
              this.quantidadeParcelas = 1;
          }

          if (!manterParcelasExistentes || this.parcelasGeradas.length === 0) {
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
            const fp = this.formasPagamento.find(f => f.id == formaId);
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
        this.calcularTotais();
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
                formaPagamentoId: formaId
            });
        }
    }

    verificarRegrasPagamentoOnline(): void {
        const formaPagamentoId = this.pedidoForm.get('formaPagamentoId')?.value;
        const forma = this.formasPagamento.find(f => f.id === formaPagamentoId);
        const isPix = forma && forma.descricao?.toUpperCase() === 'PIX';

        if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.APENAS_ONLINE) {
            this.pedidoForm.get('pagamentoOnline')?.setValue(true);
        } else if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE) {
            if (!isPix) {
                this.pedidoForm.get('pagamentoOnline')?.setValue(false);
            }
        } else {
            this.pedidoForm.get('pagamentoOnline')?.setValue(false);
        }
    }

    deveMostrarCampoPagamentoOnline(): boolean {
        const formaPagamentoId = this.pedidoForm.get('formaPagamentoId')?.value;
        const forma = this.formasPagamento.find(f => f.id === formaPagamentoId);
        const isPix = forma && forma.descricao?.toUpperCase() === 'PIX';

        return isPix && this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE;
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
        const qtdParcelas = n !== undefined ? n : Number(this.quantidadeParcelas);
        let maxForma = 0;
        // O desconto da forma de pagamento só é aplicado se for À Vista (1 parcela) E se o usuário tiver o desconto ativo
        if (formaPagamentoId && qtdParcelas === 1 && this.ativarDescontoAVista) {
            const fp = this.formasPagamento.find(f => f.id == formaPagamentoId);
            if (fp) maxForma = fp.desconto || 0;
        }
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

    calcularTotais(manterParcelasExistentes: boolean = false): void {
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
        const formaId = this.pedidoForm.get('formaPagamentoId')?.value;
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
            const fp = this.formasPagamento.find(f => f.id == formaId);
            if (fp && !this.isFormaPagamentoDisponivel(fp)) {
                this.pedidoForm.get('formaPagamentoId')?.setValue(null, { emitEvent: false });
                this.aoSelecionarFormaPagamento(null);
            }
        }
        this.atualizarOpcoesParcelamento(manterParcelasExistentes);
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
        this.pedidoService.buscarPorId(id).subscribe(pedido => {
            const freteFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.frete);

            this.pedidoForm.patchValue({
                usuarioId: pedido.usuarioId,
                usuarioNome: pedido.usuarioNome,
                formaPagamentoId: pedido.formaPagamentoId || null,
                desconto: pedido.desconto,
                frete: freteFormatted,
                situacao: pedido.situacao,
                observacao: pedido.observacao,
                pagamentoOnline: pedido.pagamentoOnline
            }, { emitEvent: false });

            this.notaFiscalPath = pedido.notaFiscalPath;

            // Pulo do gato: Para não perder o valor original e a base de cálculo. 
            // O desconto salvo no banco para o pedido já inclui os ganhos da forma de pagamento se for à vista.
            // Precisamos extrair o "Desconto Base" para a lógica reativa funcionar.
            const formaId = pedido.formaPagamentoId;
            let descontoForma = 0;
            if (formaId && pedido.pagamentos && pedido.pagamentos.length === 1) {
                const fp = this.formasPagamento.find(f => f.id == formaId);
                if (fp) descontoForma = fp.desconto || 0;
            }
            this.descontoUsuarioAtual = (pedido.desconto || 0) - descontoForma;
            
            // Load freight config for this user to enable dynamic updates during edit
            this.carregarConfiguracaoFrete(pedido.usuarioId);

            // Carrega parcelas do banco ANTES de qualquer recalculo que possa limpá-las
            if (pedido.pagamentos && pedido.pagamentos.length > 0) {
                this.parcelasGeradas = pedido.pagamentos.map(p => ({
                    id: p.id,
                    dataVencimento: p.dataVencimento.toString(),
                    valor: p.valor,
                    valorFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor),
                    pago: p.pago,
                    formaPagamentoId: p.formaPagamentoId
                }));
                setTimeout(() => {
                    this.quantidadeParcelas = 0;
                });
            }

            this.usuarioService.buscarPorId(pedido.usuarioId).subscribe(user => {
                this.metodoPagamentoAutorizadoCliente = user.metodoPagamentoAutorizado;
                this.permitirParcelamento = user.permitirParcelamento || false;
                this.ativarDescontoAVista = user.ativarDescontoAVista || false;
                this.opcoesParcelamentoAutorizadas = user.opcoesParcelamento || [];
                this.verificarRegrasPagamentoOnline();
                this.atualizarOpcoesParcelamento(true);
            });

            pedido.produtos.sort((a, b) => {
                const nomeA = a.produtoNome.toLowerCase();
                const nomeB = b.produtoNome.toLowerCase();
                if (nomeA < nomeB) return -1;
                if (nomeA > nomeB) return 1;
                if ((a.tamanho || 0) < (b.tamanho || 0)) return -1;
                if ((a.tamanho || 0) > (b.tamanho || 0)) return 1;
                return a.valor - b.valor;
            }).forEach(p => {
                const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor);

                const itemForm = this.fb.group({
                    id: [p.id],
                    produtoId: [p.produtoId],
                    produtoNome: [p.produtoNome],
                    produtoCodigo: [p.produtoCodigo],
                    tamanho: [p.tamanho], // Now mapped from DTO
                    quantidade: [{ value: p.quantidade, disabled: pedido.situacao !== 'PENDENTE' }, Validators.required],
                    valor: [{ value: valorFormatted, disabled: !this.isAdmin }, Validators.required],
                    total: [{ value: p.quantidade * p.valor, disabled: true }],
                    imagem: [p.imagem], // Load the image from backend response
                    peso: [p.peso || 0]
                });
                this.itens.push(itemForm);
            });

            // Note: carregarPedido calls calcularTotais at end.
            // If we have freteConfig loaded by then (async), it will recalc freight.
            // If async hasn't returned, it uses loaded freight.
            // This race condition might cause freight to jump if calculated differs from saved.
            // But usually saved should match calculated unless rules changed.
            // For now, accept this.
            this.calcularTotais(true);
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
                id: p.id,
                dataVencimento: p.dataVencimento,
                valor: p.valor,
                pago: p.pago || false,
                formaPagamentoId: p.formaPagamentoId || formValue.formaPagamentoId
            })) : [
                { dataVencimento: new Date().toISOString().split('T')[0], valor: formValue.valorTotal, pago: false, formaPagamentoId: formValue.formaPagamentoId }
            ]
        };

        if (this.isPedidoBloqueadoParaUsuario) {
            alert('Este pedido não pode ser alterado pois não está na situação PENDENTE.');
            return;
        }

        if (this.modoEdicao) {
            this.pedidoService.alterar(this.pedidoId!, pedidoData).subscribe(() => {
                alert('Pedido alterado com sucesso!');
                this.voltar();
            });
        } else {
            this.pedidoService.salvar(pedidoData).subscribe(salvo => {
                this.pedidoId = salvo.id;
                this.exibirSucesso = true;
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
        
        this.parcelasGeradas.push({
            dataVencimento: hoje,
            valor: valorRestante > 0 ? valorRestante : 0,
            valorFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorRestante > 0 ? valorRestante : 0),
            pago: false,
            formaPagamentoId: this.pedidoForm.get('formaPagamentoId')?.value
        });
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
        const formValue = this.pedidoForm.getRawValue();
        if (formValue.pagamentoOnline && this.pedidoId) {
            this.router.navigate(['/pedidos/pix', this.pedidoId]);
        } else {
            this.voltar();
        }
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
