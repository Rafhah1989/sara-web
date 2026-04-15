import { Component, OnInit } from '@angular/core';
import { LogService } from '../../services/log.service';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit {
  logs: any[] = [];
  totalItems: number = 0;
  pageSize: number = 10;
  loading: boolean = false;
  
  filtroUsuario: string = '';
  filtroRole: string = 'CLIENTE';
  dataInicio: Date | null = null;
  dataFim: Date | null = null;
  
  lastLazyLoadEvent: any = null;

  perfilOptions = [
    { label: 'TODOS OS PERFIS', value: 'TODOS' },
    { label: 'ADMINISTRADOR', value: 'ADMIN' },
    { label: 'CLIENTE', value: 'CLIENTE' }
  ];

  constructor(private logService: LogService) {}

  ngOnInit(): void {}

  onLazyLoad(event: any): void {
    this.lastLazyLoadEvent = event;
    this.carregarLogs(event);
  }

  carregarLogs(event?: any): void {
    this.loading = true;
    
    const page = event ? (event.first || 0) / (event.rows || 10) : 0;
    const size = event ? (event.rows || 10) : 10;
    const sortField = event?.sortField || 'dataHora';
    const sortOrder = event?.sortOrder === 1 ? 'ASC' : 'DESC';

    const params: any = {
      page: page,
      size: size,
      sort: `${sortField},${sortOrder}`,
      usuarioNome: this.filtroUsuario,
      usuarioRole: this.filtroRole,
      dataInicio: this.formatarData(this.dataInicio, true),
      dataFim: this.formatarData(this.dataFim, false)
    };

    this.logService.listar(params).subscribe({
      next: (res) => {
        this.logs = res.content;
        this.totalItems = res.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar logs', err);
        this.loading = false;
      }
    });
  }

  formatarData(data: Date | null, isInicio: boolean): string {
    if (!data) return '';
    const d = new Date(data);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return isInicio ? `${ano}-${mes}-${dia}T00:00:00` : `${ano}-${mes}-${dia}T23:59:59`;
  }

  limparFiltros(): void {
    this.filtroUsuario = '';
    this.filtroRole = 'TODOS';
    this.dataInicio = null;
    this.dataFim = null;
    if (this.lastLazyLoadEvent) {
      this.carregarLogs(this.lastLazyLoadEvent);
    } else {
      this.carregarLogs();
    }
  }

  aplicarFiltros(): void {
      if (this.lastLazyLoadEvent) {
          this.lastLazyLoadEvent.first = 0; // Volta para primeira página ao filtrar
          this.onLazyLoad(this.lastLazyLoadEvent);
      } else {
          this.carregarLogs();
      }
  }
}
