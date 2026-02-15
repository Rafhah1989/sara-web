import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsuarioService } from '../../services/usuario.service';
import { SetorService } from '../../services/setor.service';
import { FreteService } from '../../services/frete.service';
import { Usuario, Role } from '../../models/usuario.model';
import { Setor } from '../../models/setor.model';
import { Frete } from '../../models/frete.model';

@Component({
    selector: 'app-usuarios',
    templateUrl: './usuarios.component.html',
    styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
    userForm: FormGroup;
    users: Usuario[] = [];
    setoresAtivos: Setor[] = [];
    tabelasFreteFiltradas: Frete[] = [];
    filtroNome: string = '';
    modoEdicao: boolean = false;
    usuarioIdEmEdicao?: number;

    showSenha: boolean = false;
    showConfirmSenha: boolean = false;

    roles = Object.values(Role);
    formasPagamento = [{ id: 'PIX', descricao: 'PIX' }, { id: 'DINHEIRO', descricao: 'Dinheiro' }];
    ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

    constructor(
        private fb: FormBuilder,
        private usuarioService: UsuarioService,
        private setorService: SetorService,
        private freteService: FreteService
    ) {
        this.userForm = this.fb.group({
            nome: ['', [Validators.required, Validators.maxLength(100)]],
            cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
            endereco: [''],
            bairro: ['', Validators.required],
            numero: [''],
            cidade: ['', Validators.required],
            uf: ['', [Validators.required, Validators.maxLength(2)]],
            cpfCnpj: ['', [Validators.required]],
            telefone: ['', [Validators.required]],
            observacao: [''],
            padre: [''],
            secretario: [''],
            tesoureiro: [''],
            formaPagamento: [''],
            desconto: [0],
            modalidadeEntrega: [''],
            setorId: [''],
            tabelaFreteId: [''],
            role: [Role.CLIENTE, Validators.required],
            senha: ['', [Validators.pattern(/^\d{6}$/)]],
            confirmarSenha: ['']
        }, { validator: this.passwordMatchValidator });
    }

    ngOnInit(): void {
        this.carregarUsuarios();
        this.carregarSetores();
    }

    carregarSetores(): void {
        this.setorService.listarTodos().subscribe({
            next: (data) => this.setoresAtivos = data.filter(s => s.ativo),
            error: (err) => console.error('Erro ao listar setores', err)
        });
    }

    onSetorChange(keepValue: boolean = false): void {
        const setorId = this.userForm.get('setorId')?.value;
        const currentTabelaId = this.userForm.get('tabelaFreteId')?.value;

        this.tabelasFreteFiltradas = [];
        if (!keepValue) {
            this.userForm.get('tabelaFreteId')?.setValue('');
        }

        if (setorId) {
            this.setorService.buscarPorId(Number(setorId)).subscribe({
                next: (setor) => {
                    this.tabelasFreteFiltradas = setor.tabelasFrete?.filter(f => f.ativo) || [];

                    // Se estivermos editando e o valor atual não estiver na lista (divergência), buscamos ele
                    if (keepValue && currentTabelaId) {
                        const exists = this.tabelasFreteFiltradas.some(f => f.id === Number(currentTabelaId));
                        if (!exists) {
                            this.freteService.buscarPorId(Number(currentTabelaId)).subscribe({
                                next: (frete) => {
                                    this.tabelasFreteFiltradas.push(frete);
                                }
                            });
                        }
                    }
                },
                error: (err) => console.error('Erro ao carregar tabelas do setor', err)
            });
        }
    }

    passwordMatchValidator(g: FormGroup) {
        const senha = g.get('senha')?.value;
        const confirmarSenha = g.get('confirmarSenha')?.value;
        return senha === confirmarSenha ? null : { mismatch: true };
    }

    carregarUsuarios(): void {
        this.usuarioService.listarTodos().subscribe({
            next: (data) => this.users = data,
            error: (err) => console.error('Erro ao listar usuários', err)
        });
    }

    pesquisar(): void {
        if (this.filtroNome.trim()) {
            this.usuarioService.buscarPorNome(this.filtroNome).subscribe({
                next: (data) => this.users = data,
                error: (err) => console.error('Erro ao pesquisar usuários', err)
            });
        } else {
            this.carregarUsuarios();
        }
    }

    buscarCep(): void {
        const cep = this.userForm.get('cep')?.value;
        if (cep && cep.length === 8) {
            this.usuarioService.buscarCep(cep).subscribe({
                next: (data) => {
                    if (!data.erro) {
                        this.userForm.patchValue({
                            endereco: data.logradouro,
                            bairro: data.bairro,
                            cidade: data.localidade,
                            uf: data.uf
                        });
                    }
                }
            });
        }
    }

    applyCpfCnpjMask(event: any): void {
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
        this.userForm.get('cpfCnpj')?.setValue(val, { emitEvent: false });
    }

    applyTelefoneMask(event: any): void {
        let val = event.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.substring(0, 11);

        if (val.length > 2) {
            val = '(' + val.substring(0, 2) + ') ' + val.substring(2);
        }
        if (val.length > 9) {
            val = val.substring(0, 10) + '-' + val.substring(10);
        }
        this.userForm.get('telefone')?.setValue(val, { emitEvent: false });
    }

    applyPercentualMask(event: any): void {
        let val = event.target.value.replace(/\D/g, '');
        if (val === '') {
            this.userForm.get('desconto')?.setValue(0, { emitEvent: false });
            return;
        }
        let num = (parseFloat(val) / 100).toFixed(2);
        this.userForm.get('desconto')?.setValue(num, { emitEvent: false });
    }

    salvar(): void {
        const senha = this.userForm.get('senha')?.value;
        const confirmarSenha = this.userForm.get('confirmarSenha')?.value;

        // Regra customizada de senha
        if (!this.modoEdicao) {
            if (!senha || senha.length !== 6 || senha !== confirmarSenha) {
                alert('Por favor, informe a senha');
                this.userForm.get('senha')?.markAsTouched();
                this.userForm.get('confirmarSenha')?.markAsTouched();
                return;
            }
        } else {
            // Na edição, se preencher um, tem que preencher o outro e bater
            if (senha || confirmarSenha) {
                if (senha !== confirmarSenha || (senha && senha.length !== 6)) {
                    alert('Por favor, informe a senha');
                    return;
                }
            }
        }

        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        const rawData = this.userForm.value;
        const usuario: Usuario = {
            ...rawData,
            cep: rawData.cep.replace(/\D/g, ''),
            cpfCnpj: rawData.cpfCnpj.replace(/\D/g, ''),
            telefone: rawData.telefone,
            senha: senha || undefined // Se vazio na edição, não envia
        };

        if (this.modoEdicao && this.usuarioIdEmEdicao) {
            this.usuarioService.alterar(this.usuarioIdEmEdicao, usuario).subscribe({
                next: () => this.finalizarAcao(),
                error: (err) => alert(err.error || 'Erro ao alterar usuário')
            });
        } else {
            this.usuarioService.criar(usuario).subscribe({
                next: () => this.finalizarAcao(),
                error: (err) => alert(err.error || 'Erro ao criar usuário')
            });
        }
    }

    editar(user: Usuario): void {
        this.modoEdicao = true;
        this.usuarioIdEmEdicao = user.id;
        this.userForm.patchValue({
            ...user,
            senha: '',
            confirmarSenha: ''
        });
        this.onSetorChange(true);
        window.scrollTo(0, 0);
    }

    desativar(id?: number): void {
        if (id && confirm('Tem certeza que deseja desativar este usuário?')) {
            this.usuarioService.desativar(id).subscribe({
                next: () => this.carregarUsuarios(),
                error: (err) => console.error('Erro ao desativar usuário', err)
            });
        }
    }

    ativar(id?: number): void {
        if (id) {
            this.usuarioService.ativar(id).subscribe({
                next: () => this.carregarUsuarios(),
                error: (err) => console.error('Erro ao ativar usuário', err)
            });
        }
    }

    finalizarAcao(): void {
        this.userForm.reset({ role: Role.CLIENTE });
        this.modoEdicao = false;
        this.usuarioIdEmEdicao = undefined;
        this.carregarUsuarios();
    }

    isInvalid(controlName: string): boolean {
        const control = this.userForm.get(controlName);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }
}
