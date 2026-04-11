import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Pagamento {
    id?: number;
    formaPagamentoId?: number;
    formaPagamentoDescricao?: string;
    dataVencimento: string;
    pago: boolean;
    valor: number;
    pagamentoOnline?: boolean;
    pixCopiaECola?: string;
    pixQrCode?: string;
    boletoPdfUrl?: string;
    boletoLinhaDigitavel?: string;
    boletoCodigoBarras?: string;
    mercadopagoPagamentoId?: string;
    dataExpiracao?: string;
}

export interface Pedido {
    id: number;
    usuarioId: number;
    usuarioNome: string;
    formaPagamentoId?: number;
    formaPagamentoDescricao?: string;
    desconto: number;
    frete: number;
    valorTotal: number;
    observacao: string;
    cancelado: boolean;
    situacao?: string;
    situacaoDescricao?: string;
    dataPedido: string;
    pago: boolean;
    pagamentoOnline: boolean;
    notaFiscalPath?: string;
    numeroNotaFiscal?: string;
    dataFaturamento?: string;
    produtos?: PedidoProduto[];
    pagamentos?: Pagamento[];
}

export interface PedidoProduto {
    id?: number;
    produtoId: number;
    produtoNome: string;
    produtoCodigo?: string;
    valor: number;
    quantidade: number;
    desconto: number;
    peso?: number;
    imagem: string;
    tamanho?: number;
    temImagem?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class PedidoService {
    private apiUrl = `${environment.apiUrl}/pedidos`;

    constructor(private http: HttpClient) { }

    listar(id?: number, clienteNome?: string, dataInicio?: string, dataFim?: string, situacao?: string, page: number = 0, size: number = 10, sort?: string, exibirCancelados?: boolean, usuarioId?: number): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (id) params = params.set('id', id.toString());
        if (usuarioId) params = params.set('usuarioId', usuarioId.toString());
        if (clienteNome) params = params.set('clienteNome', clienteNome);
        if (dataInicio) params = params.set('dataInicio', dataInicio);
        if (dataFim) params = params.set('dataFim', dataFim);
        if (situacao) params = params.set('situacao', situacao);
        if (sort) params = params.set('sort', sort);
        if (exibirCancelados) params = params.set('exibirCancelados', exibirCancelados.toString());

        return this.http.get<any>(this.apiUrl, { params });
    }

    buscarPorId(id: number, skipSpinner: boolean = false): Observable<Pedido> {
        let params = new HttpParams();
        if (skipSpinner) params = params.set('skipSpinner', 'true');
        return this.http.get<Pedido>(`${this.apiUrl}/${id}`, { params });
    }

    salvar(pedido: any): Observable<Pedido> {
        return this.http.post<Pedido>(this.apiUrl, pedido);
    }

    alterar(id: number, pedido: any): Observable<Pedido> {
        return this.http.put<Pedido>(`${this.apiUrl}/${id}`, pedido);
    }

    cancelar(id: number, motivo?: string): Observable<void> {
        let params = new HttpParams();
        if (motivo) {
            params = params.set('motivo', motivo);
        }
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { params });
    }

    alterarSituacao(id: number, situacao: string, enviarEmail: boolean = false): Observable<void> {
        let params = new HttpParams().set('enviarEmail', enviarEmail.toString());
        return this.http.patch<void>(`${this.apiUrl}/${id}/situacao`, { situacao }, { params });
    }

    confirmar(id: number, enviarEmail: boolean, ajustarDatas: boolean = true): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${id}/confirmar`, { enviarEmail, ajustarDatas });
    }

    gerarPdf(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
    }

    obterSugestaoFrete(usuarioId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/sugestao-frete/${usuarioId}`);
    }

    obterFormasPagamento(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/formas-pagamento`);
    }

    obterSituacoesPedido(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/situacoes-pedido`);
    }

    alterarStatusPago(id: number, pago: boolean): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/${id}/status-pago`, { pago });
    }

    verificarPagamentoManual(idPagamento: number): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/mercadopago/verificar-pagamento/${idPagamento}`, {});
    }

    gerarPagamentoOnline(id: number, pagamentoId?: number, skipSpinner: boolean = false): Observable<Pedido> {
        let params = new HttpParams();
        if (pagamentoId) {
            params = params.set('pagamentoId', pagamentoId.toString());
        }
        if (skipSpinner) {
            params = params.set('skipSpinner', 'true');
        }
        return this.http.post<Pedido>(`${this.apiUrl}/${id}/gerar-pagamento-online`, {}, { params });
    }

    uploadNotaFiscal(id: number, numeroNotaFiscal: string, file: File | null, notificar: boolean): Observable<void> {
        const formData = new FormData();
        if (file) {
            formData.append('file', file);
        }
        formData.append('numeroNotaFiscal', numeroNotaFiscal);
        return this.http.post<void>(`${this.apiUrl}/${id}/nota-fiscal?notificar=${notificar}`, formData);
    }

    enviarEmailNotaFiscal(id: number): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${id}/nota-fiscal/notificar`, {});
    }

    notificarCobrancaPagamento(id: number, pagamentoId: number): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${id}/pagamentos/${pagamentoId}/notificar-cobranca`, {});
    }

    excluirNotaFiscal(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}/nota-fiscal`);
    }

    visualizarNotaFiscal(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${id}/nota-fiscal`, { responseType: 'blob' });
    }
}
