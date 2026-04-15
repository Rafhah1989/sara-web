import { Component, OnInit } from '@angular/core';
import { Configuracao } from '../../models/configuracao.model';
import { ConfiguracaoService } from '../../services/configuracao.service';
import { ConfiguracaoBoleto } from '../../models/configuracao-boleto.model';
import { ConfiguracaoBoletoService } from '../../services/configuracao-boleto.service';
import { MessageService } from 'primeng/api';

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

  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private configuracaoService: ConfiguracaoService,
    private configuracaoBoletoService: ConfiguracaoBoletoService,
    private messageService: MessageService
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
        }
      },
      error: (err) => {
        console.error('Erro ao carregar configurações de boleto', err);
      }
    });
  }

  salvar(): void {
    this.loading = true;
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
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Configurações salvas com sucesso!' });
            this.loading = false;
          },
          error: (err) => {
            console.error('Erro ao salvar configurações de boleto', err);
            this.messageService.add({ severity: 'warn', summary: 'Aviso', detail: 'Configurações de e-mail salvas, mas erro no boleto.' });
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Erro ao salvar configurações', err);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao salvar configurações do sistema.' });
        this.loading = false;
      }
    });
  }
}
