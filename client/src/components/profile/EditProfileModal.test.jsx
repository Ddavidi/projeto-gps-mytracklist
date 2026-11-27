import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import EditProfileModal from './EditProfileModal';
import { getUserFavorites } from '../../services/favorites';
import { searchMulti } from '../../services/spotify';

vi.mock('../../services/favorites', () => ({
  getUserFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));
vi.mock('../../services/spotify', () => ({
  searchMulti: vi.fn(),
  getMultipleTrackDetails: vi.fn().mockResolvedValue({}),
  getMultipleAlbumDetails: vi.fn().mockResolvedValue({}),
  getMultipleArtistDetails: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../services/userService', () => ({ uploadAvatar: vi.fn(), uploadCover: vi.fn() }));
vi.mock('./ImageCropperModal', () => ({ default: () => null }));

const album = (id, name) => ({ id, name, artists: [{ name: 'Artista' }], images: [] });

function renderModal(props = {}) {
  const utils = render(
    <MemoryRouter>
      <EditProfileModal open onClose={() => {}} userProfile={{ id: 7, username: 'alice' }} {...props} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText('Favoritos do Perfil'));
  return utils;
}

describe('EditProfileModal — favoritos e busca', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserFavorites.mockResolvedValue([]);
    searchMulti.mockResolvedValue({ tracks: [], albums: [], artists: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carrega os favoritos uma vez ao abrir', async () => {
    renderModal();
    await waitFor(() => expect(getUserFavorites).toHaveBeenCalledWith(7));
    await new Promise((r) => setTimeout(r, 20));
    expect(getUserFavorites).toHaveBeenCalledTimes(1);
  });

  it('só busca depois que a pessoa para de digitar (400ms) e com 2+ letras', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderModal();
    const input = screen.getByPlaceholderText('Pesquisar álbuns no Spotify...');

    fireEvent.change(input, { target: { value: 's' } });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(searchMulti).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'se' } });
    fireEvent.change(input, { target: { value: 'sem' } });
    fireEvent.change(input, { target: { value: 'semp' } });
    await act(() => vi.advanceTimersByTimeAsync(450));
    expect(searchMulti).toHaveBeenCalledTimes(1);
    expect(searchMulti).toHaveBeenCalledWith('semp');
  });

  it('descarta resultado atrasado de uma busca antiga', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveOld;
    searchMulti.mockImplementation((q) =>
      q === 'velha'
        ? new Promise((r) => {
            resolveOld = r;
          })
        : Promise.resolve({ tracks: [], albums: [album('novo', 'Resultado Novo')], artists: [] })
    );
    renderModal();
    const input = screen.getByPlaceholderText('Pesquisar álbuns no Spotify...');

    fireEvent.change(input, { target: { value: 'velha' } });
    await act(() => vi.advanceTimersByTimeAsync(450));
    fireEvent.change(input, { target: { value: 'nova' } });
    await act(() => vi.advanceTimersByTimeAsync(450));
    expect(await screen.findByText('Resultado Novo')).toBeInTheDocument();

    await act(async () => {
      resolveOld({ tracks: [], albums: [album('velho', 'Resultado Velho')], artists: [] });
    });
    expect(screen.queryByText('Resultado Velho')).not.toBeInTheDocument();
    expect(screen.getByText('Resultado Novo')).toBeInTheDocument();
  });
});
