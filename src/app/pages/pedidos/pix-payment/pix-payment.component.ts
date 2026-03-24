import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PedidoService } from '../../../services/pedido.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-pix-payment',
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.css']
})
export class PixPaymentComponent implements OnInit, OnDestroy {
  pedidoId: number | null = null;
  pixCopiaECola: string = '';
  pixQrCodeBase64: string = '';
  loading: boolean = true;
  totalPedido: number = 0;
  erroGeracao: boolean = false;
  tempoRestante: string = '';
  timer: any;
  dataExpiracao: Date | null = null;
  loadingGeracao: boolean = false;
  erroSituacaoPendente: boolean = false;
  isAdmin: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pedidoService: PedidoService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.getRoleDoToken() === 'ADMIN';
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.pedidoId = +id;
      this.carregarDadosPix();
    } else {
      this.router.navigate(['/pedidos']);
    }
  }

  carregarDadosPix(): void {
    if (!this.pedidoId) return;
    this.loading = true;
    this.erroGeracao = false;
    
    this.pedidoService.buscarPorId(this.pedidoId).subscribe({
      next: (pedido) => {
        if (!this.isAdmin && pedido.situacao === 'PENDENTE') {
          this.erroSituacaoPendente = true;
          this.loading = false;
          return;
        }
        if (pedido.dataExpiracaoPix) {
          this.dataExpiracao = new Date(pedido.dataExpiracaoPix);
          if (this.dataExpiracao < new Date() && !pedido.pago) {
            this.tentarGerarPix(false); // Passa false para não mostrar spinner se já carregou os dados
            return;
          }
          this.iniciarTimer();
        }

        if (!pedido.pixQrCode && !pedido.pago && pedido.pagamentoOnline) {
          // Se não tem QR Code mas deveria ter, tenta gerar
          this.tentarGerarPix();
        } else {
          this.pixCopiaECola = pedido.pixCopiaECola || '';
          this.pixQrCodeBase64 = pedido.pixQrCode || '';
          this.totalPedido = pedido.valorTotal || 0;
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Erro ao carregar dados do PIX', err);
        this.loading = false;
        this.erroGeracao = true;
      }
    });
  }

  tentarGerarPix(showLoading: boolean = true): void {
    if (!this.pedidoId || this.loadingGeracao) return;
    
    if (this.timer) clearInterval(this.timer);
    if (showLoading) this.loading = true;
    this.loadingGeracao = true;

    this.pedidoService.gerarPix(this.pedidoId).subscribe({
      next: (pedido) => {
        this.pixCopiaECola = pedido.pixCopiaECola || '';
        this.pixQrCodeBase64 = pedido.pixQrCode || '';
        this.totalPedido = pedido.valorTotal || 0;
        if (pedido.dataExpiracaoPix) {
          this.dataExpiracao = new Date(pedido.dataExpiracaoPix);
          this.iniciarTimer();
        }
        this.loading = false;
        this.loadingGeracao = false;
        
        if (!this.pixQrCodeBase64) {
          this.erroGeracao = true;
        }
      },
      error: (err) => {
        console.error('Erro ao gerar PIX', err);
        this.loading = false;
        this.loadingGeracao = false;
        this.erroGeracao = true;
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
        this.tentarGerarPix(false); // Regera sem spinner silenciosamente
      } else {
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
        this.tempoRestante = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  copiarPix(): void {
    navigator.clipboard.writeText(this.pixCopiaECola).then(() => {
      alert('Código PIX copiado para a área de transferência!');
    });
  }

  irParaListagem(): void {
    this.router.navigate(['/pedidos']);
  }
}
