import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
