/**
 * Medidas compartilhadas entre a barra de navegação inferior (mobile), o player global e o <main>,
 * para que um nunca cubra o outro nem o conteúdo da página.
 */
export const BOTTOM_NAV_HEIGHT = 62;
export const PLAYER_HEIGHT = 80;
/** Espaço entre o player flutuante (mobile) e o que estiver abaixo dele. */
export const PLAYER_MOBILE_GAP = 8;

const ROUTES_WITHOUT_BOTTOM_NAV = ['/login', '/register'];

export function isBottomNavHidden(pathname) {
  return ROUTES_WITHOUT_BOTTOM_NAV.includes(pathname);
}
