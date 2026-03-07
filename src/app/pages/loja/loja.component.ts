import { Component, OnInit } from '@angular/core';
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
    const qtd = this.quantidades[produto.id!] || 1;
    
    this.carrinhoService.adicionar({
      usuarioId: usuarioId,
      produtoId: produto.id!,
      quantidade: qtd
    }).subscribe({
      next: () => {
        alert('Produto adicionado ao carrinho com sucesso!');
      },
      error: (err) => {
        if (err.error && typeof err.error === 'string' && err.error.includes("já está no carrinho")) {
           if(confirm("Produto já está no carrinho. Deseja atualizar a quantidade?")) {
              this.carrinhoService.atualizarQuantidade(usuarioId, produto.id!, {
                  usuarioId: usuarioId,
                  produtoId: produto.id!,
                  quantidade: qtd
              }).subscribe(() => alert('Quantidade atualizada!'));
           }
        } else {
          alert('Erro ao adicionar produto.');
        }
      }
    });
  }
}
