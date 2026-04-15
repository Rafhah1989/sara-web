import { Component, OnInit } from '@angular/core';
import { FormaPagamentoService, FormaPagamento } from '../../services/forma-pagamento.service';
import { OpcaoParcelamentoService } from '../../services/opcao-parcelamento.service';
import { OpcaoParcelamento } from '../../models/opcao-parcelamento.model';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-forma-pagamento',
  templateUrl: './forma-pagamento.component.html',
  styleUrls: ['./forma-pagamento.component.css']
})
export class FormaPagamentoComponent implements OnInit {
  formasPagamento: FormaPagamento[] = [];
  formaPagamentoAtual: FormaPagamento = { descricao: '', desconto: 0, iconeFontAwesome: '', valorMinimo: 0 };
  
  exibirModal: boolean = false;
  
  opcoesParcelamento: OpcaoParcelamento[] = [];
  novaOpcao: OpcaoParcelamento = { formaPagamentoId: 0, qtdMaxParcelas: 1, diasVencimentoIntervalo: 30, valorMinimoParcela: 0 };
  
  editandoOpcaoId: number | null = null;

  constructor(
    private formaPagamentoService: FormaPagamentoService,
    private opcaoParcelamentoService: OpcaoParcelamentoService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }

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
    this.formaPagamentoAtual = { descricao: '', desconto: 0, iconeFontAwesome: '', valorMinimo: 0 };
    this.opcoesParcelamento = [];
    this.resetNovaOpcao();
    this.exibirModal = true;
  }

  abrirModalParaEditar(forma: FormaPagamento): void {
    this.formaPagamentoAtual = { ...forma };
    if (forma.id) {
      this.carregarOpcoesParcelamento(forma.id);
    }
    this.resetNovaOpcao();
    this.exibirModal = true;
  }

  fecharModal(): void {
    this.exibirModal = false;
    this.opcoesParcelamento = [];
    this.resetNovaOpcao();
  }

  salvarFormaPagamento(): void {
    this.formaPagamentoService.salvar(this.formaPagamentoAtual).subscribe({
      next: () => {
        this.carregarFormasPagamento();
        this.fecharModal();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Forma de Pagamento salva com sucesso!' });
      },
      error: (err) => {
        console.error('Erro ao salvar', err);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao salvar Forma de Pagamento.' });
      }
    });
  }

  confirmarExclusao(forma: FormaPagamento): void {
    if(!forma.id) return;
    
    this.confirmationService.confirm({
      message: `Deseja realmente remover a forma de pagamento <b>${forma.descricao}</b>?`,
      header: 'Confirmar Exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, Excluir',
      rejectLabel: 'Não',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.excluirFormaPagamento(forma.id!);
      }
    });
  }

  excluirFormaPagamento(id: number): void {
    this.formaPagamentoService.excluir(id).subscribe({
      next: () => {
        this.carregarFormasPagamento();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Removida com sucesso!' });
      },
      error: (err) => {
        console.error('Erro ao excluir', err);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao excluir Forma de Pagamento. Pode estar em uso.' });
      }
    });
  }

  // Lógica de Parcelas
  carregarOpcoesParcelamento(formaId: number): void {
    this.opcaoParcelamentoService.findByFormaPagamento(formaId).subscribe({
      next: (dados) => {
        this.opcoesParcelamento = dados.sort((a, b) => a.qtdMaxParcelas - b.qtdMaxParcelas);
      },
      error: (err) => console.error('Erro ao carregar parcelas', err)
    });
  }

  resetNovaOpcao(): void {
    this.novaOpcao = { 
      formaPagamentoId: this.formaPagamentoAtual.id || 0, 
      qtdMaxParcelas: undefined as any, 
      diasVencimentoIntervalo: undefined as any,
      valorMinimoParcela: 0
    };
    this.editandoOpcaoId = null;
  }


  prepararEdicaoOpcao(opt: OpcaoParcelamento): void {
    this.novaOpcao = { ...opt };
    this.editandoOpcaoId = opt.id || null;
  }

  cancelarEdicaoOpcao(): void {
    this.resetNovaOpcao();
  }

  adicionarOpcaoParcelamento(): void {
    if (!this.formaPagamentoAtual.id) return;
    this.novaOpcao.formaPagamentoId = this.formaPagamentoAtual.id;

    // Garantir que o valor seja numérico para persistência correta
    this.novaOpcao.valorMinimoParcela = Number(this.novaOpcao.valorMinimoParcela) || 0;

    const request = this.editandoOpcaoId 
      ? this.opcaoParcelamentoService.update(this.editandoOpcaoId, this.novaOpcao)
      : this.opcaoParcelamentoService.create(this.novaOpcao);

    request.subscribe({
      next: () => {
        this.carregarOpcoesParcelamento(this.formaPagamentoAtual.id!);
        this.resetNovaOpcao();
      },
      error: (err) => alert(err.error || 'Erro ao salvar opção de parcelamento')
    });
  }

  removerOpcaoParcelamento(id: number): void {
    this.confirmationService.confirm({
      message: 'Deseja remover esta regra de parcelamento?',
      header: 'Confirmar Remoção',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sim',
      rejectLabel: 'Não',
      accept: () => {
        this.opcaoParcelamentoService.delete(id).subscribe({
          next: () => {
            this.carregarOpcoesParcelamento(this.formaPagamentoAtual.id!);
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Regra removida.' });
          },
          error: (err) => this.messageService.add({ severity: 'error', summary: 'Erro', detail: err.error || 'Erro ao remover opção de parcelamento' })
        });
      }
    });
  }
}
