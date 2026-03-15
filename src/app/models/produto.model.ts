export interface Produto {
    id?: number;
    nome: string;
    tamanho: number;
    peso?: number;
    preco?: number;
    codigo?: number;
    ativo: boolean;
    imagem: string; // Base64
    temImagem?: boolean;
}
