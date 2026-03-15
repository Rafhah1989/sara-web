import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Produto } from '../../models/produto.model';
import { ProdutoService } from '../../services/produto.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef;
  produtos: Produto[] = [];
  produtoAtual: Produto = this.getNovoProduto();
  filtroNome: string = '';
  modoEdicao: boolean = false;
  precoFMT: string = '';
  viewMode: 'grid' | 'list' = 'grid';

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
      next: (data) => {
        this.produtos = data.sort((a, b) => a.nome.localeCompare(b.nome));
      },
      error: (err) => console.error('Erro ao listar produtos', err)
    });
  }

  pesquisar(): void {
    if (this.filtroNome.trim()) {
      const termo = this.filtroNome.trim();
      const codigo = Number(termo);

      if (!isNaN(codigo)) {
        // Busca híbrida: tenta por código, se não achar (ou em paralelo), busca por nome
        this.produtoService.buscarPorCodigo(codigo).subscribe({
          next: (prod) => {
            if (prod) {
              this.produtos = [prod];
            } else {
              this.buscarPorNome(termo);
            }
          },
          error: () => this.buscarPorNome(termo)
        });
      } else {
        this.buscarPorNome(termo);
      }
    } else {
      this.carregarProdutos();
    }
  }

  private buscarPorNome(nome: string): void {
    this.produtoService.buscarPorNome(nome).subscribe({
      next: (data) => this.produtos = data,
      error: (err) => console.error('Erro ao pesquisar produtos', err)
    });
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

  alternarAtivo(produto: Produto): void {
    const novoStatus = !produto.ativo;
    const acao = novoStatus ? 'ativar' : 'inativar';
    if (confirm(`Deseja realmente ${acao} este produto?`)) {
      produto.ativo = novoStatus;
      if (produto.id) {
        this.produtoService.alterar(produto.id, produto).subscribe({
          next: () => this.carregarProdutos(),
          error: (err) => {
            console.error(`Erro ao ${acao} produto`, err);
            produto.ativo = !novoStatus; // Reverte em caso de erro
          }
        });
      }
    }
  }

  alternarVisualizacao(modo: 'grid' | 'list'): void {
    this.viewMode = modo;
  }

  cancelar(): void {
    this.finalizarAcao();
  }

  finalizarAcao(): void {
    this.produtoAtual = this.getNovoProduto();
    this.modoEdicao = false;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.produtoAtual.imagem = e.target.result;
        // Limpa o valor para permitir selecionar o mesmo arquivo novamente
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removerImagem(): void {
    this.produtoAtual.imagem = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
