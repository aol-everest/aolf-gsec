import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Define custom colors
const colors = {
  primary: {
    // main: '#1976d2',
    main: '#F9B818',
    // light: '#42a5f5',
    light: '#E0C685',
    dark: '#BA8B18',
    contrastText: '#fff',
  },
  secondary: {
    main: 'rgba(249, 184, 24, 0.081)',
    light: 'rgba(249, 184, 24, 0.13)',
    // light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#fff',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  text: {
    primary: '#333',
    secondary: '#777',
  },
  success: {
    main: '#2ecc71',
    light: '#55D98D',
    dark: '#27ae60',
  },
  warning: {
    main: '#CEA70B',
    light: '#F4D03F',
    dark: '#f39c12',
  },
  error: {
    main: '#e74c3c',
    light: '#EC7063',
    dark: '#c0392b',
  },
  // menu: {
  //   main: 'rgba(249, 184, 24, 0.2)',
  //   light: 'rgba(249, 184, 24, 0.4)',
  //   dark: 'rgba(249, 184, 24, 0.2)',
  //   contrastText: 'rgba(249, 184, 24, 0.4)',
  // },
};

// Define typography settings
const typography = {
  fontFamily: [
    'Roboto',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontWeight: 400,
    fontSize: '1.7rem',
    lineHeight: 1.2,
    letterSpacing: '-0.01562em',
    fontFamily: 'Roboto Slab',
  },
  h2: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.2,
    letterSpacing: '-0.00833em',
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    lineHeight: 1.2,
    letterSpacing: '0em',
  },
  h4: {
    fontWeight: 400,
    fontSize: '1.7rem',
    lineHeight: 2,
    letterSpacing: '0.009em',
    marginBottom: '16px',
    fontFamily: 'Roboto Slab',
    color: colors.primary.main,
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.2,
    letterSpacing: '0em',
  },
  h6: {
    fontWeight: 400,
    fontSize: '1.1rem',
    lineHeight: 1.7,
    letterSpacing: '0.0075em',
    // marginBottom: '16px',
  },
  subtitle1: {
    fontSize: '1rem',
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  subtitle2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    letterSpacing: '0.00714em',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  body1: {
    fontSize: '0.91rem',
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    letterSpacing: '0.01071em',
  },
  button: {
    fontSize: '0.875rem',
    lineHeight: 1.75,
    letterSpacing: '0.02857em',
    textTransform: 'none' as const,
    fontWeight: 600,
  },
};

// Define component overrides
const components = {
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontSize: '0.9rem',
        fontFamily: 'Roboto',
        fontColor: '#999',
        fontWeight: 400,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      root: {
        fontSize: '0.9rem',
        fontFamily: 'Roboto',
        fontColor: '#999',
        fontWeight: 400,
        // padding: '14px 23px 14px 23px',
        width: '300px',
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        padding: '13px 23px 13px 23px',
      },
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: {
        minWidth: '40px',
        color: '#637381',
      },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      root: {
        fontSize: '0.9rem',
        fontFamily: 'Roboto',
        fontWeight: 400,
        color: '#637381',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        padding: '8px 24px',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        // borderRadius: '3px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        color: '#333',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      },
    },
  },
  MuiBox: {
    styleOverrides: {
      root: {
        padding: '0 0px',
        margin: '0 0px 0 0px',
      },
    },
  },
  MuiContainer: {
    styleOverrides: {
      root: {
        padding: '0 0px',
        margin: '0 0px 0 0px',
      },
    },
  },
};

// Create and export the theme
let theme = createTheme({
  palette: colors,
  typography,
  components,
  shape: {
    borderRadius: 8,
  },
});

// Make typography responsive
theme = responsiveFontSizes(theme);

export default theme; 