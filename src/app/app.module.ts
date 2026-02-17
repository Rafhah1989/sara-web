import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'quem-somos', component: AboutComponent },
  { path: 'produtos', component: ProductsComponent },
  { path: 'contato', component: ContactComponent },
  { path: 'usuarios', component: UsuariosComponent },
  { path: 'frete', component: FreteComponent },
  { path: 'setores', component: SetorComponent },
  { path: 'pedidos', component: PedidoListComponent },
  { path: 'pedidos/novo', component: PedidoFormComponent },
  { path: 'pedidos/editar/:id', component: PedidoFormComponent },
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
    PedidoFormComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes)
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
