import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Produto } from '../models/produto.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ProdutoService {
    private apiUrl = `${environment.apiUrl}/produtos`;

    constructor(private http: HttpClient) { }

    listarTodos(): Observable<Produto[]> {
        return this.http.get<Produto[]>(this.apiUrl);
    }

    listarAtivos(): Observable<Produto[]> {
        return this.http.get<Produto[]>(`${this.apiUrl}/ativos`);
    }

    buscarPorId(id: number): Observable<Produto> {
        return this.http.get<Produto>(`${this.apiUrl}/${id}`);
    }

    buscarPorNome(nome: string): Observable<Produto[]> {
        return this.http.get<Produto[]>(`${this.apiUrl}/nome/${nome}`);
    }

    buscarPorCodigo(codigo: string): Observable<Produto> {
        return this.http.get<Produto>(`${this.apiUrl}/codigo/${codigo}`);
    }

    adicionar(produto: Produto): Observable<Produto> {
        return this.http.post<Produto>(this.apiUrl, produto);
    }

    alterar(id: number, produto: Produto): Observable<Produto> {
        return this.http.put<Produto>(`${this.apiUrl}/${id}`, produto);
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
    });
  }

  getTamanhosAtivos(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/tamanhos`);
  }

    buscarOutrosTamanhos(id: number, skipSpinner: boolean = false): Observable<Produto[]> {
        const headers = skipSpinner ? { 'X-Skip-Spinner': 'true' } : {};
        return this.http.get<Produto[]>(`${this.apiUrl}/${id}/outros-tamanhos`, { headers });
    }

    gerarCatalogo(): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/catalogo`, { responseType: 'blob' });
    }
}
