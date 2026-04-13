import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { PrimeNGConfig } from 'primeng/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'sara-web';

  constructor(private authService: AuthService, private config: PrimeNGConfig) {}

  ngOnInit() {
    this.config.setTranslation({
        dayNames: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
        dayNamesShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
        dayNamesMin: ["D", "S", "T", "Q", "Q", "S", "S"],
        monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
        monthNamesShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        today: 'Hoje',
        clear: 'Limpar',
        dateFormat: 'dd/mm/yy',
        weekHeader: 'Sm'
    });
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:keydown', ['$event'])
  @HostListener('document:mousemove', ['$event'])
  resetTimer(event?: any) {
    this.authService.resetInactivityTimer();
  }
}
