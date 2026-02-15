import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  welcomeMessage: string = '';
  dropdownAberto: boolean = false;

  constructor(private http: HttpClient, private eRef: ElementRef) { }

  ngOnInit(): void {
    this.http.get('http://localhost:8080/', { responseType: 'text' })
      .subscribe({
        next: (response) => {
          this.welcomeMessage = response;
        },
        error: (err) => {
          console.error('Erro ao buscar mensagem da API', err);
          this.welcomeMessage = 'Bem-vindo'; // Fallback
        }
      });
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    const target = event.target as HTMLElement;
    const isDropdown = target.closest('.dropdown');

    if (!isDropdown) {
      this.fecharDropdown();
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownAberto = !this.dropdownAberto;
  }

  fecharDropdown(): void {
    this.dropdownAberto = false;
  }
}
