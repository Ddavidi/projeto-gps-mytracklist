/**
 * E-mails que viram administradores automaticamente ao entrar.
 * Configurado pela variável de ambiente ADMIN_EMAILS (separados por vírgula), ex.:
 *   ADMIN_EMAILS=pessoa@exemplo.com,outra@exemplo.com
 * Assim nenhum e-mail fica fixo no código e dá para mudar sem novo deploy do código.
 */
export function getAdminEmails(): string[] {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(String(email).trim().toLowerCase());
}
