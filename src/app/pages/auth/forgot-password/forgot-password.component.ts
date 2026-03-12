import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  cpfCnpj: string = '';
  loading: boolean = false;
  mensagem: string = '';
  sucesso: boolean = false;

  constructor(
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

  applyMask(event: any): void {
    let val = event.target.value.replace(/\D/g, '');
    if (val.length > 14) val = val.substring(0, 14);

    if (val.length <= 11) {
      val = val.replace(/(\d{3})(\d)/, '$1.$2');
      val = val.replace(/(\d{3})(\d)/, '$1.$2');
      val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      val = val.replace(/^(\d{2})(\d)/, '$1.$2');
      val = val.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      val = val.replace(/\.(\d{3})(\d)/, '.$1/$2');
      val = val.replace(/(\d{4})(\d)/, '$1-$2');
    }
    this.cpfCnpj = val;
    event.target.value = val;
  }

  enviar(): void {
    if (!this.cpfCnpj) return;

    this.loading = true;
    this.usuarioService.solicitarRecuperacaoSenha(this.cpfCnpj).subscribe({
      next: () => {
        this.exibirMensagemSucesso();
      },
      error: () => {
        // Sempre mostra sucesso para evitar enumeração de usuários
        this.exibirMensagemSucesso();
      }
    });
  }

  private exibirMensagemSucesso(): void {
    this.loading = false;
    this.sucesso = true;
    this.mensagem = 'Se o CPF/CNPJ estiver cadastrado, um link de recuperação foi enviado para o e-mail correspondente.';
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 5000);
  }
}
