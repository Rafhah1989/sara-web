import { Component, OnInit } from '@angular/core';
import { FormaPagamentoService, FormaPagamento } from '../../services/forma-pagamento.service';

@Component({
  selector: 'app-forma-pagamento',
  templateUrl: './forma-pagamento.component.html',
  styleUrls: ['./forma-pagamento.component.css']
})
export class FormaPagamentoComponent implements OnInit {
  formasPagamento: FormaPagamento[] = [];
  formaPagamentoAtual: FormaPagamento = { descricao: '', desconto: 0, iconeFontAwesome: '' };
  
  exibirModal: boolean = false;
  mensagemAviso: string = '';
  exibirAviso: boolean = false;
  eExclusao: boolean = false;
  idParaExcluir: number | null = null;

  constructor(private formaPagamentoService: FormaPagamentoService) { }

  ngOnInit(): void {
    this.carregarFormasPagamento();
  }

  carregarFormasPagamento(): void {
    this.formaPagamentoService.listar().subscribe({
      next: (dados) => this.formasPagamento = dados,
      error: (err) => console.error('Erro ao carregar formas de pagamento', err)
    });
  }

  abrirModalParaCriar(): void {
    this.formaPagamentoAtual = { descricao: '', desconto: 0, iconeFontAwesome: '' };
    this.exibirModal = true;
  }

  abrirModalParaEditar(forma: FormaPagamento): void {
    this.formaPagamentoAtual = { ...forma };
    this.exibirModal = true;
  }

  fecharModal(): void {
    this.exibirModal = false;
  }

  salvarFormaPagamento(): void {
    this.formaPagamentoService.salvar(this.formaPagamentoAtual).subscribe({
      next: () => {
        this.carregarFormasPagamento();
        this.fecharModal();
        this.mostrarAviso('Forma de Pagamento salva com sucesso!', false);
      },
      error: (err) => {
        console.error('Erro ao salvar', err);
        this.mostrarAviso('Erro ao salvar Forma de Pagamento.', false);
      }
    });
  }

  confirmarExclusao(id?: number): void {
    if(!id) return;
    this.idParaExcluir = id;
    this.mostrarAviso("Deseja realmente remover esta Forma de Pagamento?", true);
  }

  excluirFormaPagamento(id: number): void {
    this.formaPagamentoService.excluir(id).subscribe({
      next: () => {
        this.carregarFormasPagamento();
        this.fecharAviso();
        this.mostrarAviso('Removida com sucesso!', false);
      },
      error: (err) => {
        console.error('Erro ao excluir', err);
        this.fecharAviso();
        this.mostrarAviso('Erro ao excluir Forma de Pagamento. Pode estar em uso.', false);
      }
    });
  }

  executarAcaoAviso(): void {
      if (this.eExclusao && this.idParaExcluir !== null) {
          this.excluirFormaPagamento(this.idParaExcluir);
      } else {
          this.fecharAviso();
      }
  }

  mostrarAviso(mensagem: string, exclusao: boolean): void {
    this.mensagemAviso = mensagem;
    this.eExclusao = exclusao;
    this.exibirAviso = true;
  }

  fecharAviso(): void {
    this.exibirAviso = false;
    this.idParaExcluir = null;
    this.eExclusao = false;
  }
}
