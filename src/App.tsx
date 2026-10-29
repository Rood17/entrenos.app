import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Alert, AppBar, Avatar, Box, Button, Card, CardContent, Chip, Container,
  CssBaseline, Divider, IconButton, LinearProgress, MenuItem, Stack,
  Tab, Tabs, TextField, ThemeProvider, Toolbar, Typography, useMediaQuery
} from '@mui/material';
import {
  AddRounded, ArrowBackRounded, CalendarMonthRounded, CheckCircleRounded,
  ChecklistRounded, ContentCopyRounded, DarkModeRounded, FavoriteRounded,
  HomeRounded, LightModeRounded, LockOutlineRounded, LogoutRounded,
  NotificationsNoneRounded, PersonOutlineRounded, PushPinRounded,
  SettingsRounded, ShoppingCartRounded, WalletRounded
} from '@mui/icons-material';
import { buildTheme } from './theme/mui';
import { brand, themes, type ThemeName } from './theme/tokens';
import { api, login, register } from './api/client';
import './styles.css';

type Page = 'home' | 'tasks' | 'budget' | 'profile' | 'pair';
type AuthMode = 'login' | 'register';
type Task = { name: string; priority: 'Alta' | 'Media' | 'Baja'; done: boolean };
type UserProfile = { id: number; app_name: string; first_name: string; email: string };
type CoupleData = { couple: { id: number; members: number[] } | null };
const initialTasks: Task[] = [
  { name: 'Lavar la ropa', priority: 'Alta', done: false },
  { name: 'Limpiar el baño', priority: 'Media', done: false },
  { name: 'Sacar la basura', priority: 'Baja', done: true }
];
const purchases = [
  { name: 'Refrigerador', category: 'Cocina', amount: 18000, progress: 45, priority: 'Alta' },
  { name: 'Sofá', category: 'Sala', amount: 12000, progress: 25, priority: 'Media' },
  { name: 'Viaje a Japón', category: 'Viajes', amount: 30000, progress: 60, priority: 'Alta' }
];
const currency = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 0
}).format(value);

function BrandLogo({ themeName, onClick, large = false }: {
  themeName: ThemeName; onClick: () => void; large?: boolean
}) {
  const [failed, setFailed] = useState(false);
  const asset = themeName === 'dark' ? brand.assets.dark : brand.assets.light;
  return (
    <Box component="button" type="button" onClick={onClick} aria-label="EntreNos — ir al inicio"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0,
        background: 'none', cursor: 'pointer', p: 0, minHeight: 44 }}>
      {!failed ? <Box component="img" src={asset} onError={() => setFailed(true)}
        alt="EntreNos" sx={{ display: 'block', width: large ? { xs: 195, sm: 238 } : { xs: 138, sm: 164 },
          height: 'auto', maxHeight: large ? 158 : 53, objectFit: 'contain' }} /> :
        <Stack direction="row" alignItems="center" gap={1}>
          <FavoriteRounded color="primary" />
          <Typography variant={large ? 'h4' : 'h6'}>{brand.name}</Typography>
        </Stack>}
    </Box>
  );
}

function Panel({ title, action, children, icon }: {
  title: string; action?: ReactNode; children: ReactNode; icon?: ReactNode
}) {
  return <Card className="app-panel">
    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        {icon && <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>}
        <Typography variant="h6" sx={{ flex: 1, fontSize: '1.15rem' }}>{title}</Typography>
        {action}
      </Stack>
      {children}
    </CardContent>
  </Card>;
}

