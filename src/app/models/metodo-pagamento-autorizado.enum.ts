export enum MetodoPagamentoAutorizado {
    APENAS_NA_ENTREGA = 'APENAS_NA_ENTREGA',
    ENTREGA_E_ONLINE = 'ENTREGA_E_ONLINE',
    APENAS_ONLINE = 'APENAS_ONLINE'
}

export const MetodoPagamentoAutorizadoLabels = {
    [MetodoPagamentoAutorizado.APENAS_NA_ENTREGA]: 'Apenas na entrega',
    [MetodoPagamentoAutorizado.ENTREGA_E_ONLINE]: 'Na entrega ou online',
    [MetodoPagamentoAutorizado.APENAS_ONLINE]: 'Apenas online'
};
