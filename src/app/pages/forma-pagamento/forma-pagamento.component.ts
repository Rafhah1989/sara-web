import { Component, OnInit } from '@angular/core';
import { FormaPagamentoService, FormaPagamento } from '../../services/forma-pagamento.service';
import { OpcaoParcelamentoService } from '../../services/opcao-parcelamento.service';
import { OpcaoParcelamento } from '../../models/opcao-parcelamento.model';

@Component({
  selector: 'app-forma-pagamento',
  templateUrl: './forma-pagamento.component.html',
  styleUrls: ['./forma-pagamento.component.css']
})
export class FormaPagamentoComponent implements OnInit {
  formasPagamento: FormaPagamento[] = [];
  formaPagamentoAtual: FormaPagamento = { descricao: '', desconto: 0, iconeFontAwesome: '', valorMinimo: 0 };
  
  exibirModal: boolean = false;
  mensagemAviso: string = '';
  exibirAviso: boolean = false;
  eExclusao: boolean = false;
  idParaExcluir: number | null = null;
  
  opcoesParcelamento: OpcaoParcelamento[] = [];
  novaOpcao: OpcaoParcelamento = { formaPagamentoId: 0, qtdMaxParcelas: 1, diasVencimentoIntervalo: 30, valorMinimoParcela: 0 };
  
  valorMinimoFormatado: string = 'R$ 0,00';
  valorMinimoParcelaFormatada: string = 'R$ 0,00';
  editandoOpcaoId: number | null = null;

  constructor(
    private formaPagamentoService: FormaPagamentoService,
    private opcaoParcelamentoService: OpcaoParcelamentoService
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
    this.valorMinimoFormatado = 'R$ 0,00';
    this.opcoesParcelamento = [];
    this.resetNovaOpcao();
    this.exibirModal = true;
  }

  abrirModalParaEditar(forma: FormaPagamento): void {
    this.formaPagamentoAtual = { ...forma };
    this.valorMinimoFormatado = this.formatarMoeda(forma.valorMinimo || 0);
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
    this.valorMinimoParcelaFormatada = 'R$ 0,00';
    this.editandoOpcaoId = null;
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  applyMoedaMask(event: any, field: 'valorMinimo' | 'valorMinimoParcela'): void {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    if (value === '') value = '0';
    
    value = (Number(value) / 100).toFixed(2);
    const formatted = this.formatarMoeda(Number(value));
    
    if (field === 'valorMinimo') {
      this.valorMinimoFormatado = formatted;
      this.formaPagamentoAtual.valorMinimo = Number(value);
    } else {
      this.valorMinimoParcelaFormatada = formatted;
      this.novaOpcao.valorMinimoParcela = Number(value);
    }
  }

  prepararEdicaoOpcao(opt: OpcaoParcelamento): void {
    this.novaOpcao = { ...opt };
    this.valorMinimoParcelaFormatada = this.formatarMoeda(opt.valorMinimoParcela || 0);
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
    if (confirm('Deseja remover esta regra de parcelamento?')) {
      this.opcaoParcelamentoService.delete(id).subscribe({
        next: () => this.carregarOpcoesParcelamento(this.formaPagamentoAtual.id!),
        error: (err) => alert(err.error || 'Erro ao remover opção de parcelamento')
      });
    }
  }
}
