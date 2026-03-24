export interface OpcaoParcelamento {
    id?: number;
    formaPagamentoId: number;
    formaPagamentoDescricao?: string;
    qtdMaxParcelas: number;
    diasVencimentoIntervalo: number;
    valorMinimoParcela: number;
}
