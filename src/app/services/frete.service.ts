import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Frete } from '../models/frete.model';

@Injectable({
    providedIn: 'root'
})
export class FreteService {
    private apiUrl = 'http://localhost:8080/api/tabelas-frete';

    constructor(private http: HttpClient) { }

    listarTodas(): Observable<Frete[]> {
        return this.http.get<Frete[]>(this.apiUrl);
    }

    buscarPorDescricao(descricao: string): Observable<Frete[]> {
        return this.http.get<Frete[]>(`${this.apiUrl}/descricao/${descricao}`);
    }

    buscarPorId(id: number): Observable<Frete> {
        return this.http.get<Frete>(`${this.apiUrl}/${id}`);
    }

    cadastrar(frete: Frete): Observable<Frete> {
        return this.http.post<Frete>(this.apiUrl, frete);
    }

    alterar(id: number, frete: Frete): Observable<Frete> {
        return this.http.put<Frete>(`${this.apiUrl}/${id}`, frete);
    }

    desativar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
