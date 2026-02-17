export interface Produto {
    id?: number;
    nome: string;
    tamanho: number;
    peso?: number;
    ativo: boolean;
    imagem: string; // Base64
}
