import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OpcaoParcelamento } from '../models/opcao-parcelamento.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class OpcaoParcelamentoService {
    private apiUrl = `${environment.apiUrl}/opcoes-parcelamento`;

    constructor(private http: HttpClient) { }

    findAll(): Observable<OpcaoParcelamento[]> {
        return this.http.get<OpcaoParcelamento[]>(this.apiUrl);
    }

    findByFormaPagamento(formaPagamentoId: number): Observable<OpcaoParcelamento[]> {
        return this.http.get<OpcaoParcelamento[]>(`${this.apiUrl}/forma-pagamento/${formaPagamentoId}`);
    }

    findById(id: number): Observable<OpcaoParcelamento> {
        return this.http.get<OpcaoParcelamento>(`${this.apiUrl}/${id}`);
    }

    create(request: OpcaoParcelamento): Observable<OpcaoParcelamento> {
        return this.http.post<OpcaoParcelamento>(this.apiUrl, request);
    }

    update(id: number, request: OpcaoParcelamento): Observable<OpcaoParcelamento> {
        return this.http.put<OpcaoParcelamento>(`${this.apiUrl}/${id}`, request);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
