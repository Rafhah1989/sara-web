import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

    buscarPorNome(nome: string): Observable<Produto[]> {
        return this.http.get<Produto[]>(`${this.apiUrl}/nome/${nome}`);
    }

    buscarPorCodigo(codigo: number): Observable<Produto> {
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

    buscarParaLoja(nome?: string, tamanho?: number, precoMin?: number, precoMax?: number): Observable<Produto[]> {
        let params = new HttpParams();
        if (nome) params = params.set('nome', nome);
        if (tamanho) params = params.set('tamanho', tamanho.toString());
        if (precoMin) params = params.set('precoMin', precoMin.toString());
        if (precoMax) params = params.set('precoMax', precoMax.toString());

        return this.http.get<Produto[]>(`${this.apiUrl}/loja`, { params });
    }
}
