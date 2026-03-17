import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
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
export class LojaComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('infinitoSentinel') sentinel!: ElementRef;
  private observer!: IntersectionObserver;

  produtos: Produto[] = [];
  filtroNome: string = '';
  filtroTamanho?: number;
  filtroPrecoMin?: number;
  filtroPrecoMax?: number;
  filtroPrecoMinFMT: string = '';
  filtroPrecoMaxFMT: string = '';

  ordenacao: 'nome' | 'tamanho' | 'preco' = 'nome';
  itensPorLinha: 3 | 4 | 5 = 3;

  // Pagination
  paginaAtual: number = 0;
  tamanhoPagina: number = 30;
  carregando: boolean = false;
  fimDosProdutos: boolean = false;
  private loadingTimeout: any;
  private searchSubscription?: Subscription;

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

  // Image Visualization Modal
  exibirVisualizacaoImagem: boolean = false;
  imagemUrlVisualizacao: string = '';

  // Mobile Filters
  exibirFiltrosMobile: boolean = false;

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

  ngAfterViewInit(): void {
    // Carregamento agora é progressivo automático disparado pelo ngOnInit -> pesquisar()
  }

  ngOnDestroy(): void {
    // Observer removido
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

  ordenarProdutos(): void {
    // Agora a ordenação é feita pelo Backend para abranger todo o catálogo
    this.pesquisar(true);
  }

  pesquisar(novaBusca: boolean = true): void {
    if (this.carregando && !novaBusca) return; // Permitir disparar próxima se for progresso
    
    if (novaBusca) {
      // Cancelar requisição em andamento se for uma nova busca (evita race condition)
      if (this.searchSubscription) {
        this.searchSubscription.unsubscribe();
      }

      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
      }
      this.paginaAtual = 0;
      this.produtos = [];
      this.fimDosProdutos = false;
      this.carregando = true; // Forçar carregamento inicial
    }

    if (this.fimDosProdutos) {
       this.carregando = false;
       return;
    }

    // Se já estiver carregando uma página de progresso, não duplica
    if (this.carregando && !novaBusca) return;

    this.carregando = true;
    const nomeBusca = this.filtroNome.length >= 3 ? this.filtroNome : undefined;
    const currentSort = this.ordenacao; // Fixa a ordenação para este ciclo
    
    this.searchSubscription = this.produtoService.buscarParaLoja(
      nomeBusca, 
      this.filtroTamanho, 
      this.filtroPrecoMin, 
      this.filtroPrecoMax,
      this.paginaAtual,
      this.tamanhoPagina,
      !novaBusca, // skipSpinner if not a new search
      currentSort
    ).subscribe({
      next: (page) => {
        const novosProdutos = page.content;
        
        // Se a busca mudou drasticamente (ex: nova busca disparada enquanto essa chegava), ignoramos
        if (novaBusca && this.produtos.length > 0 && this.paginaAtual === 0) {
            // Este caso previne duplicidade se o reset não foi limpo a tempo
        }

        this.produtos = [...this.produtos, ...novosProdutos];
        
        if (novosProdutos.length < this.tamanhoPagina) {
          this.fimDosProdutos = true;
          this.carregando = false;
        } else {
          this.paginaAtual++;
          // Carregar próxima página automaticamente após pequeno delay para não travar a UI
          this.loadingTimeout = setTimeout(() => {
            this.carregando = false; // Reset para permitir a próxima
            this.pesquisar(false);
          }, 600);
        }

        novosProdutos.forEach((p: Produto) => {
          if (!this.quantidades[p.id!]) {
            this.quantidades[p.id!] = 1;
          }
        });
      },
      error: (err) => {
        console.error('Erro ao buscar produtos da loja', err);
        this.carregando = false;
      }
    });
  }



  limparFiltros(): void {
    this.filtroNome = '';
    this.filtroTamanho = undefined;
    this.filtroPrecoMin = undefined;
    this.filtroPrecoMax = undefined;
    this.filtroPrecoMinFMT = '';
    this.filtroPrecoMaxFMT = '';
    this.pesquisar(true);
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

  abrirVisualizacaoImagem(url?: string): void {
      if (url) {
          this.imagemUrlVisualizacao = url;
          this.exibirVisualizacaoImagem = true;
      }
  }

  fecharVisualizacaoImagem(): void {
      this.exibirVisualizacaoImagem = false;
      this.imagemUrlVisualizacao = '';
  }

  toggleFiltrosMobile(): void {
      this.exibirFiltrosMobile = !this.exibirFiltrosMobile;
  }
}
