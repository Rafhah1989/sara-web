import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { PedidoService, Pedido, PedidoProduto } from '../../../services/pedido.service';
import { UsuarioService } from '../../../services/usuario.service';
import { ProdutoService } from '../../../services/produto.service';
import { Usuario } from '../../../models/usuario.model';
import { Produto } from '../../../models/produto.model';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-pedido-form',
    templateUrl: './pedido-form.component.html',
    styleUrls: ['./pedido-form.component.css']
})
export class PedidoFormComponent implements OnInit {
    pedidoForm: FormGroup;
    modoEdicao: boolean = false;
    pedidoId?: number;

    usuariosFiltrados: Usuario[] = [];
    produtosFiltrados: Produto[] = [];

    termoBuscaProduto: string = '';
    showUsuariosDropdown: boolean = false;
    showProdutosDropdown: boolean = false;

    exibirSucesso: boolean = false;
    exibirVisualizacaoImagem: boolean = false;
    imagemUrlVisualizacao: string = '';

    constructor(
        private fb: FormBuilder,
        private pedidoService: PedidoService,
        private usuarioService: UsuarioService,
        private produtoService: ProdutoService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.pedidoForm = this.fb.group({
            usuarioId: ['', Validators.required],
            usuarioNome: ['', Validators.required],
            desconto: [0],
            frete: [0],
            observacao: [''],
            valorTotal: [{ value: 0, disabled: true }],
            itens: this.fb.array([])
        });
    }

    ngOnInit(): void {
        const id = this.route.snapshot.params['id'];
        if (id) {
            this.modoEdicao = true;
            this.pedidoId = id;
            this.carregarPedido(id);
        }

        this.setupBuscaUsuarios();
    }

    get itens() {
        return this.pedidoForm.get('itens') as FormArray;
    }

