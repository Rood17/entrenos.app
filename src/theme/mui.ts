import {createTheme} from '@mui/material/styles';import {themes,ThemeName,primitives} from './tokens';
export function buildTheme(name:ThemeName){const t=themes[name];return createTheme({
 palette:{mode:name==='dark'?'dark':'light',primary:{main:t.primary},secondary:{main:t.accent},background:{default:t.background,paper:t.paper},text:{primary:t.text,secondary:t.muted},divider:t.border,success:{main:t.accent}},
 shape:{borderRadius:primitives.radius},
 typography:{fontFamily:'Inter, system-ui, sans-serif',h4:{fontFamily:'Georgia, serif',fontWeight:600},h5:{fontFamily:'Georgia, serif',fontWeight:600},h6:{fontFamily:'Georgia, serif',fontWeight:600},button:{textTransform:'none',fontWeight:600}},
 components:{MuiButton:{styleOverrides:{root:{borderRadius:14,padding:'10px 18px'}}},MuiCard:{styleOverrides:{root:{border:'1px solid '+t.border,boxShadow:'0 8px 24px rgba(41,25,20,.035)'}}},MuiCssBaseline:{styleOverrides:{body:{minHeight:'100vh'}}}}
});}
