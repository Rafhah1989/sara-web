export enum Role {
    ADMIN = 'ADMIN',
    CLIENTE = 'CLIENTE'
}

export interface Usuario {
    id?: number;
    nome: string;
    cep: string;
    endereco: string;
    numero: string;
    cidade: string;
    uf: string;
    cpfCnpj: string;
    email: string;
    token?: string;
    dataExpiracao?: string;
    telefone: string;
    bairro: string;
    observacao?: string;
    padre?: string;
    secretario?: string;
    tesoureiro?: string;
    formaPagamento?: string;
    desconto?: number;
    modalidadeEntrega?: string;
    setorId?: number;
    tabelaFreteId?: number;
    role: Role;
    senha?: string;
    ativo?: boolean;
    metodoPagamentoAutorizado: import('./metodo-pagamento-autorizado.enum').MetodoPagamentoAutorizado;
}
