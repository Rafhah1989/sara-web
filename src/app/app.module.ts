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

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'quem-somos', component: AboutComponent },
  { path: 'produtos', component: ProductsComponent },
  { path: 'contato', component: ContactComponent },
  { path: 'usuarios', component: UsuariosComponent },
  { path: 'frete', component: FreteComponent },
  { path: 'setores', component: SetorComponent },
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
    SetorComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
