import { Component, OnInit } from '@angular/core';
import { CarrinhoService, CarrinhoResponseDTO } from '../../services/carrinho.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';
import { MetodoPagamentoAutorizado } from '../../models/metodo-pagamento-autorizado.enum';
import { OpcaoParcelamento } from '../../models/opcao-parcelamento.model';

@Component({
  selector: 'app-carrinho',
  templateUrl: './carrinho.component.html',
  styleUrls: ['./carrinho.component.css']
})
export class CarrinhoComponent implements OnInit {

  itensCarrinho: CarrinhoResponseDTO[] = [];
  gruposPorTamanho: { tamanho: number, itens: CarrinhoResponseDTO[] }[] = [];
  formasPagamento: any[] = [];
  
  formaPagamentoSelecionada?: number;
  
  valorSubtotal: number = 0;
  freteSugerido: number = 0;
  freteConfig: any = null;
  descontoUsuario: number = 0;
  descontoForma: number = 0;
  valorDescontoCalculado: number = 0;
  valorTotalGeral: number = 0;
  pagamentoOnline: boolean = false;
  metodoPagamentoAutorizadoCliente?: MetodoPagamentoAutorizado;
  ativarDescontoAVista: boolean = false;
  
  permitirParcelamento: boolean = false;
  opcoesParcelamentoAutorizadas: OpcaoParcelamento[] = [];
  opcaoParcelamentoSelecionada?: OpcaoParcelamento;
  quantidadeParcelas: number = 1;
  parcelasGeradas: { dataVencimento: string, valor: number, pago: boolean, pagamentoOnline?: boolean, formaPagamentoId?: number }[] = [];

  exibirModalLimpar: boolean = false;
  exibirModalGerarPedido: boolean = false;
  observacaoPedido: string = '';
  
  // Zoom de Imagem
  exibirVisualizacaoImagem: boolean = false;
  imagemUrlVisualizacao: string = '';

  // Toast Notification
  exibirToast: boolean = false;
  mensagemToast: string = '';
  toastTimeout: any;

