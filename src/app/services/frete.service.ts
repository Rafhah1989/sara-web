import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Frete } from '../models/frete.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FreteService {
    private apiUrl = `${environment.apiUrl}/tabelas-frete`;

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
