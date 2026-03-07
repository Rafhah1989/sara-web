import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    if (this.authService.isAutenticado()) {
      const expectedRole = route.data['expectedRole'];
      if (expectedRole && this.authService.getRoleDoToken() !== expectedRole) {
        // Se usuário logado não tem a role exigida, o devolve pra Início ou joga pro /login se preferir
        this.router.navigate(['/']); 
        return false;
      }
      return true;
    }

    // Se não estiver logado, redireciona para o login e salva a URL de tentativa
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
    return false;
  }
}
