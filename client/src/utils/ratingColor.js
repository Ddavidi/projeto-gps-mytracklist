/**
 * Paleta semântica de cores por nota (0 a 10).
 * Escala progressiva: vermelho (ruim) -> laranja -> âmbar -> verde lima -> esmeralda -> dourado (obra-prima / nota máxima).
 */
export function getRatingColor(rawScore) {
  if (rawScore === null || rawScore === undefined || Number.isNaN(Number(rawScore))) {
    return '#94A3B8';
  }
  const score = Number(rawScore);

  if (score >= 9.5) return '#F5C518'; // Dourado (10)
  if (score >= 8.0) return '#10B981'; // Esmeralda (8 - 9)
  if (score >= 6.5) return '#84CC16'; // Verde lima (7)
  if (score >= 5.0) return '#38BDF8'; // Azul celeste (5 - 6)
  if (score >= 3.0) return '#F97316'; // Laranja (3 - 4)
  return '#EF4444'; // Vermelho (0 - 2)
}

const GLOW_RGB = {
  gold: '245, 197, 24', // nota 10
  zero: '239, 68, 68', // nota 0
};

/**
 * Metadados visuais de uma nota.
 * As notas extremas (0 e 10) ganham destaque com brilho: dourado no 10, vermelho no 0.
 * - isGold / isZero: qual extremo é
 * - isHighlight: true para 0 ou 10
 * - glow(alpha): cor do brilho em rgba (ou null se a nota não tem destaque)
 */
export function getRatingMeta(rawScore) {
  const hasScore = rawScore !== null && rawScore !== undefined && rawScore !== '' && !Number.isNaN(Number(rawScore));
  const score = Number(rawScore);
  const color = getRatingColor(rawScore);
  const isGold = hasScore && score >= 9.5;
  const isZero = hasScore && score === 0;
  const isHighlight = isGold || isZero;
  const glowRgb = isGold ? GLOW_RGB.gold : isZero ? GLOW_RGB.zero : null;
  const glow = (alpha) => (glowRgb ? `rgba(${glowRgb}, ${alpha})` : null);

  let label = '';
  if (hasScore) {
    if (score >= 9.5) label = 'Obra-prima';
    else if (score >= 8.0) label = 'Excelente';
    else if (score >= 6.5) label = 'Boa';
    else if (score >= 5.0) label = 'Mediana';
    else if (score >= 3.0) label = 'Fraca';
    else if (score > 0) label = 'Ruim';
    else label = 'Zero';
  }

  return { color, isGold, isZero, isHighlight, glow, label };
}
