import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Integração nativa para Android e iOS via Capacitor:
 * - Intercepta o botão Voltar físico/gesto do Android para voltar telas no Router
 *   em vez de fechar o app imediatamente.
 */
export default function NativeAppBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let listenerHandle = null;

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
              listenerHandle = handle;
            });
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate, location.pathname]);

  return null;
}