export default function App() {
  const [themeName, setThemeName] = useState<ThemeName>('light');
  const theme = useMemo(() => buildTheme(themeName), [themeName]);
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [page, setPage] = useState<Page>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [pendingInvite] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invite') || '');
  const [showAuth, setShowAuth] = useState(Boolean(new URLSearchParams(window.location.hash.slice(1)).get('invite')));
  const [accessToken, setAccessToken] = useState('');
  const [demo, setDemo] = useState(false);
  const [paired, setPaired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [appName, setAppName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const personalizedName = appName.trim() || 'Nuestro espacio';
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [acceptPassword, setAcceptPassword] = useState('');
  const invitationLink = generatedCode
    ? `${window.location.origin}${window.location.pathname}#invite=${encodeURIComponent(generatedCode)}`
    : '';
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState('');
  const [budgetTab, setBudgetTab] = useState(0);
  const [taskTab, setTaskTab] = useState(0);
  const inApp = demo || Boolean(accessToken);
  const palette = themes[themeName];

  function navigate(next: Page) {
    if (!demo && accessToken && !paired && next !== 'pair' && next !== 'profile') {
      setPage('pair'); setMessage('Primero vincula tu cuenta con tu pareja.');
      return;
    }
    setMessage(''); setPage(next);
  }

  function goHome() {
    setMessage('');
    if (inApp) navigate('home');
    else setShowAuth(false);
  }

  function enterDemo() {
    setDemo(true); setShowAuth(false); setPage('home'); setMessage('');
  }

  async function authenticate() {
    setLoading(true); setMessage('');
    try {
      if (authMode === 'register') {
        await register(username, email, password);
        setAuthMode('login'); setMessage('Cuenta creada. Ahora inicia sesión.');
      } else {
        const result = await login(email, password);
        setAccessToken(result.access); setDemo(false); setShowAuth(false);
        const profile = await api<UserProfile>('/auth/me/', {}, result.access);
        setAppName(profile.app_name || '');
        setNameDraft(profile.app_name || '');
        const relation = await api<CoupleData>('/couples/me/', {}, result.access);
        const linked = Boolean(relation.couple);
        setPaired(linked); setPage(linked ? 'home' : 'pair');
        if (!linked && pendingInvite) setInviteCode(pendingInvite);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible conectarse.'); }
    finally { setLoading(false); }
  }

  async function createInvitation() {
    setLoading(true); setMessage('');
    try {
      if (invitePassword.length < 8) { setMessage('La contraseña de invitación requiere al menos 8 caracteres.'); return; }
      const result = await api<{ code: string }>('/couples/invitations/', {
        method: 'POST', body: JSON.stringify({ password: invitePassword }),
      }, accessToken);
      setGeneratedCode(result.code);
      setInvitePassword('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible generar el código.'); }
    finally { setLoading(false); }
  }

  async function acceptInvitation() {
    setLoading(true); setMessage('');
    try {
      await api('/couples/invitations/accept/', {
        method: 'POST', body: JSON.stringify({ code: inviteCode.trim(), password: acceptPassword })
      }, accessToken);
      setPaired(true); setPage('home'); setMessage('¡Ya están vinculados!');
      setAcceptPassword('');
      if (window.location.hash.startsWith('#invite=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo aceptar la invitación.'); }
    finally { setLoading(false); }
  }

  async function saveAppName() {
    const cleanName = nameDraft.trim();
    if (cleanName.length > 60) {
      setMessage('El nombre debe tener máximo 60 caracteres.');
      return;
    }
    if (demo) {
      setAppName(cleanName);
      setMessage('Nombre cambiado en la demostración.');
      return;
    }
    setLoading(true); setMessage('');
    try {
      const saved = await api<UserProfile>('/auth/me/', {
        method: 'PATCH', body: JSON.stringify({ app_name: cleanName }),
      }, accessToken);
      setAppName(saved.app_name || '');
      setNameDraft(saved.app_name || '');
      setMessage('Nombre personalizado guardado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el nombre.');
    } finally { setLoading(false); }
  }

  function signOut() {
    setAccessToken(''); setDemo(false); setPaired(false); setShowAuth(false);
    setPassword(''); setGeneratedCode(''); setInvitePassword(''); setAcceptPassword(''); setPage('home'); setMessage('');
    setAppName(''); setNameDraft('');
  }

  const nav = [
    { value: 'home' as const, label: 'Inicio', icon: <HomeRounded /> },
    { value: 'tasks' as const, label: 'Tareas', icon: <ChecklistRounded /> },
    { value: 'budget' as const, label: 'Vivir juntos', icon: <WalletRounded /> },
    { value: 'profile' as const, label: 'Perfil', icon: <PersonOutlineRounded /> }
  ];

  const tasksContent = <Stack spacing={0.5}>
    {tasks.map((task, i) => <Stack key={task.name + i} direction="row" gap={1} alignItems="center" className="task-row">
      <IconButton aria-label={task.done ? 'Marcar pendiente' : 'Completar tarea'}
        onClick={() => setTasks(list => list.map((item, index) =>
          index === i ? { ...item, done: !item.done } : item))} size="small" color={task.done ? 'success' : 'default'}>
        {task.done ? <CheckCircleRounded /> : <Box className="task-circle" />}
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ textDecoration: task.done ? 'line-through' : 'none', fontWeight: 600 }}>
          {task.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">{task.done ? 'Ayer' : 'Hoy'}</Typography>
      </Box>
      <Chip size="small" label={task.priority}
        color={task.priority === 'Alta' ? 'error' : task.priority === 'Media' ? 'warning' : 'success'}
        variant="outlined" />
      <Chip size="small" label={task.done ? 'Completado' : 'Pendiente'}
        color={task.done ? 'success' : 'default'} />
    </Stack>)}
  </Stack>;

  const purchaseContent = <Stack spacing={2}>
    {purchases.map((item, i) => <Box key={item.name}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Avatar variant="rounded" sx={{ bgcolor: 'background.default', color: 'primary.main' }}>
          {i === 2 ? '✈' : i === 1 ? '⌂' : '▣'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} variant="body2">{item.name}</Typography>
          <Typography variant="caption" color="text.secondary">{item.category} · {currency(item.amount)}</Typography>
        </Box>
        <Chip size="small" label={item.priority} color={item.priority === 'Alta' ? 'error' : 'warning'} variant="outlined" />
      </Stack>
      <LinearProgress variant="determinate" value={item.progress}
        sx={{ ml: 7, mt: 1, height: 6, borderRadius: 10 }} />
    </Box>)}
  </Stack>;

  return <ThemeProvider theme={theme}><CssBaseline />
    <Box className="entrenos-root" style={{
      '--en-primary': palette.primary,
      '--en-accent': palette.accent,
      '--en-paper': palette.paper,
      '--en-ink': palette.text,
      '--en-border': palette.border,
      '--en-cream': palette.background
    } as CSSProperties} sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {!inApp ? <>
        <AppBar elevation={0} position="static" color="transparent" className="landing-header">
          <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', justifyContent: 'space-between', py: 1 }}>
            <BrandLogo themeName={themeName} onClick={goHome} />
            <Stack direction="row" spacing={1}>
              <Button sx={{ display: { xs: 'none', sm: 'inline-flex' } }} onClick={() => { setAuthMode('login'); setShowAuth(true); setMessage(''); }}>Iniciar sesión</Button>
              <Button variant="contained" onClick={() => { setAuthMode('register'); setShowAuth(true); setMessage(''); }}>Crear cuenta</Button>
            </Stack>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" className="landing-main">
          {!showAuth ? <Box className="landing-hero">
            <Box className="landing-copy">
              <Typography variant="overline" sx={{ letterSpacing: 3, color: 'primary.main', fontWeight: 700 }}>UN ESPACIO PARA DOS</Typography>
              <Typography component="h1" className="landing-title">Un mismo camino,<br />mil planes juntos.</Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.8, maxWidth: 485 }}>
                Un lugar para recordar lo bonito, organizar lo cotidiano y construir lo que viene.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, maxWidth: 410 }}>
                <Button size="large" variant="contained" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>Comenzar juntos</Button>
                <Button size="large" variant="outlined" onClick={enterDemo}>Explorar demostración</Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                La demostración utiliza datos ficticios.
              </Typography>
            </Box>
            <Box className="landing-art" aria-hidden="true">
              <Box className="landing-sun" />
              <Box className="landing-hill hill-back" />
              <Box className="landing-hill hill-front" />
              <Box className="landing-art-message">
                <FavoriteRounded sx={{ fontSize: 26 }} />
                <Typography variant="h5">Nuestro espacio</Typography>
                <Typography variant="body2">Para todos esos momentos que hacen una vida juntos.</Typography>
              </Box>
            </Box>
          </Box> : <Box className="auth-shell">
            <Button startIcon={<ArrowBackRounded />} onClick={() => { setShowAuth(false); setMessage(''); }} sx={{ mb: 2 }}>Volver</Button>
            <Card sx={{ maxWidth: 460, mx: 'auto', p: { xs: 1, sm: 2 } }}>
              <CardContent>
                <Stack alignItems="center" spacing={1} mb={3}>
                  <BrandLogo themeName={themeName} onClick={goHome} large />
                  <Typography variant="h5">{authMode === 'login' ? 'Bienvenidos de nuevo' : 'Comencemos nuestra historia'}</Typography>
                  <Typography color="text.secondary" textAlign="center" variant="body2">
                    {authMode === 'login' ? 'Ingresa a tu espacio personal.' : 'Crea tu cuenta para comenzar a compartir.'}
                  </Typography>
                </Stack>
                <Box component="form" onSubmit={event => { event.preventDefault(); void authenticate(); }}>
                  <Stack spacing={2}>
                    {authMode === 'register' && <TextField required label="Nombre de usuario" value={username} onChange={e => setUsername(e.target.value)} />}
                    <TextField required type="email" label="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} />
                    <TextField required type="password" label="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
                    {message && <Alert severity={message.startsWith('Cuenta creada') ? 'success' : 'error'}>{message}</Alert>}
                    <Button disabled={loading} type="submit" variant="contained" size="large">
                      {loading ? 'Procesando…' : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                    </Button>
                    <Button onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setMessage(''); }}>
                      {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Box>}
        </Container>
        <Box component="footer" sx={{ textAlign: 'center', p: 3, color: 'text.secondary', fontSize: 13 }}>
          EntreNos · Un mismo camino, mil planes juntos.
        </Box>
      </> : <>
        <AppBar position="sticky" elevation={0} color="transparent" className="app-header"
          sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ maxWidth: 1500, width: '100%', mx: 'auto', gap: { xs: 1, md: 4 }, minHeight: 72 }}>
            <Box component="button" type="button" onClick={goHome} aria-label="Volver a inicio"
              sx={{ border: 0, background: 'none', color: 'text.primary', cursor: 'pointer',
                minHeight: 44, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FavoriteRounded color="primary" />
              <Typography variant="h6" sx={{ fontSize: { xs: '1.05rem', sm: '1.3rem' },
                maxWidth: { xs: 155, sm: 240 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {personalizedName}
              </Typography>
            </Box>
            {desktop && <Stack direction="row" gap={1} sx={{ flex: 1, justifyContent: 'center' }}>
              {nav.map(item => <Button key={item.value} startIcon={item.icon}
                variant={page === item.value ? 'contained' : 'text'}
                onClick={() => navigate(item.value)} sx={{ px: 2.5 }}>{item.label}</Button>)}
            </Stack>}
            {!desktop && <Box sx={{ flex: 1 }} />}
            <IconButton aria-label="Cambiar tema" onClick={() => setThemeName(t => t === 'light' ? 'dark' : t === 'dark' ? 'premium' : 'light')}>
              {themeName === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
            </IconButton>
            <IconButton aria-label="Notificaciones" onClick={() => setMessage('Las notificaciones estarán disponibles próximamente.')}><NotificationsNoneRounded /></IconButton>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main' }}><FavoriteRounded fontSize="small" /></Avatar>
          </Toolbar>
        </AppBar>
        <Container maxWidth={false} sx={{ maxWidth: '1500px', px: { xs: 2, sm: 3, lg: 5 }, pt: { xs: 3, md: 4 }, pb: { xs: 12, md: 5 } }}>
          {(demo || page === 'home') && <Alert severity="info" sx={{ mb: 2 }}>
            Las tareas, notas, recuerdos y finanzas mostrados son datos ilustrativos; todavía no se guardan en el servidor.
            <Button size="small" sx={{ ml: 1 }} onClick={signOut}>Salir de demo</Button>
          </Alert>}
          {message && <Alert severity="info" onClose={() => setMessage('')} sx={{ mb: 2 }}>{message}</Alert>}
          {page === 'pair' && <Box sx={{ maxWidth: 600, mx: 'auto', mt: 3 }}>
            <Panel title="Vincularnos" icon={<FavoriteRounded />}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>Conecta tu cuenta con la persona especial con quien compartirás este espacio.</Typography>
              <Stack spacing={2}>
                <TextField type="password" label="Contraseña para proteger la invitación"
                  autoComplete="new-password" value={invitePassword}
                  onChange={e => setInvitePassword(e.target.value)}
                  helperText="Mínimo 8 caracteres. No es tu contraseña de inicio de sesión."
                  inputProps={{ minLength: 8, maxLength: 128 }} fullWidth />
                <Button disabled={loading || invitePassword.length < 8} variant="contained" onClick={() => void createInvitation()}>
                  Generar QR y enlace protegido
                </Button>
                {generatedCode && <Box className="invitation-code">
                  <Typography variant="caption">Comparte el enlace o el QR con tu pareja</Typography>
                  <Box sx={{ bgcolor: '#fff', width: 'fit-content', mx: 'auto', my: 2, p: 2, borderRadius: 2 }}>
                    <QRCodeSVG value={invitationLink} size={184} marginSize={2} />
                  </Box>
                  <Button variant="outlined" startIcon={<ContentCopyRounded />}
                    onClick={() => { void navigator.clipboard.writeText(invitationLink).then(() => setMessage('Enlace copiado. Comparte la contraseña por un canal separado.')).catch(() => setMessage('No fue posible copiar el enlace.')); }}>
                    Copiar enlace
                  </Button>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere', my: 1 }}>{invitationLink}</Typography>
                  <Stack direction="row" alignItems="center" justifyContent="center">
                    <Typography sx={{ overflowWrap: 'anywhere', fontWeight: 700 }}>{generatedCode}</Typography>
                    <IconButton aria-label="Copiar código" onClick={() => { void navigator.clipboard?.writeText(generatedCode); }}><ContentCopyRounded /></IconButton>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">Válido durante siete días.</Typography>
                </Box>}
                <Divider>¿Recibiste una invitación?</Divider>
                <TextField value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                  label="Código de invitación" fullWidth />
                <TextField type="password" label="Contraseña de la invitación" value={acceptPassword}
                  autoComplete="off" onChange={e => setAcceptPassword(e.target.value)}
                  helperText="Solicita la contraseña a quien te invitó." fullWidth />
                <Button variant="outlined" disabled={loading || !inviteCode.trim() || !acceptPassword}
                  onClick={() => void acceptInvitation()}>Confirmar y vincular cuentas</Button>
                <Alert icon={<LockOutlineRounded />} severity="info">
                  El enlace no incluye la contraseña. Las invitaciones vencen a los siete días y solo se pueden utilizar una vez.
                </Alert>
              </Stack>
            </Panel>
          </Box>}
          {page === 'home' && <Box className="dashboard-layout">
            <Box className="dashboard-main">
              <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary">Hola,</Typography>
                <Typography variant="h4" sx={{ fontSize: { xs: '2rem', md: '2.65rem' } }}>{personalizedName}</Typography>
                <Typography color="text.secondary">Todo es mejor cuando lo compartimos.</Typography>
              </Box>
              <Box className="anniversary-hero">
                <Box className="anniversary-content">
                  <FavoriteRounded />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem' }}>Faltan</Typography>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontSize: { xs: '2.7rem', sm: '3.8rem' }, lineHeight: 1.2 }}>127 días</Typography>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontSize: '1.35rem' }}>para nuestro aniversario</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Fecha de ejemplo · Configurable próximamente</Typography>
                </Box>
              </Box>
              <Panel title="Notas importantes" icon={<PushPinRounded />}>
                <Box className="notes-grid">
                  <Box className="note-card note-cream"><Typography sx={{ fontSize: 24 }}>♧</Typography><Typography fontWeight={700}>Tallas de ropa</Typography><Typography variant="body2">Una nota para recordar los detalles.</Typography></Box>
                  <Box className="note-card note-pink"><Typography sx={{ fontSize: 24 }}>❀</Typography><Typography fontWeight={700}>Alergias</Typography><Typography variant="body2">Información importante para ambos.</Typography></Box>
                  <Box className="note-card note-peach"><Typography sx={{ fontSize: 24 }}>♡</Typography><Typography fontWeight={700}>Ideas de regalo</Typography><Typography variant="body2">Pequeñas cosas que nos hacen felices.</Typography></Box>
                </Box>
              </Panel>
              <Panel title="Nuestros recuerdos" icon={<FavoriteRounded />}>
                <Box className="memory-strip">
                  {['El primer viaje', 'Nuestro rincón', 'Un día especial'].map((name, i) =>
                    <Box key={name} className={'memory-tile memory-' + i}><Typography>{name}</Typography></Box>)}
                </Box>
              </Panel>
            </Box>
            <Box className="dashboard-side">
              <Panel title="Actividades y tareas" icon={<ChecklistRounded />}
                action={<Button size="small" onClick={() => navigate('tasks')}>Ver todas</Button>}>
                {tasksContent}
              </Panel>
              <Panel title="Nuestra próxima cita" icon={<CalendarMonthRounded />}>
                <Typography fontWeight={600}>Un momento para nosotros</Typography>
                <Typography variant="body2" color="text.secondary">Aquí aparecerán nuestras próximas actividades.</Typography>
              </Panel>
              <Panel title="Vivir juntos" icon={<HomeRounded />}
                action={<Button size="small" onClick={() => navigate('budget')}>Ver detalles</Button>}>
                <Typography variant="caption" color="text.secondary">Disponible para planear · Ejemplo</Typography>
                <Typography variant="h5" sx={{ my: 1 }}>{currency(13500)}</Typography>
                <LinearProgress variant="determinate" value={61} sx={{ height: 9, borderRadius: 6, mb: 2 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Ingresos: {currency(35000)}</Typography>
                  <Typography variant="caption">Gastos: {currency(17000)}</Typography>
                </Stack>
              </Panel>
            </Box>
          </Box>}
          {page === 'tasks' && <Box sx={{ maxWidth: 980, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Actividades y tareas</Typography>
            <Tabs value={taskTab} onChange={(_, value: number) => setTaskTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
              {['Todas', 'Hogar', 'Compras', 'Citas'].map(label => <Tab label={label} key={label} />)}
            </Tabs>
            <Box className="two-column">
              <Panel title="Tareas del hogar" icon={<ChecklistRounded />}>
                {tasksContent}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <TextField fullWidth size="small" label="Nueva tarea" value={newTask} onChange={e => setNewTask(e.target.value)} />
                  <Button variant="contained" aria-label="Agregar tarea" onClick={() => {
                    if (newTask.trim()) { setTasks(items => [...items, { name: newTask.trim(), done: false, priority: 'Media' }]); setNewTask(''); }
                  }}><AddRounded /></Button>
                </Stack>
              </Panel>
              <Panel title="Lista del supermercado" icon={<ShoppingCartRounded />}>
                {['Leche', 'Huevos', 'Aguacate', 'Pasta'].map(item => <Typography key={item} sx={{ py: 1 }}>○ &nbsp;{item}</Typography>)}
                <Typography variant="caption" color="text.secondary">Los datos se sincronizarán al implementar las API de tareas.</Typography>
              </Panel>
            </Box>
          </Box>}
          {page === 'budget' && <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
            <Typography variant="h4">Vivir juntos</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Construyendo la vida que queremos.</Typography>
            <Tabs value={budgetTab} onChange={(_, value: number) => setBudgetTab(value)}
              variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
              {['Resumen', 'Gastos fijos', 'Deudas', 'Compras planeadas'].map(label => <Tab key={label} label={label} />)}
            </Tabs>
            {budgetTab === 0 ? <Box className="two-column">
              <Panel title="Presupuesto del mes" icon={<WalletRounded />}>
                <Typography color="text.secondary" variant="body2">Disponible para planear · Ejemplo</Typography>
                <Typography variant="h4" sx={{ mt: 1 }}>{currency(13500)}</Typography>
                <LinearProgress variant="determinate" value={61} sx={{ height: 12, mt: 2, mb: 1, borderRadius: 6 }} />
                <Typography variant="caption" color="text.secondary">Ingresos menos compromisos previstos</Typography>
              </Panel>
              <Panel title="Resumen financiero">
                {([['Ingresos', 35000], ['Gastos fijos', 17000], ['Deudas', 4500]] as const).map(([label, amount]) =>
                  <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                    <Typography>{label}</Typography><Typography fontWeight={700}>{currency(amount)}</Typography>
                  </Stack>)}
              </Panel>
              <Panel title="Compras planeadas" icon={<ShoppingCartRounded />}>{purchaseContent}</Panel>
            </Box> : <Panel title={['', 'Gastos fijos', 'Deudas', 'Compras planeadas'][budgetTab]}>
              {budgetTab === 3 ? purchaseContent : <Typography color="text.secondary">Próximamente podrás registrar y priorizar cada movimiento compartido.</Typography>}
            </Panel>}
          </Box>}
          {page === 'profile' && <Box sx={{ maxWidth: 660, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Perfil y preferencias</Typography>
            <Panel title="Personaliza tu espacio" icon={<FavoriteRounded />}>
              <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                Elige cómo quieres llamar a tu aplicación. Este nombre reemplazará «EntreNos» dentro de tu panel; la portada pública conservará la marca original.
              </Typography>
              <Box component="form" onSubmit={event => { event.preventDefault(); void saveAppName(); }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="start">
                  <TextField label="Nombre de tu espacio" value={nameDraft}
                    onChange={event => setNameDraft(event.target.value)}
                    inputProps={{ maxLength: 60 }}
                    placeholder="Ej. Nuestro rincón" helperText="Hasta 60 caracteres; vacío usa «Nuestro espacio»."
                    fullWidth />
                  <Button type="submit" variant="contained" disabled={loading} sx={{ minHeight: 56 }}>
                    Guardar
                  </Button>
                </Stack>
              </Box>
            </Panel>
            <Panel title="Apariencia" icon={<SettingsRounded />}>
              <TextField select fullWidth label="Tema" value={themeName} onChange={e => setThemeName(e.target.value as ThemeName)}>
                <MenuItem value="light">Claro</MenuItem><MenuItem value="dark">Oscuro</MenuItem><MenuItem value="premium">Premium</MenuItem>
              </TextField>
            </Panel>
            {!demo && <Panel title="Tu pareja" icon={<FavoriteRounded />}>
              <Typography sx={{ mb: 1 }}>{paired ? 'Cuenta vinculada' : 'Vinculación pendiente'}</Typography>
              {!paired && <Button onClick={() => navigate('pair')}>Vincular cuenta</Button>}
            </Panel>}
            <Button variant="outlined" color="primary" startIcon={<LogoutRounded />} onClick={signOut}>Salir</Button>
          </Box>}
        </Container>
        {!desktop && page !== 'pair' && <Box className="mobile-navigation" sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
          {nav.map(item => <Button key={item.value} aria-label={item.label} onClick={() => navigate(item.value)}
            sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25,
              color: page === item.value ? 'primary.main' : 'text.secondary',
              fontSize: 11, px: 0.2 }}>
            {item.icon}{item.label}
          </Button>)}
        </Box>}
      </>}
    </Box>
  </ThemeProvider>;
}
