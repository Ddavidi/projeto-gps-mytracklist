// Utilitários de data/hora padronizados: sempre em pt-BR e no horário de Brasília.

export const LOCALE = 'pt-BR';
export const TIME_ZONE = 'America/Sao_Paulo';

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Data (ex: 19/11/2026). Aceita opções do Intl para outros formatos (ex: { month: 'short' }).
 */
export function formatDate(value, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleDateString(LOCALE, { timeZone: TIME_ZONE, ...options });
}

/**
 * Data curta com mês por extenso abreviado (ex: 19 de nov. de 2026).
 */
export function formatDateShort(value) {
  return formatDate(value, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Data e hora (ex: 19/11/2026 23:26).
 */
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleString(LOCALE, {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Apenas hora (ex: 23:26).
 */
export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleTimeString(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
}

/**
 * Datas "de calendário" sem horário (ex: data de nascimento, lançamento de álbum no Spotify).
 * Aceita 'AAAA', 'AAAA-MM' ou 'AAAA-MM-DD' (ou ISO completo) e NÃO aplica fuso horário,
 * evitando que a data "volte um dia" por causa da conversão de UTC.
 */
export function formatCalendarDate(value) {
  if (!value) return '';
  const str = String(value).slice(0, 10);
  const [year, month, day] = str.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  if (year && month) return `${month}/${year}`;
  return year || '';
}

/**
 * Converte qualquer valor de data de calendário para 'AAAA-MM-DD' (formato salvo no banco).
 */
export function toIsoCalendarDate(value) {
  if (!value) return '';
  const str = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(str) ? str.slice(0, 10) : '';
}

