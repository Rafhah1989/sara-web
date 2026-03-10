import { Component, OnInit } from '@angular/core';
import { Configuracao } from '../../models/configuracao.model';
import { ConfiguracaoService } from '../../services/configuracao.service';

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

  loading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(private configuracaoService: ConfiguracaoService) { }

  ngOnInit(): void {
    this.carregarConfiguracao();
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

  salvar(): void {
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const acao = this.config.id 
      ? this.configuracaoService.atualizar(this.config.id, this.config)
      : this.configuracaoService.salvar(this.config);

    acao.subscribe({
      next: (data) => {
        this.config = data;
        this.config.mailPassword = '';
        this.successMessage = 'Configurações salvas com sucesso!';
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Erro ao salvar configurações', err);
        this.errorMessage = 'Erro ao salvar configurações. Verifique os dados e tente novamente.';
        this.loading = false;
      }
    });
  }
}
