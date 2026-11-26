import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Integração nativa para Android e iOS via Capacitor:
 * - Intercepta o botão Voltar físico/gesto do Android para voltar telas no Router
 *   em vez de fechar o app imediatamente.
 * - Recebe Deep Links (`mytracklist://auth-callback` e `mytracklist://spotify-callback`)
 *   retornados pelo Chrome Custom Tabs após OAuth com Google ou Spotify.
 */
export default function NativeAppBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    let backHandle = null;

    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) return;

        import('@capacitor/app')
          .then(({ App }) => {
            App.addListener('backButton', ({ canGoBack }) => {
              if (location.pathname === '/' || location.pathname === '/login') {
                App.exitApp();
              } else if (canGoBack) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }).then((handle) => {
              backHandle = handle;
            });
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      if (backHandle) {
        backHandle.remove();
      }
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    let urlHandle = null;

    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) return;

        import('@capacitor/app')
          .then(({ App }) => {
            App.addListener('appUrlOpen', async ({ url }) => {
              if (!url) return;

              // Fecha o Chrome Custom Tab assim que o deep link volta para o app
              import('@capacitor/browser')
                .then(({ Browser }) => Browser.close().catch(() => {}))
                .catch(() => {});

              try {
                const parsed = new URL(url);
                const host = parsed.hostname || parsed.pathname.replace(/^\/+/, '');

                if (host === 'auth-callback') {
                  const token = parsed.searchParams.get('token');
                  const isNewUser = parsed.searchParams.get('isNewUser') === '1';
                  if (token) {
                    localStorage.setItem('mtl_token', token);
                    await refreshUser();
                    navigate(isNewUser ? '/login?onboarding=1' : '/', { replace: true });
                  }
                } else if (host === 'spotify-callback') {
                  navigate(`/settings${parsed.search}`, { replace: true });
                }
              } catch (err) {
                console.error('Erro ao processar deep link:', err);
              }
            }).then((handle) => {
              urlHandle = handle;
            });
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      if (urlHandle) {
        urlHandle.remove();
      }
    };
  }, [navigate, refreshUser]);

  return null;
}
