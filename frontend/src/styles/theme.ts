import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Define custom colors
const colors = {
  primary: {
    // main: '#1976d2',
    // Yellow
    // main: '#F9B818',
    // Orange (from Alex)
    main: '#ED994E',
    // light: '#42a5f5',
    light: '#E0C685',
    dark: '#BA8B18',
    contrastText: '#fff',
  },
  secondary: {
    // Yellow
    // main: 'rgba(249, 184, 24, 0.081)',
    // light: 'rgba(249, 184, 24, 0.13)',
    // Orange (from Alex)
    // main: '#FFFAF5',
    main: 'rgba(255, 250, 245, 1)',
    light: 'rgba(255, 250, 245, 0.81)',
    // light: '#ba68c8',
    dark: '#333',
    contrastText: '#fff',
  },
  info: {
    main: '#3D8BE8',
    light: 'rgba(2, 136, 209, 0.081)',
    dark: 'rgba(2, 136, 209, 0.20)',
  },
  divider: 'rgba(0, 0, 0, 0.13)',
  background: {
    default: '#FFFAF5',
    paper: '#ffffff',
  },
  text: {
    primary: '#6F7283',
    secondary: '#9598A6',
  },
  success: {
    // main: '#2ecc71',
    // light: '#55D98D',
    // dark: '#27ae60',
    main: '#45B26B',
    light: '#F0F9F3',
    dark: '#D0EDDA',
  },
  warning: {
    // main: '#CEA70B',
    // light: '#F4D03F',
    // dark: '#f39c12',
    main: '#F7C250',
    light: '#FEFAF0',
    dark: '#FCE5B6',
  },
  error: {
    // main: '#e74c3c',
    // light: '#EC7063',
    // dark: '#c0392b',
    main: '#F16462',
    light: '#FEF1F1',
    dark: '#FAC8C7',
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
    'Work Sans',
    'Roboto',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2rem',
    lineHeight: 1.5,
    // letterSpacing: '0.009em',
    letterSpacing: '-0.01em',
    fontWeight: 600,
    fontFamily: 'Work Sans',
    marginBottom: '16px',
    // fontWeight: 500,
    // letterSpacing: '0em',
    // fontFamily: 'Lora',
    color: colors.primary.main,
  },
  h2: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 2.3,
    letterSpacing: '0em',
    fontFamily: 'Work Sans',
    color: colors.primary.main,
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.7rem',
    lineHeight: 2.1,
    letterSpacing: '0em',
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: 1.9,
    letterSpacing: '0em',
    marginBottom: '16px',
    fontFamily: 'Work Sans',
    color: colors.primary.main,
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.3rem',
    lineHeight: 1.7,
    letterSpacing: '0em',
    color: colors.secondary.dark,
    marginBottom: '16px',
  },
  h6: {
    fontWeight: 500,
    fontSize: '1.1rem',
    lineHeight: 1.6,
    letterSpacing: '0.0075em',
    // marginBottom: '16px',
    color: colors.text.primary,
  },
  subtitle1: {
    fontSize: '1rem',
    lineHeight: 1.5,
    fontWeight: '500',
    color: '#9598A6',
    // letterSpacing: '0.00938em',
  },
  subtitle2: {
    fontSize: '1rem',
    lineHeight: 1.5,
    letterSpacing: '0.00714em',
    fontFamily: 'Work Sans',
    fontWeight: 500,
    color: colors.primary.main,
    textTransform: 'uppercase' as const,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
    // letterSpacing: '0.00938em',
    letterSpacing: '0em',
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    letterSpacing: '0.01071em',
    color: '#6F7283',
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
        fontColor: '#6F7283',
        fontWeight: 500,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      root: {
        fontSize: '0.9rem',
        fontFamily: 'Work Sans',
        fontColor: '#6F7283',
        fontWeight: 500,
        // padding: '14px 23px 14px 23px',
        width: '300px',
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        padding: '10px 13px 10px 13px',
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
        fontSize: '1rem',
        lineHeight: '1.5rem',
        letterSpacing: '0',
        fontWeight: 500,
        color: '#6F7283',    
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