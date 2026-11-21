import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const PALETTES = [
  {
    id: 'vinyl-emerald',
    name: 'Vinil Esmeralda',
    tagline: 'Escuro profundo com verde vinil clássico e acentos âmbar.',
    inspiration: 'Letterboxd & Vinil Clássico',
    mode: 'dark',
    bg: '#0B0E11',
    surface: '#12171D',
    elevated: '#19212A',
    primary: '#1ED760',
    primaryContrast: '#06140A',
    secondary: '#F59E0B',
    text: '#F2F5F7',
    textMuted: '#8D9AA8',
    border: 'rgba(242, 245, 247, 0.08)',
    swatches: ['#0B0E11', '#12171D', '#1ED760', '#F59E0B'],
  },
  {
    id: 'crimson-studio',
    name: 'Estúdio Carmesim',
    tagline: 'Carvão quente de estúdio com vermelho carmesim vibrante.',
    inspiration: 'Musicboard & Apple Music',
    mode: 'dark',
    bg: '#0D0A0C',
    surface: '#161114',
    elevated: '#21191E',
    primary: '#F43F5E',
    primaryContrast: '#FFFFFF',
    secondary: '#FBBF24',
    text: '#FAF5F6',
    textMuted: '#A8949B',
    border: 'rgba(250, 245, 246, 0.08)',
    swatches: ['#0D0A0C', '#161114', '#F43F5E', '#FBBF24'],
  },
  {
    id: 'midnight-cobalt',
    name: 'Noite Cobalto',
    tagline: 'Azul-noite cinematográfico com azul ciano limpo e alta legibilidade.',
    inspiration: 'AniList Dark',
    mode: 'dark',
    bg: '#0B111C',
    surface: '#121C2C',
    elevated: '#1A273D',
    primary: '#38BDF8',
    primaryContrast: '#06131E',
    secondary: '#A78BFA',
    text: '#EDF3FC',
    textMuted: '#8BA0BC',
    border: 'rgba(237, 243, 252, 0.08)',
    swatches: ['#0B111C', '#121C2C', '#38BDF8', '#A78BFA'],
  },
  {
    id: 'amber-analog',
    name: 'Fita Analógica',
    tagline: 'Ônix quente com laranja queimado de equipamentos Hi-Fi vintage.',
    inspiration: 'Hi-Fi & Estúdio Analógico',
    mode: 'dark',
    bg: '#100E0C',
    surface: '#1A1613',
    elevated: '#26201B',
    primary: '#F97316',
    primaryContrast: '#160902',
    secondary: '#EAB308',
    text: '#F7F3EE',
    textMuted: '#A89B8E',
    border: 'rgba(247, 243, 238, 0.09)',
    swatches: ['#100E0C', '#1A1613', '#F97316', '#EAB308'],
  },
  {
    id: 'velvet-plum',
    name: 'Veludo Noturno',
    tagline: 'Atmosfera de casa de show noturna em berinjela, orquídea e turquesa.',
    inspiration: 'Jazz Club & R&B',
    mode: 'dark',
    bg: '#0E0B14',
    surface: '#171222',
    elevated: '#221B32',
    primary: '#E879F9',
    primaryContrast: '#1A071E',
    secondary: '#2DD4BF',
    text: '#F6F2FA',
    textMuted: '#A396B5',
    border: 'rgba(246, 242, 250, 0.09)',
    swatches: ['#0E0B14', '#171222', '#E879F9', '#2DD4BF'],
  },
  {
    id: 'ivory-press',
    name: 'Editorial Marfim',
    tagline: 'Tema claro inspirado em revistas musicais impressas e encartes.',
    inspiration: 'Revista Editorial & Pitchfork',
    mode: 'light',
    bg: '#F5F2EB',
    surface: '#FFFFFF',
    elevated: '#ECE7DC',
    primary: '#15803D',
    primaryContrast: '#FFFFFF',
    secondary: '#C2410C',
    text: '#161614',
    textMuted: '#5C5A52',
    border: 'rgba(22, 22, 20, 0.10)',
    swatches: ['#F5F2EB', '#FFFFFF', '#15803D', '#C2410C'],
  },
];

const STORAGE_KEY = 'mtl_palette_id';

