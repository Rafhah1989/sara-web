import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
  produtoCodigo: string;
  produtoPreco: number;
  produtoImagem: string;
  produtoTamanho: number;
  produtoAtivo: boolean;
  produtoPeso: number;
  quantidade: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarrinhoService {
  private quantidadeItensUnicosSubject = new BehaviorSubject<number>(0);
  quantidadeItensUnicos$ = this.quantidadeItensUnicosSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/carrinho`;

  constructor(private http: HttpClient) {}

  atualizarContagem(idUsuario: number, skipSpinner: boolean = false): void {
      this.buscarPorUsuario(idUsuario, skipSpinner).subscribe({
          next: (itens) => {
              // Os itens únicos compõem o tamanho da lista que retorna do usuario
              this.quantidadeItensUnicosSubject.next(itens.length);
          },
          error: () => this.quantidadeItensUnicosSubject.next(0)
      });
  }

  limparContagem(): void {
      this.quantidadeItensUnicosSubject.next(0);
  }

  adicionar(dto: CarrinhoRequestDTO, skipSpinner: boolean = false): Observable<CarrinhoResponseDTO> {
    const headers = skipSpinner ? { 'X-Skip-Spinner': 'true' } : {};
    return this.http.post<CarrinhoResponseDTO>(this.apiUrl, dto, { headers }).pipe(
      tap(() => this.atualizarContagem(dto.usuarioId, skipSpinner))
    );
  }

  adicionarLote(dtos: CarrinhoRequestDTO[], skipSpinner: boolean = false): Observable<CarrinhoResponseDTO[]> {
    const headers = skipSpinner ? { 'X-Skip-Spinner': 'true' } : {};
    return this.http.post<CarrinhoResponseDTO[]>(`${this.apiUrl}/lote`, dtos, { headers }).pipe(
      tap(() => {
        if (dtos.length > 0) {
          this.atualizarContagem(dtos[0].usuarioId, skipSpinner);
        }
      })
    );
  }

  atualizarQuantidade(idUsuario: number, idProduto: number, dto: CarrinhoRequestDTO, skipSpinner: boolean = false): Observable<CarrinhoResponseDTO> {
    const headers = skipSpinner ? { 'X-Skip-Spinner': 'true' } : {};
    return this.http.put<CarrinhoResponseDTO>(`${this.apiUrl}/${idUsuario}/${idProduto}`, dto, { headers });
  }

  remover(idUsuario: number, idProduto: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${idUsuario}/${idProduto}`).pipe(
      tap(() => this.atualizarContagem(idUsuario))
    );
  }

  limpar(idUsuario: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/usuario/${idUsuario}`).pipe(
      tap(() => this.atualizarContagem(idUsuario))
    );
  }

  buscarPorUsuario(idUsuario: number, skipSpinner: boolean = false): Observable<CarrinhoResponseDTO[]> {
    const headers = skipSpinner ? { 'X-Skip-Spinner': 'true' } : {};
    return this.http.get<CarrinhoResponseDTO[]>(`${this.apiUrl}/usuario/${idUsuario}`, { headers });
  }
}
