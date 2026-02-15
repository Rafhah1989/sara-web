import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Setor } from '../models/setor.model';

@Injectable({
    providedIn: 'root'
})
export class SetorService {
    private apiUrl = 'http://localhost:8080/api/setores';

    constructor(private http: HttpClient) { }

    listarTodos(): Observable<Setor[]> {
        return this.http.get<Setor[]>(this.apiUrl);
    }

    buscarPorDescricao(descricao: string): Observable<Setor[]> {
        return this.http.get<Setor[]>(`${this.apiUrl}/descricao/${descricao}`);
    }

    buscarPorId(id: number): Observable<Setor> {
        return this.http.get<Setor>(`${this.apiUrl}/${id}`);
    }

    cadastrar(setor: Setor): Observable<Setor> {
        return this.http.post<Setor>(this.apiUrl, setor);
    }

    alterar(id: number, setor: Setor): Observable<Setor> {
        return this.http.put<Setor>(`${this.apiUrl}/${id}`, setor);
    }

    desativar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    ativar(id: number): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/ativar/${id}`, {});
    }
}
