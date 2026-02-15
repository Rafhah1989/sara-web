import { Frete } from './frete.model';

export interface Setor {
    id?: number;
    descricao: string;
    ativo: boolean;
    tabelasFrete?: Frete[];
    tabelasFreteIds?: number[];
}
