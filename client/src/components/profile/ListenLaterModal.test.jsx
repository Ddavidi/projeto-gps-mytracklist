import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ListenLaterModal from './ListenLaterModal';
import { getUserListenLater } from '../../services/listenLater';

vi.mock('../../services/listenLater', () => ({
  getUserListenLater: vi.fn(),
  removeListenLater: vi.fn(),
  reorderListenLater: vi.fn(),
  updateListenLaterVisibility: vi.fn(),
}));

const renderModal = (props) =>
  render(
    <MemoryRouter>
      <ListenLaterModal onClose={() => {}} {...props} />
    </MemoryRouter>
  );

describe('ListenLaterModal — carregamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserListenLater.mockResolvedValue({ items: [], visibility: 'public', isPrivate: false });
  });

  it('não carrega nada enquanto está fechado', () => {
    renderModal({ open: false, userId: 1 });
    expect(getUserListenLater).not.toHaveBeenCalled();
  });

  it('carrega uma vez ao abrir, sem repetir a cada renderização', async () => {
    const { rerender } = renderModal({ open: true, userId: 1 });
    await waitFor(() => expect(getUserListenLater).toHaveBeenCalledTimes(1));
    rerender(
      <MemoryRouter>
        <ListenLaterModal open userId={1} onClose={() => {}} />
      </MemoryRouter>
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(getUserListenLater).toHaveBeenCalledTimes(1);
  });

  it('recarrega ao trocar de usuário e ao reabrir', async () => {
    const { rerender } = renderModal({ open: true, userId: 1 });
    await waitFor(() => expect(getUserListenLater).toHaveBeenCalledWith(1));

    const wrap = (props) => (
      <MemoryRouter>
        <ListenLaterModal onClose={() => {}} {...props} />
      </MemoryRouter>
    );
    rerender(wrap({ open: true, userId: 2 }));
    await waitFor(() => expect(getUserListenLater).toHaveBeenCalledWith(2));

    rerender(wrap({ open: false, userId: 2 }));
    rerender(wrap({ open: true, userId: 2 }));
    await waitFor(() => expect(getUserListenLater).toHaveBeenCalledTimes(3));
  });

  it('abre sem erro e mostra as seções (regressão do ícone das seções)', async () => {
    getUserListenLater.mockResolvedValue({
      items: [{ id: 1, item_id: 'a1', item_type: 'album', item_name: 'Sempiternal' }],
      visibility: 'public',
      isPrivate: false,
    });
    renderModal({ open: true, userId: 1 });
    expect(await screen.findByText('Álbuns')).toBeInTheDocument();
  });

  it('mostra aviso de lista privada para visitantes', async () => {
    getUserListenLater.mockResolvedValue({ items: [], isPrivate: true, visibility: 'private' });
    renderModal({ open: true, userId: 1 });
    expect(await screen.findByText('Esta lista é privada')).toBeInTheDocument();
  });
});
