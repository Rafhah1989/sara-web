import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Produto } from '../../models/produto.model';
import { ProdutoService } from '../../services/produto.service';
import { CarrinhoService } from '../../services/carrinho.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-loja',
  templateUrl: './loja.component.html',
  styleUrls: ['./loja.component.css']
})
export class LojaComponent implements OnInit {

  produtos: Produto[] = [];
  filtroNome: string = '';
  filtroTamanho?: number;
  filtroPrecoMin?: number;
  filtroPrecoMax?: number;
  filtroPrecoMinFMT: string = '';
  filtroPrecoMaxFMT: string = '';

  quantidades: { [produtoId: number]: number } = {};
  nomeSubject = new Subject<string>();

  // Modal Attributes
  exibirModalSugestao: boolean = false;
  produtoOriginalSelecionado?: Produto;
  sugestoesTamanhos: Produto[] = [];
  quantidadesSugestao: { [produtoId: number]: number } = {};

  // Toast Notification
  exibirToast: boolean = false;
  mensagemToast: string = '';
  toastTimeout: any;

  constructor(
    private produtoService: ProdutoService,
    private carrinhoService: CarrinhoService,
    private authService: AuthService
  ) {
    this.nomeSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(nome => {
      this.filtroNome = nome;
      if (nome.length >= 3 || nome.length === 0) {
        this.pesquisar();
      }
    });
  }

  ngOnInit(): void {
    this.pesquisar();
  }

  onNomeChange(event: any): void {
    this.nomeSubject.next(event.target.value);
  }

