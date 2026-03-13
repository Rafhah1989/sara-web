import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PedidoService } from '../../../services/pedido.service';

@Component({
  selector: 'app-pix-payment',
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.css']
})
export class PixPaymentComponent implements OnInit {
  pedidoId: number | null = null;
  pixCopiaECola: string = '';
  pixQrCodeBase64: string = '';
  loading: boolean = true;
  totalPedido: number = 0;
  erroGeracao: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pedidoService: PedidoService
  ) {}

  ngOnInit(): void {
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

  tentarGerarPix(): void {
    if (!this.pedidoId) return;
    this.pedidoService.gerarPix(this.pedidoId).subscribe({
      next: (pedido) => {
        this.pixCopiaECola = pedido.pixCopiaECola || '';
        this.pixQrCodeBase64 = pedido.pixQrCode || '';
        this.totalPedido = pedido.valorTotal || 0;
        this.loading = false;
        
        if (!this.pixQrCodeBase64) {
          this.erroGeracao = true;
        }
      },
      error: (err) => {
        console.error('Erro ao gerar PIX', err);
        this.loading = false;
        this.erroGeracao = true;
      }
    });
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