  constructor(
    private carrinhoService: CarrinhoService,
    private pedidoService: PedidoService,
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

  getLabelMeioPagamentoOnline(): string {
    const forma = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
    if (forma && (
        (forma.descricao && (forma.descricao.toUpperCase().includes('BOLETO'))) || 
        (forma.nome && (forma.nome.toUpperCase().includes('BOLETO')))
    )) {
        return 'Boleto Bancário';
    }
    return 'QR Code (PIX)';
  }

  getDescricaoPagamentoOnline(): string {
    const label = this.getLabelMeioPagamentoOnline();
    if (label === 'Boleto Bancário') {
      return 'A linha digitável e o PDF do boleto serão gerados';
    }
    return 'O QR Code para pagamento será gerado';
  }

  ngOnInit(): void {
    this.carregarDadosIniciais();
  }

  carregarDadosIniciais(): void {
    const usuarioId = this.authService.getUsuarioIdDoToken();
    if (!usuarioId) return;

    this.carregarFormasPagamento();
    
    this.usuarioService.buscarPorId(usuarioId).subscribe(usuario => {
        this.descontoUsuario = usuario.desconto || 0;
        this.metodoPagamentoAutorizadoCliente = usuario.metodoPagamentoAutorizado;
        this.permitirParcelamento = usuario.permitirParcelamento || false;
        this.ativarDescontoAVista = usuario.ativarDescontoAVista || false;
        this.opcoesParcelamentoAutorizadas = usuario.opcoesParcelamento || [];
        this.carregarCarrinho(usuarioId);
        this.verificarRegrasPagamentoOnline();
    });

    this.pedidoService.obterSugestaoFrete(usuarioId).subscribe(config => {
        this.freteConfig = config;
        this.calcularTotais();
    });
  }

  carregarCarrinho(usuarioId: number): void {

    this.carrinhoService.buscarPorUsuario(usuarioId).subscribe({
      next: (data) => {
        this.itensCarrinho = data;
        this.agruparEOrdenarPorTamanho();
        this.calcularTotais();
      },
      error: (err) => console.error('Erro ao carregar carrinho', err)
    });
  }

  carregarFormasPagamento(): void {
    this.pedidoService.obterFormasPagamento().subscribe({
      next: (data) => this.formasPagamento = data,
      error: (err) => console.error('Erro ao buscar formas de pagamento', err)
    });
  }

  agruparEOrdenarPorTamanho(): void {
    const map = new Map<number, CarrinhoResponseDTO[]>();
    
    this.itensCarrinho.forEach(item => {
      const tamanho = item.produtoTamanho || 0;
      if (!map.has(tamanho)) {
        map.set(tamanho, []);
      }
      map.get(tamanho)!.push(item);
    });

    this.gruposPorTamanho = Array.from(map.entries())
      .map(([tamanho, itens]) => ({ tamanho, itens }))
      // Ordena por tamanho, do menor para o maior (crescente)
      .sort((a, b) => a.tamanho - b.tamanho);
  }

  calcularTotais(): void {
    this.valorSubtotal = this.itensCarrinho.reduce(
      (acc, item) => acc + ((item.produtoPreco || 0) * (item.quantidade || 0)), 0
    );
    
    if (this.freteConfig) {
        let pesoTotal = this.itensCarrinho.reduce((acc, item) => acc + ((item.produtoPeso || 0) * (item.quantidade || 0)), 0);
        let freteCalculado = this.freteConfig.valor || 0;

        if (this.freteConfig.quantidadeFaixa && this.freteConfig.valorFaixa) {
            let pesoParaCalculo = pesoTotal;
            if (this.freteConfig.minimoFaixa && pesoTotal > this.freteConfig.minimoFaixa) {
                pesoParaCalculo = pesoTotal - this.freteConfig.minimoFaixa;
                const faixas = Math.ceil(pesoParaCalculo / this.freteConfig.quantidadeFaixa);
                freteCalculado += (faixas * this.freteConfig.valorFaixa);
            } else if (!this.freteConfig.minimoFaixa) {
                const faixas = Math.ceil(pesoParaCalculo / this.freteConfig.quantidadeFaixa);
                freteCalculado += (faixas * this.freteConfig.valorFaixa);
            }
        }
        this.freteSugerido = freteCalculado;
    }

    // O desconto da forma de pagamento só é aplicado se for À Vista (1 parcela) E se o usuário tiver o desconto ativo
    const descFormaAplicado = (Number(this.quantidadeParcelas) === 1 && this.ativarDescontoAVista) ? this.descontoForma : 0;
    const descontoTotalPerc = this.descontoUsuario + descFormaAplicado;
    this.valorDescontoCalculado = this.valorSubtotal * (descontoTotalPerc / 100);
    
    this.valorTotalGeral = (this.valorSubtotal - this.valorDescontoCalculado) + this.freteSugerido;
    
    // Auto-deseleciona se a forma escolhida se tornar inválida devido a mudanças no total
    if (this.formaPagamentoSelecionada) {
        const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
        if (fp && !this.isFormaHabilitada(fp)) {
            this.formaPagamentoSelecionada = undefined;
            this.descontoForma = 0;
            this.atualizarOpcoesParcelamento();
        }
    }
  }

  isFormaHabilitada(forma: any): boolean {
    const minVista = forma.valorMinimo || 0;
    const op = this.opcoesParcelamentoAutorizadas.find(o => o.formaPagamentoId == forma.id);
    const minParcelado = op ? (op.valorMinimoParcela * 2) : Infinity;

    const menorMinimo = Math.min(minVista, minParcelado);
    return this.valorTotalGeral >= menorMinimo;
  }

  getDescontoTotalExibicao(): number {
    const descFormaAplicado = (Number(this.quantidadeParcelas) === 1 && this.ativarDescontoAVista) ? this.descontoForma : 0;
    return this.descontoUsuario + descFormaAplicado;
  }

  getMensagemMinimo(forma: any): string {
    const minVista = forma.valorMinimo || 0;
    const op = this.opcoesParcelamentoAutorizadas.find(o => o.formaPagamentoId == forma.id);
    const minParcelado = op ? (op.valorMinimoParcela * 2) : Infinity;

    const menorMinimo = Math.min(minVista, minParcelado);

    if (this.valorTotalGeral < menorMinimo) {
        const falta = menorMinimo - this.valorTotalGeral;
        const faltaFmt = falta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return `Faltam ${faltaFmt} para o mínimo`;
    }
    return '';
  }

  aoSelecionarFormaPagamento(): void {
      const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
      if (fp) {
          this.descontoForma = fp.desconto || 0;
      } else {
          this.descontoForma = 0;
      }
      this.verificarRegrasPagamentoOnline();
      this.calcularTotais();
      this.atualizarOpcoesParcelamento();
  }

  atualizarOpcoesParcelamento(): void {
      if (!this.permitirParcelamento || !this.formaPagamentoSelecionada) {
          this.opcaoParcelamentoSelecionada = undefined;
          this.quantidadeParcelas = 1;
          this.parcelasGeradas = [];
          return;
      }

      const opcoesFiltradas = this.opcoesParcelamentoAutorizadas.filter(o => o.formaPagamentoId == this.formaPagamentoSelecionada);
      
      if (opcoesFiltradas.length > 0) {
          this.opcaoParcelamentoSelecionada = opcoesFiltradas[0]; // Pega a primeira regra disponível
          this.quantidadeParcelas = 1; // Reseta para 1x ao mudar forma de pagamento
          this.gerarParcelasPreview();
      } else {
          this.opcaoParcelamentoSelecionada = undefined;
          this.quantidadeParcelas = 1;
          this.parcelasGeradas = [];
      }
  }

  get opcoesParcelasDisponiveis(): number[] {
    if (!this.opcaoParcelamentoSelecionada) return [1];
    
    // Total a considerar para o parcelamento (sem o desconto de à vista)
    const totalBase = (this.valorSubtotal - (this.valorSubtotal * (this.descontoUsuario / 100))) + this.freteSugerido;
    const result: number[] = [1];
    
    const max = this.opcaoParcelamentoSelecionada.qtdMaxParcelas || 1;
    const minParcela = this.opcaoParcelamentoSelecionada.valorMinimoParcela || 0;

    for (let i = 2; i <= max; i++) {
        if ((totalBase / i) >= minParcela) {
            result.push(i);
        }
    }
    return result;
  }

  getValorParcelaPreview(n: number): number {
    let descontoTotalPerc = this.descontoUsuario;
    
    // Se for à vista (1x), incluímos o desconto da forma de pagamento se houver e se o usuário tiver o desconto ativo
    if (n === 1 && this.formaPagamentoSelecionada && this.ativarDescontoAVista) {
        const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
        if (fp) {
            descontoTotalPerc += (fp.desconto || 0);
        }
    }
    
    const valorComDesconto = this.valorSubtotal * (1 - (descontoTotalPerc / 100));
    return (valorComDesconto + this.freteSugerido) / n;
  }

  getLabelParcela(n: number): string {
    const valor = this.getValorParcelaPreview(n);
    const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    if (n === 1) {
        const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
        const descForma = (fp && this.ativarDescontoAVista) ? (fp.desconto || 0) : 0;
        const suffix = descForma > 0 ? ` (-${descForma}% à vista)` : '';
        return `À vista (1x) de ${valorFmt}${suffix}`;
    }

    if (!this.opcaoParcelamentoSelecionada) {
        return `${n}x de ${valorFmt}`;
    }

    const intervalos = [];
    const dias = this.opcaoParcelamentoSelecionada.diasVencimentoIntervalo;
    for (let i = 1; i <= n; i++) {
        intervalos.push(i * dias);
    }
    
    return `${n}x (${intervalos.join('/')}) de ${valorFmt}`;
  }

  gerarParcelasPreview(): void {
      if (!this.opcaoParcelamentoSelecionada || this.quantidadeParcelas < 1) {
          this.parcelasGeradas = [];
          return;
      }

      // Se mudou a quantidade de parcelas, o desconto pode mudar
      this.calcularTotais();

      const valorPorParcela = parseFloat((this.valorTotalGeral / this.quantidadeParcelas).toFixed(2));
      let saldo = this.valorTotalGeral;
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
              pago: false,
              pagamentoOnline: this.pagamentoOnline,
              formaPagamentoId: this.formaPagamentoSelecionada
          });
      }
  }

  verificarRegrasPagamentoOnline(): void {
      const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
      const isOnlineMetodo = fp && (
          (fp.descricao && (fp.descricao.toUpperCase().includes('PIX') || fp.descricao.toUpperCase().includes('BOLETO'))) || 
          (fp.nome && (fp.nome.toUpperCase().includes('PIX') || fp.nome.toUpperCase().includes('BOLETO')))
      );

      if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.APENAS_ONLINE) {
          this.pagamentoOnline = isOnlineMetodo ? true : false;
      } else if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE) {
          if (!isOnlineMetodo) {
              this.pagamentoOnline = false;
          }
      } else {
          this.pagamentoOnline = false;
      }
  }

  deveMostrarCampoPagamentoOnline(): boolean {
      const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
      const isOnlineMetodo = fp && (
          (fp.descricao && (fp.descricao.toUpperCase().includes('PIX') || fp.descricao.toUpperCase().includes('BOLETO'))) || 
          (fp.nome && (fp.nome.toUpperCase().includes('PIX') || fp.nome.toUpperCase().includes('BOLETO')))
      );

      return !!isOnlineMetodo && this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE;
  }

  atualizarQuantidade(item: CarrinhoResponseDTO, value: string | number): void {
      const novaQtd = typeof value === 'string' ? parseInt(value, 10) : value;
      if (novaQtd <= 0 || isNaN(novaQtd)) return;
      
      const usuarioId = this.authService.getUsuarioIdDoToken();
      if (!usuarioId) return;

      this.carrinhoService.atualizarQuantidade(usuarioId, item.produtoId, {
          usuarioId: usuarioId,
          produtoId: item.produtoId,
          quantidade: novaQtd
      }).subscribe({
          next: () => {
              item.quantidade = novaQtd;
              this.calcularTotais();
              this.mostrarToast('Quantidade atualizada');
          },
          error: (err) => console.error('Erro ao atualizar quantidade', err)
      });
  }

  removerItem(produtoId: number): void {
      const usuarioId = this.authService.getUsuarioIdDoToken();
      if (!usuarioId) return;

      this.carrinhoService.remover(usuarioId, produtoId).subscribe({
          next: () => {
              this.mostrarToast('Produto removido');
              const usuarioId = this.authService.getUsuarioIdDoToken();
              if (usuarioId) this.carregarCarrinho(usuarioId);
          },
          error: (err) => console.error('Erro ao remover produto do carrinho', err)
      });
  }

  // Lógica Modal
  abrirModalLimpar(): void {
      this.exibirModalLimpar = true;
  }

  fecharModalLimpar(): void {
      this.exibirModalLimpar = false;
  }

  limparCarrinhoConfirmado(): void {
      const usuarioId = this.authService.getUsuarioIdDoToken();
      if (!usuarioId) return;

      this.carrinhoService.limpar(usuarioId).subscribe({
          next: () => {
              this.mostrarToast('Carrinho limpo');
              this.fecharModalLimpar();
              this.carregarCarrinho(usuarioId);
          },
          error: (err) => console.error('Erro ao limpar carrinho', err)
      });
  }

  abrirModalGerarPedido(): void {
      if (this.itensCarrinho.length === 0) {
          alert('Carrinho vazio.');
          return;
      }
      if (!this.formaPagamentoSelecionada) {
          alert('Selecione uma forma de pagamento.');
          return;
      }
      this.exibirModalGerarPedido = true;
  }

  fecharModalGerarPedido(): void {
      this.exibirModalGerarPedido = false;
  }

  confirmarGerarPedido(): void {
      const usuarioId = this.authService.getUsuarioIdDoToken();
      if (!usuarioId) return;

      const descFormaAplicado = (Number(this.quantidadeParcelas) === 1 && this.ativarDescontoAVista) ? this.descontoForma : 0;
      const descontoTotalPedido = this.descontoUsuario + descFormaAplicado;

      const novoPedido = {
          usuarioId: usuarioId,
          formaPagamentoId: this.formaPagamentoSelecionada,
          desconto: descontoTotalPedido,
          frete: this.freteSugerido,
          valorTotal: this.valorTotalGeral,
          observacao: this.observacaoPedido,
          pagamentoOnline: this.pagamentoOnline,
          situacao: 'PENDENTE',
          produtos: this.itensCarrinho.map(item => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              valor: item.produtoPreco
          })),
          pagamentos: this.parcelasGeradas.length > 0 ? this.parcelasGeradas.map(p => ({
              ...p,
              pagamentoOnline: this.pagamentoOnline
          })) : [
               { 
                   dataVencimento: new Date().toISOString().split('T')[0], 
                   valor: this.valorTotalGeral, 
                   pago: false,
                   pagamentoOnline: this.pagamentoOnline,
                   formaPagamentoId: this.formaPagamentoSelecionada
               }
          ]
      };

      this.pedidoService.salvar(novoPedido).subscribe({
          next: (res) => {
              this.carrinhoService.limpar(usuarioId).subscribe({
                  next: () => {
                      this.fecharModalGerarPedido();
                      if (novoPedido.pagamentoOnline) {
                          // Tenta encontrar a primeira parcela online para passar o ID
                          const proximo = res.pagamentos?.find((p: any) => p.pagamentoOnline && !p.pago);
                          this.router.navigate(['/pedidos/pix', res.id], { 
                              queryParams: proximo ? { pagamentoId: proximo.id } : {} 
                          });
                      } else {
                          this.router.navigate(['/pedidos'], { state: { novoPedidoCriadoId: res.id } });
                      }
                  },
                  error: (err) => console.error('Limpa carrinho erro', err)
              });
          },
          error: (err) => {
              console.error('Erro ao salvar pedido', err);
              this.mostrarToast('Erro ao confirmar seu pedido. Tente novamente mais tarde.');
          }
      });
  }

  mostrarToast(mensagem: string): void {
      this.mensagemToast = mensagem;
      this.exibirToast = true;
      
      if (this.toastTimeout) {
          clearTimeout(this.toastTimeout);
      }
      
      this.toastTimeout = setTimeout(() => {
          this.exibirToast = false;
      }, 3000);
  }

  get itensCarrinhoOrdenadosModal(): CarrinhoResponseDTO[] {
      return [...this.itensCarrinho].sort((a, b) => {
          const nomeA = a.produtoNome || '';
          const nomeB = b.produtoNome || '';
          const cmpNome = nomeA.localeCompare(nomeB);
          if (cmpNome !== 0) return cmpNome;
          
          return (a.produtoTamanho || 0) - (b.produtoTamanho || 0);
      });
  }

  abrirVisualizacaoImagem(imagem: string): void {
      if (imagem) {
          this.imagemUrlVisualizacao = imagem;
          this.exibirVisualizacaoImagem = true;
      }
  }

  fecharVisualizacaoImagem(): void {
      this.exibirVisualizacaoImagem = false;
      this.imagemUrlVisualizacao = '';
  }
}
