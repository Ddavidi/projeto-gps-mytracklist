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
