import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PedidoService } from '../../../services/pedido.service';
import { AuthService } from '../../../services/auth.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-pix-payment',
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.css']
})
export class PixPaymentComponent implements OnInit, OnDestroy {
  pedidoId: number | null = null;
  pagamentoId: number | null = null;
  pixCopiaECola: string = '';
  pixQrCodeBase64: string = '';
  loading: boolean = true;
  totalPedido: number = 0;
  totalParcela: number = 0;
  erroGeracao: boolean = false;
  tempoRestante: string = '';
  timer: any;
  dataExpiracao: Date | null = null;
  loadingGeracao: boolean = false;
  erroSituacaoPendente: boolean = false;
  isAdmin: boolean = false;
  mensagemErro: string = '';
  pagamentoConfirmado: boolean = false;
  pollingTimer: any;
  isBoleto: boolean = false;
  boletoPdfUrl: string = '';
  boletoLinhaDigitavel: string = '';
  isRenovando: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pedidoService: PedidoService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.getRoleDoToken() === 'ADMIN';
    const id = this.route.snapshot.paramMap.get('id');
    const pagId = this.route.snapshot.queryParamMap.get('pagamentoId');
    if (id) {
      this.pedidoId = +id;
      if (pagId) this.pagamentoId = +pagId;
      this.carregarDadosPix();
      this.iniciarPollingStatus();
    } else {
      this.router.navigate(['/pedidos']);
    }
  }

  carregarDadosPix(): void {
    if (!this.pedidoId) return;
    this.loading = true;
    this.erroGeracao = false;
    this.mensagemErro = '';
    
    this.pedidoService.buscarPorId(this.pedidoId).subscribe({
      next: (pedido) => {
        this.totalPedido = pedido.valorTotal || 0;

        let pagamento = null;
        if (this.pagamentoId) {
          pagamento = pedido.pagamentos?.find(p => p.id === this.pagamentoId);
        } else {
          // Se não passou ID, pega o primeiro online pendente
          pagamento = pedido.pagamentos?.find(p => !p.pago && p.pagamentoOnline);
        }

        if (!pagamento) {
          this.erroGeracao = true;
          this.loading = false;
          return;
        }

        this.totalParcela = pagamento.valor || 0;
        this.isBoleto = !!pagamento.boletoPdfUrl;

        if (this.isBoleto) {
          this.boletoPdfUrl = pagamento.boletoPdfUrl || '';
          this.boletoLinhaDigitavel = pagamento.boletoLinhaDigitavel || '';
          this.loading = false;
        } else {
          // Lógica PIX
          if (pagamento.dataExpiracao) {
            this.dataExpiracao = new Date(pagamento.dataExpiracao);
            if (this.dataExpiracao < new Date() && !pagamento.pago) {
              this.tentarGerarPix(false);
              return;
            }
            this.iniciarTimer();
          }

          if (!pagamento.pixQrCode && !pagamento.pago && pagamento.pagamentoOnline) {
            this.tentarGerarPix();
          } else {
            this.pixCopiaECola = pagamento.pixCopiaECola || '';
            this.pixQrCodeBase64 = pagamento.pixQrCode || '';
            this.loading = false;
          }
        }
      },
      error: (err) => {
        console.error('Erro ao gerar pagamento', err);
        this.loading = false;
        this.erroGeracao = true;
        this.mensagemErro = err.error?.message || err.message || 'Erro ao gerar pagamento';
      }
    });
  }

  tentarGerarPix(showLoading: boolean = true, skipSpinner: boolean = false): void {
    if (!this.pedidoId || this.loadingGeracao) return;
    
    if (this.timer) clearInterval(this.timer);
    if (showLoading) this.loading = true;
    this.loadingGeracao = true;
    this.isRenovando = true;

    this.pedidoService.gerarPagamentoOnline(this.pedidoId, this.pagamentoId as number, skipSpinner).subscribe({
      next: (pedido) => {
        let pagamento = null;
        if (this.pagamentoId) {
          pagamento = pedido.pagamentos?.find(p => p.id === this.pagamentoId);
        } else {
          pagamento = pedido.pagamentos?.find(p => !p.pago && p.pagamentoOnline);
        }

        if (pagamento) {
          this.totalParcela = pagamento.valor || 0;
          if (pagamento.boletoPdfUrl) {
            this.isBoleto = true;
            this.boletoPdfUrl = pagamento.boletoPdfUrl;
            this.boletoLinhaDigitavel = pagamento.boletoLinhaDigitavel || '';
          } else {
            this.isBoleto = false;
            this.pixCopiaECola = pagamento.pixCopiaECola || '';
            this.pixQrCodeBase64 = pagamento.pixQrCode || '';
            if (pagamento.dataExpiracao) {
              this.dataExpiracao = new Date(pagamento.dataExpiracao);
              this.iniciarTimer();
            }
          }
        }
        
        this.totalPedido = pedido.valorTotal || 0;
        this.loading = false;
        this.loadingGeracao = false;
        this.isRenovando = false;
        
        if (!this.pixQrCodeBase64 && !this.isBoleto) {
          this.erroGeracao = true;
        }
      },
      error: (err) => {
        console.error('Erro ao gerar PIX', err);
        this.loading = false;
        this.loadingGeracao = false;
        this.isRenovando = false;
        this.erroGeracao = true;
        this.mensagemErro = err.error?.message || err.message || 'Erro ao gerar PIX';
      }
    });
  }

  iniciarTimer(): void {
    if (this.timer) clearInterval(this.timer);
    
    this.timer = setInterval(() => {
      if (!this.dataExpiracao) return;

      const agora = new Date().getTime();
      const expira = this.dataExpiracao.getTime();
      const diferenca = expira - agora;

      if (diferenca <= 0) {
        this.tempoRestante = 'EXPIRADO';
        clearInterval(this.timer);
        this.tentarGerarPix(false, true); // Regera sem spinner silenciosamente
      } else {
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
        this.tempoRestante = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  iniciarPollingStatus(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    
    this.pollingTimer = setInterval(() => {
        if (!this.pedidoId || this.pagamentoConfirmado) return;
        
        this.pedidoService.buscarPorId(this.pedidoId, true).subscribe({
            next: (pedido) => {
                let pagamento = null;
                if (this.pagamentoId) {
                    pagamento = pedido.pagamentos?.find(p => p.id === this.pagamentoId);
                } else {
                    pagamento = pedido.pagamentos?.find(p => p.pagamentoOnline);
                }

                if (pagamento && pagamento.pago) {
                    this.pagamentoConfirmado = true;
                    if (this.timer) clearInterval(this.timer);
                    if (this.pollingTimer) clearInterval(this.pollingTimer);
                    this.loading = false;
                }
            }
        });
    }, 5000); // Verifica a cada 5 segundos
  }

  copiarBoleto(): void {
    if (!this.boletoLinhaDigitavel) return;
    navigator.clipboard.writeText(this.boletoLinhaDigitavel).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copiado', detail: 'Linha digitável do boleto copiada!' });
    });
  }

  abrirPdfBoleto(): void {
    if (this.boletoPdfUrl) {
      window.open(this.boletoPdfUrl, '_blank');
    }
  }

  copiarPix(): void {
    navigator.clipboard.writeText(this.pixCopiaECola).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copiado', detail: 'Código PIX copiado!' });
    });
  }

  irParaListagem(): void {
    this.router.navigate(['/pedidos']);
  }
}
