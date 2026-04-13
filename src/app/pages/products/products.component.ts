import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Produto } from '../../models/produto.model';
import { ProdutoService } from '../../services/produto.service';
import { MessageService, ConfirmationService } from 'primeng/api';

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
  viewMode: 'grid' | 'list' = 'grid';
  exibirDialog: boolean = false;

  constructor(
    private produtoService: ProdutoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.carregarProdutos();
  }

  getNovoProduto(): Produto {
    return {
      nome: '',
      codigo: '',
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
      error: (err) => {
        console.error('Erro ao listar produtos', err);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os produtos.' });
      }
    });
  }

  pesquisar(): void {
    if (this.filtroNome.trim()) {
      const termo = this.filtroNome.trim();
      this.produtoService.buscarPorCodigo(termo).subscribe({
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
      this.carregarProdutos();
    }
  }

  onSearchChange(): void {
    const termo = this.filtroNome.trim();
    if (termo.length >= 3 || termo.length === 0) {
      this.pesquisar();
    }
  }

  private buscarPorNome(nome: string): void {
    this.produtoService.buscarPorNome(nome).subscribe({
      next: (data) => this.produtos = data,
      error: (err) => console.error('Erro ao pesquisar produtos', err)
    });
  }

  adicionarNovo(): void {
    this.produtoAtual = this.getNovoProduto();
    this.modoEdicao = false;
    this.exibirDialog = true;
  }

  salvar(): void {
    if (this.modoEdicao && this.produtoAtual.id) {
      this.produtoService.alterar(this.produtoAtual.id, this.produtoAtual).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Produto atualizado com sucesso!' });
          this.finalizarAcao();
          this.carregarProdutos();
        },
        error: (err) => {
          console.error('Erro ao alterar produto', err);
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao salvar alterações.' });
        }
      });
    } else {
      this.produtoService.adicionar(this.produtoAtual).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Produto cadastrado com sucesso!' });
          this.finalizarAcao();
          this.carregarProdutos();
        },
        error: (err) => {
          console.error('Erro ao adicionar produto', err);
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao cadastrar produto.' });
        }
      });
    }
  }

  editar(produto: Produto): void {
    this.produtoAtual = { ...produto };
    this.modoEdicao = true;
    this.exibirDialog = true;
  }

  alternarAtivo(produto: Produto): void {
    const novoStatus = !produto.ativo;
    const acao = novoStatus ? 'ativar' : 'inativar';
    
    this.confirmationService.confirm({
      message: `Deseja realmente ${acao} o produto <strong>${produto.nome}</strong>?`,
      header: 'Confirmação',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim',
      rejectLabel: 'Não',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        produto.ativo = novoStatus;
        if (produto.id) {
          this.produtoService.alterar(produto.id, produto).subscribe({
            next: () => {
              this.messageService.add({ severity: 'info', summary: 'Atualizado', detail: `Produto ${novoStatus ? 'ativado' : 'inativado'} com sucesso.` });
              this.carregarProdutos();
            },
            error: (err) => {
              console.error(`Erro ao ${acao} produto`, err);
              produto.ativo = !novoStatus; // Reverte em caso de erro
              this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível alterar o status.' });
            }
          });
        }
      }
    });
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
    this.exibirDialog = false;
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
        this.limparInputArquivo();
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  removerImagem(): void {
    this.produtoAtual.imagem = '';
    this.limparInputArquivo();
  }

  private limparInputArquivo(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
