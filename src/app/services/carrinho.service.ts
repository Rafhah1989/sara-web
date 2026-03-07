import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CarrinhoRequestDTO {
  usuarioId: number;
  produtoId: number;
  quantidade: number;
}

export interface CarrinhoResponseDTO {
  usuarioId: number;
  usuarioNome: string;
  usuarioCpfCnpj: string;
  produtoId: number;
  produtoNome: string;
  produtoCodigo: number;
  produtoPreco: number;
  produtoImagem: string;
  produtoTamanho: number;
  produtoAtivo: boolean;
  quantidade: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarrinhoService {
  private apiUrl = `${environment.apiUrl}/carrinho`;

  constructor(private http: HttpClient) {}

  adicionar(dto: CarrinhoRequestDTO): Observable<CarrinhoResponseDTO> {
    return this.http.post<CarrinhoResponseDTO>(this.apiUrl, dto);
  }

  atualizarQuantidade(idUsuario: number, idProduto: number, dto: CarrinhoRequestDTO): Observable<CarrinhoResponseDTO> {
    return this.http.put<CarrinhoResponseDTO>(`${this.apiUrl}/${idUsuario}/${idProduto}`, dto);
  }

  remover(idUsuario: number, idProduto: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idUsuario}/${idProduto}`);
  }

  buscarPorUsuario(idUsuario: number): Observable<CarrinhoResponseDTO[]> {
    return this.http.get<CarrinhoResponseDTO[]>(`${this.apiUrl}/usuario/${idUsuario}`);
  }
}
