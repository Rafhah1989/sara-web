import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Pedido {
    id: number;
    usuarioId: number;
    usuarioNome: string;
    desconto: number;
    frete: number;
    valorTotal: number;
    observacao: string;
    cancelado: boolean;
    dataPedido: string;
    produtos: PedidoProduto[];
}

export interface PedidoProduto {
    id?: number;
    produtoId: number;
    produtoNome: string;
    produtoCodigo?: number;
    valor: number;
    quantidade: number;
    desconto: number;
    peso: number;
}

@Injectable({
    providedIn: 'root'
})
export class PedidoService {
    private apiUrl = 'http://localhost:8080/api/pedidos';

    constructor(private http: HttpClient) { }

    listar(id?: number, clienteNome?: string, dataInicio?: string, dataFim?: string, page: number = 0, size: number = 10, sort?: string, exibirCancelados?: boolean): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (id) params = params.set('id', id.toString());
        if (clienteNome) params = params.set('clienteNome', clienteNome);
        if (dataInicio) params = params.set('dataInicio', dataInicio);
        if (dataFim) params = params.set('dataFim', dataFim);
        if (sort) params = params.set('sort', sort);
        if (exibirCancelados) params = params.set('exibirCancelados', exibirCancelados.toString());

        return this.http.get<any>(this.apiUrl, { params });
    }

    buscarPorId(id: number): Observable<Pedido> {
        return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
    }

    salvar(pedido: any): Observable<Pedido> {
        return this.http.post<Pedido>(this.apiUrl, pedido);
    }

    alterar(id: number, pedido: any): Observable<Pedido> {
        return this.http.put<Pedido>(`${this.apiUrl}/${id}`, pedido);
    }

    cancelar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    gerarPdf(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
    }

    obterSugestaoFrete(usuarioId: number): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/sugestao-frete/${usuarioId}`);
    }
}
