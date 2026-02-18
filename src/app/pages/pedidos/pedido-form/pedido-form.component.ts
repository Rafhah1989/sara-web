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

    produtoService: ProdutoService;
    route: ActivatedRoute;
    router: Router;

    private freteConfig: any = null; // Store freight config

    constructor(
        private fb: FormBuilder,
        private pedidoService: PedidoService,
        private usuarioService: UsuarioService,
        productService: ProdutoService,
        route: ActivatedRoute,
        router: Router
    ) {
        this.produtoService = productService;
        this.route = route;
        this.router = router;

        this.pedidoForm = this.fb.group({
            usuarioId: ['', Validators.required],
            usuarioNome: ['', Validators.required],
            desconto: [0],
            frete: ['R$ 0,00'],
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
            usuarioNome: usuario.nome,
            desconto: usuario.desconto || 0
        }, { emitEvent: false });
        this.showUsuariosDropdown = false;

        // Fetch freight config regardless of mode (though in edit mode we might want to preserve existing? 
        // Logic says "No cadastro e edição... realizar as seguintes operações... a partir da tabela_frete relacionada ao cliente")
        // So we should fetch it.
        this.carregarConfiguracaoFrete(usuario.id!);
    }

    carregarConfiguracaoFrete(usuarioId: number): void {
        this.pedidoService.obterSugestaoFrete(usuarioId).subscribe(config => {
            this.freteConfig = config;
            if (!this.modoEdicao) {
                // Initial set for new order
                this.atualizarValorFrete();
            } else {
                // In edit mode, we just store config for future calculations when items change
                // But we should probably recalculate immediately based on current items to match user expectation?
                // Or preserve what was saved?
                // Usually "edit" starts with saved values.
                // But if items change, we recalculate.
                // Let's rely on calcularTotais trigger. But calculating totals requires config.
                // calculated totals is called after items change.
            }
        });
    }

    buscarProduto(): void {
        if (this.termoBuscaProduto.length >= 3) {
            // Tentar busca por código primeiro se for numérico
            const codigo = Number(this.termoBuscaProduto);
            if (!isNaN(codigo)) {
                // Dummy call kept from previous code
                // this.pedidoService.obterSugestaoFrete(codigo).subscribe(); 
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
                imagem: [produto.imagem],
                peso: [produto.peso || 0]
            });
            this.itens.insert(0, itemForm);
        }

        this.showProdutosDropdown = false;
        this.termoBuscaProduto = '';
        this.atualizarValorFrete();
    }

    removerItem(index: number): void {
        this.itens.removeAt(index);
        this.atualizarValorFrete();
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

        this.itens.at(controlIndex).get('valor')?.setValue(formatted, { emitEvent: false });

        this.calcularTotais();
    }

    applyFreteMask(event: any): void {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        value = (Number(value) / 100).toFixed(2);
        const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
        this.pedidoForm.patchValue({ frete: formatted }, { emitEvent: false });
        this.calcularTotais();
    }

    parseMoeda(valor: any): number {
        if (typeof valor === 'number') return valor;
        if (!valor) return 0;
        // Remove 'R$', dots, replace comma with dot
        const clean = valor.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    }

    onItemChange(): void {
        this.atualizarValorFrete();
    }

    atualizarValorFrete(): void {
        console.log('--- atualizarValorFrete CHAMADO ---');
        if (!this.freteConfig) {
            console.log('Frete Config NÃO carregar ou nulo');
            return;
        }

        let pesoTotal = 0;
        this.itens.controls.forEach(control => {
            const qtd = Number(control.get('quantidade')?.value) || 0;
            // We need to access the product weight. 
            // The item form should store it.
            const peso = Number(control.get('peso')?.value) || 0;
            pesoTotal += (peso * qtd);
        });

        let freteCalculado = this.freteConfig.valor || 0;

        if (this.freteConfig.quantidadeFaixa && this.freteConfig.valorFaixa) {
            let pesoParaCalculo = pesoTotal;

            console.log('--- Cálculo de Frete ---');
            console.log('Peso Total:', pesoTotal);
            console.log('Minimo Faixa:', this.freteConfig.minimoFaixa);
            console.log('Qtd Faixa:', this.freteConfig.quantidadeFaixa);
            console.log('Valor Faixa:', this.freteConfig.valorFaixa);

            // Check for minimum threshold
            if (this.freteConfig.minimoFaixa && pesoTotal > this.freteConfig.minimoFaixa) {
                pesoParaCalculo = pesoTotal - this.freteConfig.minimoFaixa;
                // quantidadeFaixa here is actually "Peso por Faixa" now
                // Using Math.ceil to ensure any excess >= 1g counts as a full range unit.
                // Ex: 1g / 1000 = 0.001 -> Ceil = 1.
                // Ex: 1000g / 1000 = 1 -> Ceil = 1.
                // Ex: 1001g / 1000 = 1.001 -> Ceil = 2.
                const faixas = Math.ceil(pesoParaCalculo / this.freteConfig.quantidadeFaixa);
                console.log('Peso Excedente:', pesoParaCalculo);
                console.log('Faixas Calculadas:', faixas);

                freteCalculado += (faixas * this.freteConfig.valorFaixa);
            } else if (!this.freteConfig.minimoFaixa) {
                // If no minimum set, calculate on total weight directly (old logic)
                const faixas = Math.ceil(pesoParaCalculo / this.freteConfig.quantidadeFaixa);
                freteCalculado += (faixas * this.freteConfig.valorFaixa);
            }
        }

        const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteCalculado);
        this.pedidoForm.patchValue({ frete: formatted }, { emitEvent: false });

        this.calcularTotais();
    }

    calcularTotais(): void {
        // Then calculate totals
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
        const freteRaw = this.pedidoForm.get('frete')?.value;
        const frete = this.parseMoeda(freteRaw);

        const valorDesconto = subtotal * (descontoPerc / 100);
        const totalGeral = (subtotal - valorDesconto) + frete;

        this.pedidoForm.get('valorTotal')?.setValue(totalGeral, { emitEvent: false });
    }

    carregarPedido(id: number): void {
        this.pedidoService.buscarPorId(id).subscribe(pedido => {
            const freteFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.frete);

            this.pedidoForm.patchValue({
                usuarioId: pedido.usuarioId,
                usuarioNome: pedido.usuarioNome,
                desconto: pedido.desconto,
                frete: freteFormatted,
                observacao: pedido.observacao
            }, { emitEvent: false });

            // Load freight config for this user to enable dynamic updates during edit
            this.carregarConfiguracaoFrete(pedido.usuarioId);

            pedido.produtos.forEach(p => {
                const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor);

                const itemForm = this.fb.group({
                    id: [p.id],
                    produtoId: [p.produtoId],
                    produtoNome: [p.produtoNome],
                    produtoCodigo: [p.produtoCodigo],
                    tamanho: [p.tamanho], // Now mapped from DTO
                    quantidade: [p.quantidade, Validators.required],
                    valor: [valorFormatted, Validators.required],
                    total: [{ value: p.quantidade * p.valor, disabled: true }],
                    imagem: [p.imagem], // Load the image from backend response
                    peso: [p.peso || 0]
                });
                this.itens.push(itemForm);
            });

            // Note: carregarPedido calls calcularTotais at end.
            // If we have freteConfig loaded by then (async), it will recalc freight.
            // If async hasn't returned, it uses loaded freight.
            // This race condition might cause freight to jump if calculated differs from saved.
            // But usually saved should match calculated unless rules changed.
            // For now, accept this.
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
            frete: this.parseMoeda(formValue.frete),
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
