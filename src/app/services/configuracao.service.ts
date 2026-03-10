import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Configuracao } from '../models/configuracao.model';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracaoService {

  private apiUrl = `${environment.apiUrl}/configuracao`;

  constructor(private http: HttpClient) { }

  buscar(): Observable<Configuracao> {
    return this.http.get<Configuracao>(this.apiUrl);
  }

  salvar(config: Configuracao): Observable<Configuracao> {
    return this.http.post<Configuracao>(this.apiUrl, config);
  }

  atualizar(id: number, config: Configuracao): Observable<Configuracao> {
    return this.http.put<Configuracao>(`${this.apiUrl}/${id}`, config);
  }
}
