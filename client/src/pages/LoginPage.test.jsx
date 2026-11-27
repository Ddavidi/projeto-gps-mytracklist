import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from './LoginPage';
import api from '../services/api';

const setAuth = vi.fn();
const login = vi.fn();

vi.mock('../services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('../services/spotify', () => ({ getTrending: vi.fn().mockResolvedValue({ albums: [] }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ login, setAuth }) }));
vi.mock('../components/OnboardingFlow', () => ({ default: () => null }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Página inicial</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function typeIdentifier(value) {
  const input = screen.getAllByRole('textbox')[0];
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('LoginPage — entrar com código por e-mail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conta criada pelo Google: oferece Google ou código, e o código faz login', async () => {
    api.post.mockImplementation(async (url) => {
      if (url === '/auth/check') return { data: { exists: true, isEmail: true, isGoogleOnly: true } };
      if (url === '/auth/login-code/request') return { data: { email: 'al•••@gmail.com' } };
      if (url === '/auth/login-code/verify') return { data: { token: 'jwt-123', user: { id: 1, username: 'alice' } } };
      throw new Error(`rota inesperada ${url}`);
    });
    renderLogin();

    await typeIdentifier('alice@gmail.com');
    expect(await screen.findByText(/Você criou esta conta com o Google/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Senha/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Entrar com código por e-mail/ }));
    expect(await screen.findByText(/Enviamos um código de 6 dígitos para al•••@gmail.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reenviar código em \d+s/ })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Código \(6 dígitos\)/), { target: { value: '12a34 56' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/login-code/verify', { identifier: 'alice@gmail.com', code: '123456' })
    );
    expect(setAuth).toHaveBeenCalledWith('jwt-123', { id: 1, username: 'alice' });
    expect(await screen.findByText('Página inicial')).toBeInTheDocument();
  });

  it('conta com senha: pede a senha e também oferece entrar sem senha', async () => {
    api.post.mockImplementation(async (url) => {
      if (url === '/auth/check') return { data: { exists: true, isEmail: true, isGoogleOnly: false } };
      if (url === '/auth/login-code/request') return { data: { email: 'bo•••@example.com' } };
      throw new Error(`rota inesperada ${url}`);
    });
    renderLogin();

    await typeIdentifier('bob@example.com');
    expect(await screen.findByLabelText(/Senha/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Entrar sem senha/ }));
    expect(await screen.findByText(/Enviamos um código de 6 dígitos para bo•••@example.com/)).toBeInTheDocument();
  });

  it('mostra o erro do servidor quando o código está errado', async () => {
    api.post.mockImplementation(async (url) => {
      if (url === '/auth/check') return { data: { exists: true, isEmail: true, isGoogleOnly: true } };
      if (url === '/auth/login-code/request') return { data: { email: 'al•••@gmail.com' } };
      if (url === '/auth/login-code/verify') {
        const err = new Error('401');
        err.response = { data: { error: 'Código incorreto.' } };
        throw err;
      }
      throw new Error(`rota inesperada ${url}`);
    });
    renderLogin();

    await typeIdentifier('alice@gmail.com');
    fireEvent.click(await screen.findByRole('button', { name: /Entrar com código por e-mail/ }));
    fireEvent.change(await screen.findByLabelText(/Código \(6 dígitos\)/), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Código incorreto.')).toBeInTheDocument();
    expect(setAuth).not.toHaveBeenCalled();
  });
});
