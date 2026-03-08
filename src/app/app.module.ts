import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ProductsComponent } from './pages/products/products.component';
import { ContactComponent } from './pages/contact/contact.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { FreteComponent } from './pages/frete/frete.component';
import { SetorComponent } from './pages/setor/setor.component';
import { PedidoListComponent } from './pages/pedidos/pedido-list/pedido-list.component';
import { PedidoFormComponent } from './pages/pedidos/pedido-form/pedido-form.component';
import { LojaComponent } from './pages/loja/loja.component';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { CarrinhoComponent } from './pages/carrinho/carrinho.component';
import { FormaPagamentoComponent } from './pages/forma-pagamento/forma-pagamento.component';

registerLocaleData(localePt);

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'quem-somos', component: AboutComponent },
  { path: 'produtos', component: ProductsComponent, canActivate: [AuthGuard], data: { expectedRole: 'ADMIN' } },
  { path: 'contato', component: ContactComponent },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AuthGuard], data: { expectedRole: 'ADMIN' } },
  { path: 'frete', component: FreteComponent, canActivate: [AuthGuard], data: { expectedRole: 'ADMIN' } },
  { path: 'setores', component: SetorComponent, canActivate: [AuthGuard], data: { expectedRole: 'ADMIN' } },
  { path: 'formas-pagamento', component: FormaPagamentoComponent, canActivate: [AuthGuard], data: { expectedRole: 'ADMIN' } },
  { path: 'loja', component: LojaComponent, canActivate: [AuthGuard] }, { path: 'carrinho', component: CarrinhoComponent, canActivate: [AuthGuard] },
  { path: 'pedidos', component: PedidoListComponent, canActivate: [AuthGuard] },
  { path: 'pedidos/novo', component: PedidoFormComponent, canActivate: [AuthGuard] },
  { path: 'pedidos/editar/:id', component: PedidoFormComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    HomeComponent,
    AboutComponent,
    ProductsComponent,
    ContactComponent,
    UsuariosComponent,
    FreteComponent,
    SetorComponent,
    PedidoListComponent,
    PedidoFormComponent,
    LojaComponent,
    LoginComponent,
    CarrinhoComponent,
    FormaPagamentoComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes)
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
