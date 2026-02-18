import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private apiUrl = `${environment.apiUrl}/usuarios`;

    constructor(private http: HttpClient) { }

    listarTodos(): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(this.apiUrl);
    }

    buscarPorId(id: number): Observable<Usuario> {
        return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
    }

    buscarPorNome(nome: string): Observable<Usuario[]> {
        return this.http.get<Usuario[]>(`${this.apiUrl}/nome/${nome}`);
    }

    criar(usuario: Usuario): Observable<Usuario> {
        return this.http.post<Usuario>(this.apiUrl, usuario);
    }

    alterar(id: number, usuario: Usuario): Observable<Usuario> {
        return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario);
    }

    desativar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    ativar(id: number): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/ativar/${id}`, {});
    }

    buscarCep(cep: string): Observable<any> {
        const cleanCep = cep.replace(/\D/g, '');
        return this.http.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
    }
}
