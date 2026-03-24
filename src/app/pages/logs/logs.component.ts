import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit {
  logs: any[] = [];
  totalItems: number = 0;
  pageSize: number = 10;
  currentPage: number = 0;
  
  filtroUsuario: string = '';
  filtroRole: string = 'CLIENTE';
  dataInicio: string = '';
  dataFim: string = '';
  
  sortField: string = 'dataHora';
  sortDir: string = 'DESC';

  carregando: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarLogs();
  }

  carregarLogs(): void {
    this.carregando = true;
    
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('size', this.pageSize.toString())
      .set('sort', `${this.sortField},${this.sortDir}`);

    if (this.filtroUsuario) params = params.set('usuarioNome', this.filtroUsuario);
    if (this.filtroRole) params = params.set('usuarioRole', this.filtroRole);
    if (this.dataInicio) params = params.set('dataInicio', this.convertToISO(this.dataInicio, true));
    if (this.dataFim) params = params.set('dataFim', this.convertToISO(this.dataFim, false));

    this.http.get<any>(`${environment.apiUrl}/logs`, { params }).subscribe({
      next: (res) => {
        this.logs = res.content;
        this.totalItems = res.totalElements;
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar logs', err);
        this.carregando = false;
      }
    });
  }

  convertToISO(dateStr: string, isStart: boolean): string {
    if (!dateStr) return '';
    // Formato ISO esperado pelo LocalDateTime: YYYY-MM-DDTHH:MM:SS
    return isStart ? `${dateStr}T00:00:00` : `${dateStr}T23:59:59`;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.carregarLogs();
  }

  alterarOrdenacao(campo: string): void {
    if (this.sortField === campo) {
      this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortField = campo;
      this.sortDir = 'DESC';
    }
    this.currentPage = 0; // Reset pagination on sort change
    this.carregarLogs();
  }

  limparFiltros(): void {
    this.filtroUsuario = '';
    this.filtroRole = 'CLIENTE';
    this.dataInicio = '';
    this.dataFim = '';
    this.currentPage = 0;
    this.carregarLogs();
  }
}
