import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private readonly TOKEN_NAME = 'sara_token';
  private inactivityTimer: any;
  private readonly INACTIVITY_LIMIT_MS = 120 * 60 * 1000; // 2 horas (120 minutos)

  // Subject para emitir o estado de login
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.isAutenticado());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    if (this.isAutenticado()) {
      this.initInactivityTimer();
    }
  }

  login(dados: any): Observable<any> {
    return this.http.post<{token: string}>(`${this.apiUrl}/login`, dados).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_NAME, res.token);
        this.isAuthenticatedSubject.next(true);
        this.initInactivityTimer();
      })
    );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_NAME);
    this.isAuthenticatedSubject.next(false);
    this.clearInactivityTimer();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_NAME);
  }

  isAutenticado(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      const dataExpiracao = decoded.exp * 1000;
      return Date.now() < dataExpiracao;
    } catch(e) {
      return false;
    }
  }

  getSubjectDoToken(): string {
    const token = this.getToken();
    if (!token) return '';
    
    try {
      const decoded: any = jwtDecode(token);
      return decoded.nome || decoded.sub; // Usa a nova claim 'nome', senão cai pro 'sub'
    } catch(e) {
      return '';
    }
  }

  getRoleDoToken(): string {
    const token = this.getToken();
    if (!token) return '';
    
    try {
      const decoded: any = jwtDecode(token);
      return decoded.role || '';
    } catch(e) {
      return '';
    }
  }

  getUsuarioIdDoToken(): number | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.id || null;
    } catch {
      return null;
    }
  }

  // --- Gerenciamento de Sessão de 30 minutos ---

  public resetInactivityTimer() {
    if (this.isAutenticado()) {
      this.clearInactivityTimer();
      this.initInactivityTimer();
    }
  }

  private initInactivityTimer() {
    this.inactivityTimer = setTimeout(() => {
      this.logout();
      alert('Sua sessão expirou por inatividade.');
    }, this.INACTIVITY_LIMIT_MS);
  }

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
  }
}
