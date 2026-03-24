import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Produto } from '../models/produto.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ProdutoService {
    private apiUrl = `${environment.apiUrl}/produtos`;

    constructor(private http: HttpClient) { }

    private formatProduto(produto: any): any {
        return produto;
    }

    private formatProdutos(produtos: any[]): any[] {
        return produtos.map(p => this.formatProduto(p));
    }

    listarTodos(): Observable<Produto[]> {
        return this.http.get<Produto[]>(this.apiUrl).pipe(map(res => this.formatProdutos(res)));
    }

    listarAtivos(): Observable<Produto[]> {
        return this.http.get<Produto[]>(`${this.apiUrl}/ativos`).pipe(map(res => this.formatProdutos(res)));
    }

    buscarPorId(id: number): Observable<Produto> {
        return this.http.get<Produto>(`${this.apiUrl}/${id}`).pipe(map(res => this.formatProduto(res)));
    }

    buscarPorNome(nome: string): Observable<Produto[]> {
        return this.http.get<Produto[]>(`${this.apiUrl}/nome/${nome}`).pipe(map(res => this.formatProdutos(res)));
    }

    buscarPorCodigo(codigo: string): Observable<Produto> {
        return this.http.get<Produto>(`${this.apiUrl}/codigo/${codigo}`).pipe(map(res => this.formatProduto(res)));
    }

    adicionar(produto: Produto): Observable<Produto> {
        return this.http.post<Produto>(this.apiUrl, produto).pipe(map(res => this.formatProduto(res)));
    }

    alterar(id: number, produto: Produto): Observable<Produto> {
        return this.http.put<Produto>(`${this.apiUrl}/${id}`, produto).pipe(map(res => this.formatProduto(res)));
    }

    excluir(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    buscarParaLoja(
    nome?: string,
    tamanhos?: number[],
    precoMin?: number,
    precoMax?: number,
    pagina: number = 0,
    tamanho: number = 30,
    skipSpinner: boolean = false,
    sort: string = 'nome'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', pagina.toString())
      .set('size', tamanho.toString())
      .set('sort', sort);

    if (nome) params = params.set('nome', nome);

    if (tamanhos && tamanhos.length > 0) {
      tamanhos.forEach(t => {
        params = params.append('tamanhos', t.toString());
      });
    }

    if (precoMin) params = params.set('precoMin', precoMin.toString());
    if (precoMax) params = params.set('precoMax', precoMax.toString());

    return this.http.get<any>(`${this.apiUrl}/loja`, {
      params,
      headers: skipSpinner ? { 'X-Skip-Spinner': 'true' } : {}
    }).pipe(
      map(res => {
        if (res && res.content) {
          res.content = this.formatProdutos(res.content);
        }
        return res;
      })
    );
  }

  getTamanhosAtivos(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/tamanhos`);
  }

    buscarOutrosTamanhos(id: number, skipSpinner: boolean = false): Observable<Produto[]> {
        const headers = skipSpinner ? { 'X-Skip-Spinner': 'true' } : {};
        return this.http.get<Produto[]>(`${this.apiUrl}/${id}/outros-tamanhos`, { headers }).pipe(map(res => this.formatProdutos(res)));
    }

    gerarCatalogo(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/catalogo`, { responseType: 'blob' });
    }
}
