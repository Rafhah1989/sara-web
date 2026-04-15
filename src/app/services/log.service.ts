import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogService {

  private apiUrl = `${environment.apiUrl}/logs`;

  constructor(private http: HttpClient) { }

  listar(params: any): Observable<any> {
    let httpParams = new HttpParams()
      .set('page', params.page?.toString() || '0')
      .set('size', params.size?.toString() || '10')
      .set('sort', params.sort || 'dataHora,DESC');

    if (params.usuarioNome) httpParams = httpParams.set('usuarioNome', params.usuarioNome);
    if (params.usuarioRole && params.usuarioRole !== 'TODOS') httpParams = httpParams.set('usuarioRole', params.usuarioRole);
    if (params.dataInicio) httpParams = httpParams.set('dataInicio', params.dataInicio);
    if (params.dataFim) httpParams = httpParams.set('dataFim', params.dataFim);

    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }
}
