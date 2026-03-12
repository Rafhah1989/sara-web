import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  returnUrl: string = '/';
  showSenha = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // Redireciona se já estiver logado
    if (this.authService.isAutenticado()) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      cpfCnpj: ['', [Validators.required]],
      senha: ['', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  get f() { return this.loginForm.controls; }

  // Máscara simples p/ CPF ou CNPJ no template
  applyMask(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    this.loginForm.controls['cpfCnpj'].setValue(value, { emitEvent: false });
    // O backend espera apenas numeros, limparemos na hora de enviar
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const cleanCpfCnpj = this.loginForm.value.cpfCnpj.replace(/\D/g, ''); // Envia limpo
    
    this.authService.login({ cpfCnpj: cleanCpfCnpj, senha: this.loginForm.value.senha })
      .subscribe({
        next: () => {
          this.router.navigate([this.returnUrl]);
        },
        error: error => {
          this.error = error.status === 401 || error.status === 403 
            ? 'Usuário invalido, inativo ou senha incorreta.' 
            : 'Erro ao conectar-se ao servidor.';
          this.loading = false;
        }
      });
  }
}
