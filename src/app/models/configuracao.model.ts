export interface Configuracao {
    id?: number;
    mailHost: string;
    mailPort: number;
    mailUsername: string;
    mailPassword?: string;
    mailAuth: boolean;
    mailStarttls: boolean;
    emailsNotificacao: string;
    emailAtivo: boolean;
}
