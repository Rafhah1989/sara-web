import { Component, OnInit } from '@angular/core';
import { CarrinhoService, CarrinhoResponseDTO } from '../../services/carrinho.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { Router } from '@angular/router';
import { MetodoPagamentoAutorizado } from '../../models/metodo-pagamento-autorizado.enum';

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

  exibirModalLimpar: boolean = false;
  exibirModalGerarPedido: boolean = false;
  observacaoPedido: string = '';
  
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

    const descontoTotalPerc = this.descontoUsuario + this.descontoForma;
    this.valorDescontoCalculado = this.valorSubtotal * (descontoTotalPerc / 100);
    
    this.valorTotalGeral = (this.valorSubtotal - this.valorDescontoCalculado) + this.freteSugerido;
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
  }

  verificarRegrasPagamentoOnline(): void {
      const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
      const isPix = fp && (
          (fp.descricao && fp.descricao.toUpperCase().includes('PIX')) || 
          (fp.nome && fp.nome.toUpperCase().includes('PIX'))
      );

      if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.APENAS_ONLINE) {
          this.pagamentoOnline = isPix ? true : false;
      } else if (this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE) {
          if (!isPix) {
              this.pagamentoOnline = false;
          }
      } else {
          this.pagamentoOnline = false;
      }
  }

  deveMostrarCampoPagamentoOnline(): boolean {
      const fp = this.formasPagamento.find(f => f.id == this.formaPagamentoSelecionada);
      const isPix = fp && (
          (fp.descricao && fp.descricao.toUpperCase().includes('PIX')) || 
          (fp.nome && fp.nome.toUpperCase().includes('PIX'))
      );

      return isPix && this.metodoPagamentoAutorizadoCliente === MetodoPagamentoAutorizado.ENTREGA_E_ONLINE;
  }

  atualizarQuantidade(item: CarrinhoResponseDTO, value: string): void {
      const novaQtd = parseInt(value, 10);
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

      const novoPedido = {
          usuarioId: usuarioId,
          formaPagamentoId: this.formaPagamentoSelecionada,
          desconto: (this.descontoUsuario + this.descontoForma),
          frete: this.freteSugerido,
          valorTotal: this.valorTotalGeral,
          observacao: this.observacaoPedido,
          pagamentoOnline: this.pagamentoOnline,
          situacao: 'PENDENTE',
          produtos: this.itensCarrinho.map(item => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              valor: item.produtoPreco
          }))
      };

      this.pedidoService.salvar(novoPedido).subscribe({
          next: (res) => {
              this.carrinhoService.limpar(usuarioId).subscribe({
                  next: () => {
                      this.fecharModalGerarPedido();
                      if (novoPedido.pagamentoOnline) {
                          this.router.navigate(['/pedidos/pix', res.id]);
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
}
