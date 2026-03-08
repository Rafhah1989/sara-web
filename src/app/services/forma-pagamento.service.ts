import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FormaPagamento {
    id?: number;
    descricao: string;
    desconto: number;
    iconeFontAwesome: string;
}

@Injectable({
    providedIn: 'root'
})
export class FormaPagamentoService {
    private apiUrl = `${environment.apiUrl}/formas-pagamento`;

    constructor(private http: HttpClient) { }

    listar(): Observable<FormaPagamento[]> {
        return this.http.get<FormaPagamento[]>(this.apiUrl);
    }

    buscarPorId(id: number): Observable<FormaPagamento> {
        return this.http.get<FormaPagamento>(`${this.apiUrl}/${id}`);
    }

    salvar(formaPagamento: FormaPagamento): Observable<FormaPagamento> {
        if (formaPagamento.id) {
            return this.http.put<FormaPagamento>(`${this.apiUrl}/${formaPagamento.id}`, formaPagamento);
        }
        return this.http.post<FormaPagamento>(this.apiUrl, formaPagamento);
    }

    excluir(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
