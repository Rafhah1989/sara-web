/**
 * Utilitário para normalização de strings (remoção de acentos)
 */
export function removerAcentos(str: string): string {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Compara duas strings de forma insensível a acentos e caso
 */
export function compararSemAcento(str1: string, str2: string): boolean {
    if (!str1 || !str2) return false;
    const n1 = removerAcentos(str1).toLowerCase();
    const n2 = removerAcentos(str2).toLowerCase();
    return n1.includes(n2);
}
