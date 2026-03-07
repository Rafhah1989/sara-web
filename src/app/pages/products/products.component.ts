import { Component, OnInit } from '@angular/core';
import { Produto } from '../../models/produto.model';
import { ProdutoService } from '../../services/produto.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

  produtos: Produto[] = [];
  produtoAtual: Produto = this.getNovoProduto();
  filtroNome: string = '';
  modoEdicao: boolean = false;
  precoFMT: string = '';

  constructor(private produtoService: ProdutoService) { }

  ngOnInit(): void {
    this.carregarProdutos();
  }

  getNovoProduto(): Produto {
    this.precoFMT = '';
    return {
      nome: '',
      codigo: 0,
      tamanho: 0,
      peso: 0,
      preco: undefined,
      ativo: true,
      imagem: ''
    };
  }

  carregarProdutos(): void {
    this.produtoService.listarTodos().subscribe({
      next: (data) => this.produtos = data,
      error: (err) => console.error('Erro ao listar produtos', err)
    });
  }

  pesquisar(): void {
    if (this.filtroNome.trim()) {
      this.produtoService.buscarPorNome(this.filtroNome).subscribe({
        next: (data) => this.produtos = data,
        error: (err) => console.error('Erro ao pesquisar produtos', err)
      });
    } else {
      this.carregarProdutos();
    }
  }

  applyCurrencyMask(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value === '') {
      this.precoFMT = '';
      this.produtoAtual.preco = undefined;
      return;
    }
    let numeric = (Number(value) / 100).toFixed(2);
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(numeric));
    this.precoFMT = formatted;
    this.produtoAtual.preco = Number(numeric);
  }

  salvar(): void {
    if (this.modoEdicao && this.produtoAtual.id) {
      this.produtoService.alterar(this.produtoAtual.id, this.produtoAtual).subscribe({
        next: () => {
          this.finalizarAcao();
          this.carregarProdutos();
        },
        error: (err) => console.error('Erro ao alterar produto', err)
      });
    } else {
      this.produtoService.adicionar(this.produtoAtual).subscribe({
        next: () => {
          this.finalizarAcao();
          this.carregarProdutos();
        },
        error: (err) => console.error('Erro ao adicionar produto', err)
      });
    }
  }

  editar(produto: Produto): void {
    this.produtoAtual = { ...produto };
    this.modoEdicao = true;
    if (this.produtoAtual.preco != null) {
      this.precoFMT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.produtoAtual.preco);
    } else {
      this.precoFMT = '';
    }
    window.scrollTo(0, 0);
  }

  excluir(id?: number): void {
    if (id && confirm('Tem certeza que deseja excluir este produto?')) {
      this.produtoService.excluir(id).subscribe({
        next: () => this.carregarProdutos(),
        error: (err) => console.error('Erro ao excluir produto', err)
      });
    }
  }

  cancelar(): void {
    this.finalizarAcao();
  }

  finalizarAcao(): void {
    this.produtoAtual = this.getNovoProduto();
    this.modoEdicao = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.produtoAtual.imagem = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
}
