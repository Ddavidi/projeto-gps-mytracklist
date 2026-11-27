import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ReviewSection from './ReviewSection';
import { getUserReviewForItem, saveReview } from '../services/reviews';

vi.mock('../services/reviews', () => ({
  getUserReviewForItem: vi.fn(),
  saveReview: vi.fn(),
  deleteReview: vi.fn(),
}));

function tapScore(slider, score) {
  // Estrelas de 0..100px: a nota N fica em x = N*10 - 5.
  slider.getBoundingClientRect = () => ({ left: 0, right: 100, width: 100, top: 0, bottom: 30, height: 30, x: 0, y: 0 });
  const clientX = score * 10 - 5;
  fireEvent.pointerDown(slider, { clientX, pointerType: 'touch', pointerId: 1, button: 0 });
  fireEvent.pointerUp(slider, { clientX, pointerType: 'touch', pointerId: 1 });
}

describe('ReviewSection — publicar avaliação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deixa publicar sem nota', async () => {
    getUserReviewForItem.mockResolvedValue(null);
    render(<ReviewSection itemType="album" itemId="album-1" itemData={{ name: 'Sempiternal' }} defaultEditing />);

    const publish = await screen.findByRole('button', { name: 'Publicar Avaliação' });
    expect(publish).toBeDisabled();
  });

  it('envia exatamente a nota que aparece nas estrelas', async () => {
    getUserReviewForItem.mockResolvedValue(null);
    saveReview.mockResolvedValue({ reviewId: 42 });
    const onSaved = vi.fn();
    render(
      <ReviewSection itemType="album" itemId="album-1" itemData={{ name: 'Sempiternal' }} defaultEditing onReviewSaved={onSaved} />
    );

    const slider = await screen.findByRole('slider');
    tapScore(slider, 9);
    tapScore(slider, 10);
    expect(slider).toHaveAttribute('aria-valuenow', '10');

    fireEvent.click(screen.getByRole('button', { name: 'Publicar Avaliação' }));

    await waitFor(() => expect(saveReview).toHaveBeenCalledTimes(1));
    const [itemType, itemId, rating, , existingId, metadata] = saveReview.mock.calls[0];
    expect(itemType).toBe('album');
    expect(itemId).toBe('album-1');
    expect(rating).toBe(10);
    expect(existingId).toBeNull();
    expect(metadata).toMatchObject({ itemName: 'Sempiternal' });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(await screen.findByText('Avaliação salva com sucesso!')).toBeInTheDocument();
  });

  it('permite publicar com nota 0', async () => {
    getUserReviewForItem.mockResolvedValue(null);
    saveReview.mockResolvedValue({ reviewId: 1 });
    render(<ReviewSection itemType="album" itemId="album-1" itemData={{ name: 'Disco' }} defaultEditing />);

    fireEvent.click(await screen.findByRole('button', { name: 'Dar nota 0' }));
    const publish = screen.getByRole('button', { name: 'Publicar Avaliação' });
    expect(publish).toBeEnabled();
    fireEvent.click(publish);

    await waitFor(() => expect(saveReview).toHaveBeenCalledTimes(1));
    expect(saveReview.mock.calls[0][2]).toBe(0);
  });

  it('ao editar uma avaliação existente, atualiza a mesma review com a nova nota', async () => {
    getUserReviewForItem.mockResolvedValue({ id: 7, rating: 9, review_text: 'Muito bom', visibility: 'public' });
    saveReview.mockResolvedValue({});
    render(<ReviewSection itemType="album" itemId="album-1" itemData={{ name: 'Sempiternal' }} defaultEditing />);

    const slider = await screen.findByRole('slider');
    await waitFor(() => expect(slider).toHaveAttribute('aria-valuenow', '9'));
    tapScore(slider, 10);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(saveReview).toHaveBeenCalledTimes(1));
    const [, , rating, text, existingId] = saveReview.mock.calls[0];
    expect(rating).toBe(10);
    expect(text).toBe('Muito bom');
    expect(existingId).toBe(7);
  });
});
