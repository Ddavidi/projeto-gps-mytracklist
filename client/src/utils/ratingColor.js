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

export function getRatingMeta(rawScore) {
  const score = Number(rawScore);
  const color = getRatingColor(rawScore);
  const isGold = !Number.isNaN(score) && score >= 9.5;

  let label = '';
  if (!Number.isNaN(score)) {
    if (score >= 9.5) label = 'Obra-prima';
    else if (score >= 8.0) label = 'Excelente';
    else if (score >= 6.5) label = 'Boa';
    else if (score >= 5.0) label = 'Mediana';
    else if (score >= 3.0) label = 'Fraca';
    else label = 'Ruim';
  }

  return { color, isGold, label };
}