const ThemeModeContext = createContext();

export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeModeProvider({ children }) {
  const [paletteId, setPaletteId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return PALETTES.some((p) => p.id === saved) ? saved : 'vinyl-emerald';
  });

  const palette = useMemo(
    () => PALETTES.find((p) => p.id === paletteId) || PALETTES[0],
    [paletteId]
  );

  const selectPalette = (id) => {
    if (PALETTES.some((p) => p.id === id)) {
      setPaletteId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  // Sincroniza CSS custom properties para scrollbar, ::selection, foco e efeitos nativos
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--mtl-bg', palette.bg);
    root.style.setProperty('--mtl-surface', palette.surface);
    root.style.setProperty('--mtl-elevated', palette.elevated);
    root.style.setProperty('--mtl-primary', palette.primary);
    root.style.setProperty('--mtl-primary-contrast', palette.primaryContrast);
    root.style.setProperty('--mtl-secondary', palette.secondary);
    root.style.setProperty('--mtl-text', palette.text);
    root.style.setProperty('--mtl-text-muted', palette.textMuted);
    root.style.setProperty('--mtl-border', palette.border);
    root.setAttribute('data-theme-mode', palette.mode);

    // Sincroniza theme-color do navegador / PWA / StatusBar mobile
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', palette.bg);
    }
    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
            StatusBar.setBackgroundColor({ color: palette.bg }).catch(() => {});
            StatusBar.setStyle({ style: palette.mode === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [palette]);

  const muiTheme = useMemo(() => {
    const isDark = palette.mode === 'dark';

    return createTheme({
      palette: {
        mode: palette.mode,
        primary: {
          main: palette.primary,
          contrastText: palette.primaryContrast,
        },
        secondary: {
          main: palette.secondary,
        },
        background: {
          default: palette.bg,
          paper: palette.surface,
        },
        text: {
          primary: palette.text,
          secondary: palette.textMuted,
        },
        divider: palette.border,
        warning: {
          main: palette.secondary,
        },
        success: {
          main: palette.primary,
        },
      },
      shape: {
        borderRadius: 12,
      },
      typography: {
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        h1: {
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.08,
        },
        h2: {
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          lineHeight: 1.12,
        },
        h3: {
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.18,
        },
        h4: {
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        },
        h5: {
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.015em',
        },
        h6: {
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        },
        button: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '-0.005em',
        },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: palette.bg,
              color: palette.text,
            },
          },
        },
        MuiPaper: {
          defaultProps: {
            elevation: 0,
          },
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
            },
          },
        },
        MuiCard: {
          defaultProps: {
            elevation: 0,
          },
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 14,
            },
          },
        },
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
          styleOverrides: {
            root: {
              borderRadius: 10,
              padding: '8px 18px',
              transition: 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.18s ease, border-color 0.18s ease',
              '&:active': {
                transform: 'scale(0.98)',
              },
            },
            containedPrimary: {
              color: palette.primaryContrast,
              '&:hover': {
                backgroundColor: alpha(palette.primary, 0.88),
              },
            },
            outlined: {
              borderColor: palette.border,
              '&:hover': {
                borderColor: palette.primary,
                backgroundColor: alpha(palette.primary, 0.08),
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 600,
              borderRadius: 999,
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 10,
                backgroundColor: isDark ? alpha(palette.elevated, 0.65) : palette.surface,
                '& fieldset': {
                  borderColor: palette.border,
                },
                '&:hover fieldset': {
                  borderColor: alpha(palette.text, 0.25),
                },
                '&.Mui-focused fieldset': {
                  borderColor: palette.primary,
                  borderWidth: 1.5,
                },
              },
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundColor: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: 16,
              boxShadow: isDark
                ? '0 24px 64px rgba(0, 0, 0, 0.65)'
                : '0 24px 64px rgba(20, 20, 18, 0.18)',
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 46,
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              backgroundColor: palette.elevated,
              color: palette.text,
              border: `1px solid ${palette.border}`,
              fontSize: '0.75rem',
              fontWeight: 500,
            },
          },
        },
      },
    });
  }, [palette]);

  return (
    <ThemeModeContext.Provider value={{ palette, paletteId, selectPalette, palettes: PALETTES }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}

