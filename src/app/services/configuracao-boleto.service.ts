import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ConfiguracaoBoleto } from '../models/configuracao-boleto.model';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracaoBoletoService {

  private apiUrl = `${environment.apiUrl}/configuracoes-boleto`;

  constructor(private http: HttpClient) { }

  buscar(): Observable<ConfiguracaoBoleto> {
    return this.http.get<ConfiguracaoBoleto>(this.apiUrl);
  }

  salvar(config: ConfiguracaoBoleto): Observable<ConfiguracaoBoleto> {
    return this.http.put<ConfiguracaoBoleto>(this.apiUrl, config);
  }
}
