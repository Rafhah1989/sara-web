export interface Frete {
    id?: number;
    descricao: string;
    valor: number;
    ativo: boolean;
    quantidadeFaixa?: number;
    valorFaixa?: number;
    minimoFaixa?: number;
}
