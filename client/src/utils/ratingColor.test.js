import { getRatingColor, getRatingMeta } from './ratingColor';

describe('ratingColor', () => {
  it.each([
    [0, '#EF4444'],
    [2, '#EF4444'],
    [3, '#F97316'],
    [5, '#38BDF8'],
    [7, '#84CC16'],
    [8, '#10B981'],
    [9, '#10B981'],
    [10, '#F5C518'],
  ])('nota %s usa a cor %s', (score, color) => {
    expect(getRatingColor(score)).toBe(color);
  });

  it('sem nota usa cinza neutro', () => {
    expect(getRatingColor(null)).toBe('#94A3B8');
    expect(getRatingColor(undefined)).toBe('#94A3B8');
    expect(getRatingColor('abc')).toBe('#94A3B8');
  });

  it('só a nota máxima é dourada', () => {
    expect(getRatingMeta(10)).toMatchObject({ isGold: true, label: 'Obra-prima' });
    expect(getRatingMeta(9).isGold).toBe(false);
  });
});

describe('destaque das notas extremas', () => {
  it('nota 0 é destacada com brilho vermelho', () => {
    const meta = getRatingMeta(0);
    expect(meta).toMatchObject({ isZero: true, isGold: false, isHighlight: true, label: 'Zero' });
    expect(meta.glow(0.5)).toBe('rgba(239, 68, 68, 0.5)');
  });

  it('nota 10 é destacada com brilho dourado', () => {
    const meta = getRatingMeta(10);
    expect(meta).toMatchObject({ isGold: true, isZero: false, isHighlight: true });
    expect(meta.glow(0.5)).toBe('rgba(245, 197, 24, 0.5)');
  });

  it.each([1, 5, 9])('nota %i não tem brilho', (score) => {
    const meta = getRatingMeta(score);
    expect(meta.isHighlight).toBe(false);
    expect(meta.glow(0.5)).toBeNull();
  });

  it('sem nota não é confundido com zero', () => {
    for (const empty of [null, undefined, '']) {
      expect(getRatingMeta(empty)).toMatchObject({ isZero: false, isHighlight: false });
    }
  });
});