  applyCurrencyMask(event: any, type: 'min' | 'max'): void {
    let value = event.target.value;
    value = value.replace(/\D/g, '');
    if (value) {
        const numberValue = parseInt(value, 10) / 100;
        const formatted = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numberValue);
        
        if (type === 'min') {
            this.filtroPrecoMinFMT = formatted;
            this.filtroPrecoMin = this.parseMoeda(formatted);
        } else {
            this.filtroPrecoMaxFMT = formatted;
            this.filtroPrecoMax = this.parseMoeda(formatted);
        }
    } else {
        if (type === 'min') {
            this.filtroPrecoMinFMT = '';
            this.filtroPrecoMin = undefined;
        } else {
            this.filtroPrecoMaxFMT = '';
            this.filtroPrecoMax = undefined;
        }
    }
    this.pesquisar();
  }

  parseMoeda(valor: string | undefined): number | undefined {
      if (!valor) return undefined;
      const cleanValue = valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? undefined : parsed;
  }

  pesquisar(): void {
    const nomeBusca = this.filtroNome.length >= 3 ? this.filtroNome : undefined;
    this.produtoService.buscarParaLoja(
      nomeBusca, 
      this.filtroTamanho, 
      this.filtroPrecoMin, 
      this.filtroPrecoMax
    ).subscribe({
      next: (data) => {
        this.produtos = data;
        this.produtos.forEach(p => {
          if (!this.quantidades[p.id!]) {
            this.quantidades[p.id!] = 1;
          }
        });
      },
      error: (err) => console.error('Erro ao buscar produtos da loja', err)
    });
  }

  limparFiltros(): void {
    this.filtroNome = '';
    this.filtroTamanho = undefined;
    this.filtroPrecoMin = undefined;
    this.filtroPrecoMax = undefined;
    this.filtroPrecoMinFMT = '';
    this.filtroPrecoMaxFMT = '';
    this.pesquisar();
  }

  adicionarAoCarrinho(produto: Produto): void {
    const usuarioId = this.authService.getUsuarioIdDoToken();
    if (!usuarioId) {
       alert("Sessão inválida ou expirada. Faça login novamente.");
       return;
    }
    
    // Check for other sizes before adding
    this.produtoService.buscarOutrosTamanhos(produto.id!).subscribe({
        next: (outros) => {
            if (outros && outros.length > 0) {
                this.produtoOriginalSelecionado = produto;
                // Ordenar as sugestões de forma decrescente pelo tamanho
                outros.sort((a, b) => (b.tamanho || 0) - (a.tamanho || 0));
                
                this.sugestoesTamanhos = outros;
                // Initialize suggestion quantities to 0
                this.sugestoesTamanhos.forEach(s => this.quantidadesSugestao[s.id!] = 0);
                this.exibirModalSugestao = true;
            } else {
                // Se não houver outros tamanhos, segue adição normal
                this.processarAdicaoUnitaria(usuarioId, produto, this.quantidades[produto.id!] || 1).subscribe();
            }
        },
        error: (err) => {
            // Em caso de erro na checagem, tenta salvar só ele pra não bloquear o usuario
            this.processarAdicaoUnitaria(usuarioId, produto, this.quantidades[produto.id!] || 1).subscribe();
        }
    });
  }

  processarAdicaoUnitaria(usuarioId: number, produto: Produto, qtd: number): Observable<any> {
      return new Observable(observer => {
          this.carrinhoService.adicionar({
            usuarioId: usuarioId,
            produtoId: produto.id!,
            quantidade: qtd
          }).subscribe({
            next: (res) => {
              if (observer.closed) return;
              this.mostrarToast('Carrinho atualizado');
              observer.next(res);
              observer.complete();
            },
            error: (err) => {
              if (err.error && typeof err.error === 'string' && err.error.includes("já está no carrinho")) {
                 // Directly update quantity instead of asking
                 this.carrinhoService.atualizarQuantidade(usuarioId, produto.id!, {
                     usuarioId: usuarioId,
                     produtoId: produto.id!,
                     quantidade: qtd
                 }).subscribe(() => {
                     this.mostrarToast('Carrinho atualizado');
                     observer.next(null);
                     observer.complete();
                 });
              } else {
                this.mostrarToast(`Erro ao adicionar ${produto.nome}.`);
                observer.error(err);
              }
            }
          });
      });
  }

  // Ações da Modal de Sugestões
  getTamanhoImagemPx(tamanho: number | undefined): number {
      const BASE_SIZE = 195; // 150px original + 30%
      if (!tamanho || this.sugestoesTamanhos.length === 0) return BASE_SIZE;
      
      const maxTamanho = this.sugestoesTamanhos[0].tamanho || 0;
      const diferenca = maxTamanho - tamanho;
      
      if (diferenca <= 0) return BASE_SIZE;

      // 3% a menos para cada 1cm de diferença
      const percentualReducao = (diferenca * 3) / 100;
      const escala = Math.max(0.2, 1 - percentualReducao); // Limita mínimo a 20%
      
      return BASE_SIZE * escala;
  }

  fecharModalSugestao(): void {
      this.exibirModalSugestao = false;
  }

  adicionarApenasOriginal(): void {
      if (this.produtoOriginalSelecionado) {
          const usuarioId = this.authService.getUsuarioIdDoToken();
          if (usuarioId) {
             this.processarAdicaoUnitaria(usuarioId, this.produtoOriginalSelecionado, this.quantidades[this.produtoOriginalSelecionado.id!] || 1)
                 .subscribe(() => this.fecharModalSugestao());
          }
      }
  }

  adicionarComSugestoes(): void {
      if (!this.produtoOriginalSelecionado) return;
      const usuarioId = this.authService.getUsuarioIdDoToken();
      if (!usuarioId) return;

      const adicoes = [];
      const qtdOriginal = this.quantidades[this.produtoOriginalSelecionado.id!] || 1;
      
      // Request do original modificado para retornar nulo on erro para não travar forkjoin
      const requisicaoOriginal = this.processarAdicaoUnitaria(usuarioId, this.produtoOriginalSelecionado, qtdOriginal)
          .pipe(catchError(e => of(null)));
      adicoes.push(requisicaoOriginal);

      // Requests das sugestoes > 0
      this.sugestoesTamanhos.forEach(sugestao => {
          const qtdSugestao = this.quantidadesSugestao[sugestao.id!];
          if (qtdSugestao > 0) {
              const req = this.processarAdicaoUnitaria(usuarioId, sugestao, qtdSugestao)
                  .pipe(catchError(e => of(null)));
              adicoes.push(req);
          }
      });

      forkJoin(adicoes).subscribe(() => {
          this.mostrarToast('Carrinho atualizado');
          this.fecharModalSugestao();
      });
  }

  mostrarToast(mensagem: string): void {
      this.mensagemToast = mensagem;
      this.exibirToast = true;
      
      if (this.toastTimeout) {
          clearTimeout(this.toastTimeout);
      }
      
      this.toastTimeout = setTimeout(() => {
          this.exibirToast = false;
      }, 3000);
  }
}
