import { PaletteOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    menu: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
  }
  interface PaletteOptions {
    menu?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
  }
}