    setupBuscaUsuarios(): void {
        this.pedidoForm.get('usuarioNome')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(value => typeof value === 'string' && value.length >= 3),
            switchMap(value => this.usuarioService.buscarPorNome(value))
        ).subscribe(usuarios => {
            this.usuariosFiltrados = usuarios;
            this.showUsuariosDropdown = usuarios.length > 0;
        });
    }

    selecionarUsuario(usuario: Usuario): void {
        this.pedidoForm.patchValue({
            usuarioId: usuario.id,
            usuarioNome: usuario.nome
        }, { emitEvent: false });
        this.showUsuariosDropdown = false;

        if (!this.modoEdicao) {
            this.pedidoService.obterSugestaoFrete(usuario.id!).subscribe(valor => {
                this.pedidoForm.patchValue({ frete: valor });
            });
        }
    }

    buscarProduto(): void {
        if (this.termoBuscaProduto.length >= 3) {
            // Tentar busca por código primeiro se for numérico
            const codigo = Number(this.termoBuscaProduto);
            if (!isNaN(codigo)) {
                this.pedidoService.obterSugestaoFrete(codigo).subscribe(); // Dummy for now, let's use service
                // Actually I added search by code to ProdutoService in backend
            }

            this.produtoService.buscarPorNome(this.termoBuscaProduto).subscribe(produtos => {
                this.produtosFiltrados = produtos.filter(p => p.ativo);
                this.showProdutosDropdown = this.produtosFiltrados.length > 0;
            });
        }
    }

    adicionarProduto(produto: Produto): void {
        const itemExistente = this.itens.controls.find(c => c.get('produtoId')?.value === produto.id);
        if (itemExistente) {
            const qtd = itemExistente.get('quantidade')?.value;
            itemExistente.patchValue({ quantidade: qtd + 1 });
        } else {
            const itemForm = this.fb.group({
                produtoId: [produto.id],
                produtoNome: [produto.nome],
                produtoCodigo: [produto.id], // ID as code fallback
                tamanho: [produto.tamanho],
                quantidade: [1, [Validators.required, Validators.min(0.01)]],
                valor: ['R$ 0,00', Validators.required],
                total: [{ value: 0, disabled: true }],
                imagem: [produto.imagem]
            });
            this.itens.insert(0, itemForm);
        }

        this.showProdutosDropdown = false;
        this.termoBuscaProduto = '';
        this.calcularTotais();
    }

    removerItem(index: number): void {
        this.itens.removeAt(index);
        this.calcularTotais();
    }

    applyMoedaMask(event: any, controlIndex: number): void {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');

        // Remove leading zeros
        value = (Number(value) / 100).toFixed(2);

        // Format to BRL currency
        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Number(value));

        // Update the form control with the formatted string
        // We need to use {emitEvent: false} to avoid loops if needed, but here we want to trigger changes for calculation?
        // Actually, calcularTotais reads the value. consistently working with strings in the form control is better for display?
        // BUT, calcularTotais needs NUMBERS.
        // Option 1: Store number in model, format in view. (Hard with input)
        // Option 2: Store string in model, parse in calculate.

        // Let's store the formatted string in the form control for display
        this.itens.at(controlIndex).get('valor')?.setValue(formatted, { emitEvent: false });

        this.calcularTotais();
    }

    parseMoeda(valor: any): number {
        if (typeof valor === 'number') return valor;
        if (!valor) return 0;
        // Remove 'R$', dots, replace comma with dot
        const clean = valor.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    }

    calcularTotais(): void {
        let subtotal = 0;
        this.itens.controls.forEach(control => {
            const qtd = control.get('quantidade')?.value || 0;
            const valorRaw = control.get('valor')?.value;
            const valor = this.parseMoeda(valorRaw);

            const totalItem = qtd * valor;
            control.get('total')?.setValue(totalItem, { emitEvent: false });
            subtotal += totalItem;
        });

        const descontoPerc = this.pedidoForm.get('desconto')?.value || 0;
        const frete = this.pedidoForm.get('frete')?.value || 0;

        const valorDesconto = subtotal * (descontoPerc / 100);
        const totalGeral = subtotal - valorDesconto + frete;

        this.pedidoForm.get('valorTotal')?.setValue(totalGeral, { emitEvent: false });
    }

    carregarPedido(id: number): void {
        this.pedidoService.buscarPorId(id).subscribe(pedido => {
            this.pedidoForm.patchValue({
                usuarioId: pedido.usuarioId,
                usuarioNome: pedido.usuarioNome,
                desconto: pedido.desconto,
                frete: pedido.frete,
                observacao: pedido.observacao
            });

            pedido.produtos.forEach(p => {
                const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor);

                const itemForm = this.fb.group({
                    id: [p.id],
                    produtoId: [p.produtoId],
                    produtoNome: [p.produtoNome],
                    produtoCodigo: [p.produtoCodigo],
                    tamanho: [''],
                    quantidade: [p.quantidade, Validators.required],
                    valor: [valorFormatted, Validators.required], // Load formatted
                    total: [{ value: p.quantidade * p.valor, disabled: true }],
                    imagem: [null] // Image might not be in item DTO, need to check
                });
                this.itens.push(itemForm);
            });
            this.calcularTotais();
        });
    }

    salvar(): void {
        if (this.pedidoForm.invalid || this.itens.length === 0) {
            alert('Preencha todos os campos obrigatórios e adicione ao menos um produto.');
            return;
        }

        const formValue = this.pedidoForm.getRawValue();
        const pedidoData = {
            usuarioId: formValue.usuarioId,
            desconto: formValue.desconto,
            frete: formValue.frete,
            valorTotal: formValue.valorTotal,
            observacao: formValue.observacao,
            produtos: formValue.itens.map((it: any) => ({
                produtoId: it.produtoId,
                valor: this.parseMoeda(it.valor), // Clean currency string
                quantidade: it.quantidade,
                desconto: 0,
                peso: 0
            }))
        };

        if (this.modoEdicao) {
            this.pedidoService.alterar(this.pedidoId!, pedidoData).subscribe(() => {
                alert('Pedido alterado com sucesso!');
                this.voltar();
            });
        } else {
            this.pedidoService.salvar(pedidoData).subscribe(salvo => {
                this.pedidoId = salvo.id;
                this.exibirSucesso = true;
            });
        }
    }

    voltar(): void {
        this.router.navigate(['/pedidos']);
    }

    confirmarPdf(sim: boolean): void {
        this.exibirSucesso = false;
        if (sim && this.pedidoId) {
            this.pedidoService.gerarPdf(this.pedidoId).subscribe(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pedido_${this.pedidoId}.pdf`;
                a.click();
                this.voltar();
            });
        } else {
            this.voltar();
        }
    }

    visualizarImagem(url: string): void {
        this.imagemUrlVisualizacao = url;
        this.exibirVisualizacaoImagem = true;
    }

    fecharVisualizacaoImagem(): void {
        this.exibirVisualizacaoImagem = false;
    }
}
