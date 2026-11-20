import React, { useEffect, useState } from 'react';
import { TextField } from '@mui/material';
import { formatCalendarDate, toIsoCalendarDate } from '../utils/date';

/**
 * Campo de data no formato brasileiro (DD/MM/AAAA), independente do idioma do navegador.
 * Recebe e devolve a data no formato 'AAAA-MM-DD' (usado pela API).
 */
function applyMask(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBrDate(text) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return { iso: '', error: '' };

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate) return { iso: '', error: 'Data inválida.' };

  const today = new Date();
  if (year < 1900 || date > today) return { iso: '', error: 'Informe uma data de nascimento válida.' };

  return { iso: `${yyyy}-${mm}-${dd}`, error: '' };
}

export default function BirthDateField({ value, onChange, label = 'Data de Nascimento', ...props }) {
  const [text, setText] = useState(() => formatCalendarDate(toIsoCalendarDate(value)));
  const [error, setError] = useState('');

  // Sincroniza quando o valor externo muda (ex: dados do usuário carregados depois)
  useEffect(() => {
    const iso = toIsoCalendarDate(value);
    if (iso && parseBrDate(text).iso !== iso) {
      setText(formatCalendarDate(iso));
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    const masked = applyMask(e.target.value);
    setText(masked);

    if (masked.length < 10) {
      setError('');
      onChange('');
      return;
    }

    const { iso, error: parseError } = parseBrDate(masked);
    setError(parseError);
    onChange(iso);
  };

  return (
    <TextField
      {...props}
      label={label}
      value={text}
      onChange={handleChange}
      placeholder="DD/MM/AAAA"
      error={Boolean(error)}
      helperText={error || props.helperText}
      InputLabelProps={{ shrink: true }}
      inputProps={{ inputMode: 'numeric', maxLength: 10 }}
    />
  );
}

