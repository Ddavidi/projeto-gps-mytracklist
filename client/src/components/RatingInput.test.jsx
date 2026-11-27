import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import RatingInput from './RatingInput';

// As estrelas ocupam 0..100px na horizontal: cada meia estrela = 10px = 1 ponto.
const STARS_WIDTH = 100;

function mockStarsBox(el) {
  el.getBoundingClientRect = () => ({ left: 0, right: STARS_WIDTH, width: STARS_WIDTH, top: 0, bottom: 30, height: 30, x: 0, y: 0 });
}

function tap(el, clientX, pointerType = 'touch') {
  fireEvent.pointerDown(el, { clientX, pointerType, pointerId: 1, button: 0 });
  fireEvent.pointerUp(el, { clientX, pointerType, pointerId: 1 });
}

function Controlled({ initial = null, onChangeSpy }) {
  const [value, setValue] = useState(initial);
  return (
    <RatingInput
      value={value}
      onChange={(v) => {
        onChangeSpy?.(v);
        setValue(v);
      }}
    />
  );
}

function setup(props) {
  render(<Controlled {...props} />);
  const slider = screen.getByRole('slider');
  mockStarsBox(slider);
  return slider;
}

describe('RatingInput', () => {
  it.each([
    [5, 1],    // começo da 1ª estrela
    [45, 5],   // metade esquerda da 3ª estrela
    [85, 9],   // metade esquerda da 5ª estrela
    [95, 10],  // metade direita da 5ª estrela
    [100, 10], // borda direita
  ])('tocar em x=%ipx dá nota %i', (x, expected) => {
    const slider = setup();
    tap(slider, x);
    expect(slider).toHaveAttribute('aria-valuenow', String(expected));
    expect(screen.getByText(`${expected}/10`)).toBeInTheDocument();
  });

  it('as estrelas exibidas sempre batem com a nota salva (bug do 10/10 com 4,5 estrelas)', () => {
    const slider = setup();
    tap(slider, 85); // 9
    tap(slider, 95); // 10
    expect(slider).toHaveAttribute('aria-valuenow', '10');
    expect(slider).toHaveAttribute('data-score', '10');
    tap(slider, 85); // volta para 9
    expect(slider).toHaveAttribute('aria-valuenow', '9');
    expect(slider).toHaveAttribute('data-score', '9');
  });

  it('tocar de novo na mesma nota não apaga a avaliação', () => {
    const spy = vi.fn();
    const slider = setup({ onChangeSpy: spy });
    tap(slider, 95);
    tap(slider, 95);
    tap(slider, 95);
    expect(slider).toHaveAttribute('aria-valuenow', '10');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalledWith(null);
  });

  it('arrastar o dedo ajusta a nota e só salva ao soltar', () => {
    const spy = vi.fn();
    const slider = setup({ onChangeSpy: spy });
    fireEvent.pointerDown(slider, { clientX: 5, pointerType: 'touch', pointerId: 1, button: 0 });
    fireEvent.pointerMove(slider, { clientX: 35, pointerType: 'touch', pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 65, pointerType: 'touch', pointerId: 1 });
    expect(spy).not.toHaveBeenCalled();
    expect(slider).toHaveAttribute('data-score', '7'); // prévia
    fireEvent.pointerUp(slider, { clientX: 65, pointerType: 'touch', pointerId: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(7);
  });

  it('rolagem cancelada pelo navegador não muda a nota', () => {
    const spy = vi.fn();
    const slider = setup({ initial: 6, onChangeSpy: spy });
    fireEvent.pointerDown(slider, { clientX: 95, pointerType: 'touch', pointerId: 1, button: 0 });
    fireEvent.pointerCancel(slider, { pointerId: 1 });
    expect(spy).not.toHaveBeenCalled();
    expect(slider).toHaveAttribute('data-score', '6');
  });

  it('funciona pelo teclado, inclusive nota 0', () => {
    const slider = setup({ initial: 5 });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '6');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '4');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '10');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(slider, { key: '7' });
    expect(slider).toHaveAttribute('aria-valuenow', '7');
  });

  it('em modo leitura não é interativo e descreve a nota', () => {
    const onChange = vi.fn();
    render(<RatingInput value={8} readOnly onChange={onChange} />);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Nota 8 de 10' });
    tap(img, 95);
    expect(onChange).not.toHaveBeenCalled();
  });
});
