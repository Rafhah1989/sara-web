import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string = '';
  usuario?: Usuario;
  loading: boolean = true;
  tokenExpirado: boolean = false;
  sucesso: boolean = false;
  erroMsg: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService
  ) {
    this.resetForm = this.fb.group({
      novaSenha: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      confirmarSenha: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.erroMsg = 'Token não fornecido.';
      this.loading = false;
      return;
    }

    this.usuarioService.validarToken(this.token).subscribe({
      next: (user) => {
        this.usuario = user;
        this.loading = false;
      },
      error: (err) => {
        this.tokenExpirado = true;
        this.loading = false;
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('novaSenha')?.value === g.get('confirmarSenha')?.value
      ? null : { mismatch: true };
  }

  salvar(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const request = {
      token: this.token,
      novaSenha: this.resetForm.get('novaSenha')?.value
    };

    this.usuarioService.redefinirSenha(request).subscribe({
      next: () => {
        this.sucesso = true;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => this.erroMsg = err.error || 'Erro ao alterar senha.'
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.resetForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
