import { Component, OnInit } from '@angular/core';
import { Configuracao } from '../../models/configuracao.model';
import { ConfiguracaoService } from '../../services/configuracao.service';
import { ConfiguracaoBoleto } from '../../models/configuracao-boleto.model';
import { ConfiguracaoBoletoService } from '../../services/configuracao-boleto.service';

@Component({
  selector: 'app-configuracao',
  templateUrl: './configuracao.component.html',
  styleUrls: ['./configuracao.component.css']
})
export class ConfiguracaoComponent implements OnInit {

  config: Configuracao = {
    mailHost: 'smtp.gmail.com',
    mailPort: 587,
    mailUsername: '',
    mailPassword: '',
    mailAuth: true,
    mailStarttls: true,
    emailsNotificacao: '',
    emailAtivo: false
  };

  configBoleto: ConfiguracaoBoleto = {
    multaTipo: 'percentage',
    multaValor: 0,
    jurosTipo: 'percentage',
    jurosValor: 0,
    descontoTipo: 'percentage',
    descontoValor: 0,
    descontoDiasAntecedencia: 0
  };

  // Campos para exibição formatada (com vírgula)
  exibicaoMulta: string = '0,00';
  exibicaoJuros: string = '0,00';
  exibicaoDesconto: string = '0,00';

  loading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  // Toast Notification
  exibirToast: boolean = false;
  mensagemToast: string = '';
  toastTimeout: any;

  constructor(
    private configuracaoService: ConfiguracaoService,
    private configuracaoBoletoService: ConfiguracaoBoletoService
  ) { }

  ngOnInit(): void {
    this.carregarConfiguracao();
    this.carregarConfiguracaoBoleto();
  }

  carregarConfiguracao(): void {
    this.loading = true;
    this.configuracaoService.buscar().subscribe({
      next: (data) => {
        if (data) {
          this.config = data;
          // Não exibimos a senha por segurança, o usuário deve preencher se quiser alterar
          this.config.mailPassword = '';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar configurações', err);
        this.loading = false;
      }
    });
  }

  carregarConfiguracaoBoleto(): void {
    this.configuracaoBoletoService.buscar().subscribe({
      next: (data) => {
        if (data) {
          this.configBoleto = data;
          this.atualizarExibicaoBoleto();
        }
      },
      error: (err) => {
        console.error('Erro ao carregar configurações de boleto', err);
      }
    });
  }

  salvar(): void {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const acaoGeral = this.config.id 
      ? this.configuracaoService.atualizar(this.config.id, this.config)
      : this.configuracaoService.salvar(this.config);

    const acaoBoleto = this.configuracaoBoletoService.salvar(this.configBoleto);

    // Salva ambas as configurações
    acaoGeral.subscribe({
      next: (data) => {
        this.config = data;
        this.config.mailPassword = '';
        
        acaoBoleto.subscribe({
          next: (dataB) => {
            this.configBoleto = dataB;
            this.mostrarToast('Configurações salvas com sucesso!');
            this.loading = false;
          },
          error: (err) => {
            console.error('Erro ao salvar configurações de boleto', err);
            this.errorMessage = 'Configurações de e-mail salvas, mas erro ao salvar configurações de boleto.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Erro ao salvar configurações', err);
        this.errorMessage = 'Erro ao salvar configurações. Verifique os dados e tente novamente.';
        this.loading = false;
      }
    });
  }

  atualizarExibicaoBoleto(): void {
    this.exibicaoMulta = this.formatarParaBR(this.configBoleto.multaValor);
    this.exibicaoJuros = this.formatarParaBR(this.configBoleto.jurosValor);
    this.exibicaoDesconto = this.formatarParaBR(this.configBoleto.descontoValor);
  }

  formatarParaBR(valor: number): string {
    if (valor === undefined || valor === null) return '0,00';
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  processarInputDecimal(tipo: string): void {
    let valorStr = '';
    if (tipo === 'multa') valorStr = this.exibicaoMulta;
    else if (tipo === 'juros') valorStr = this.exibicaoJuros;
    else if (tipo === 'desconto') valorStr = this.exibicaoDesconto;

    // Remove tudo que não for dígito ou vírgula
    valorStr = valorStr.replace(/[^\d,]/g, '');
    
    // Converte vírgula para ponto para o processamento numérico
    const valorNumerico = parseFloat(valorStr.replace(',', '.'));

    if (!isNaN(valorNumerico)) {
      if (tipo === 'multa') {
        this.configBoleto.multaValor = valorNumerico;
        this.exibicaoMulta = this.formatarParaBR(valorNumerico);
      } else if (tipo === 'juros') {
        this.configBoleto.jurosValor = valorNumerico;
        this.exibicaoJuros = this.formatarParaBR(valorNumerico);
      } else if (tipo === 'desconto') {
        this.configBoleto.descontoValor = valorNumerico;
        this.exibicaoDesconto = this.formatarParaBR(valorNumerico);
      }
    } else {
      // Se for inválido, reseta para o valor anterior
      this.atualizarExibicaoBoleto();
    }
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
}
