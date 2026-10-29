import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Alert, AppBar, Autocomplete, Avatar, Box, Button, Card, CardContent, Checkbox, FormControlLabel, Chip, Container,
  CssBaseline, Divider, IconButton, LinearProgress, MenuItem, Stack,
  Tab, Tabs, TextField, ThemeProvider, Toolbar, Typography, useMediaQuery
} from '@mui/material';
import {
  AddRounded, ArrowBackRounded, CalendarMonthRounded, CheckCircleRounded,
  ChecklistRounded, ContentCopyRounded, DarkModeRounded, FavoriteRounded,
  HomeRounded, LocalFireDepartmentRounded, LightModeRounded, LockOutlineRounded, LogoutRounded,
  NotificationsNoneRounded, PersonOutlineRounded, PushPinRounded,
  SettingsRounded, ShoppingCartRounded, WalletRounded
} from '@mui/icons-material';
import { buildTheme } from './theme/mui';
import { brand, themes, type ThemeName } from './theme/tokens';
import { api, login, register, rememberSession, restoreSession, hasRememberedSession, clearSession } from './api/client';
import './styles.css';

type Page = 'home' | 'tasks' | 'budget' | 'fire' | 'finances' | 'profile' | 'pair';
type AuthMode = 'login' | 'register';
type Task = { name: string; priority: 'Alta' | 'Media' | 'Baja'; done: boolean };
type UserProfile = { id: number; app_name: string; first_name: string; username: string; email: string };
type WorkspaceItem = { id: number; kind: 'task' | 'note' | 'rule'; title: string; content: string; tag: string; priority: 'low' | 'medium' | 'high'; completed: boolean };
type WorkspaceScope = 'personal' | 'shared';
type MonthlyNeed = { id: number; name: string; priority: 'low' | 'medium' | 'high' | 'essential'; cost: string; shared: boolean; owner_name: string };
const needPriorities = [{ value: 'essential', label: 'Esencial' }, { value: 'high', label: 'Alta' }, { value: 'medium', label: 'Media' }, { value: 'low', label: 'Baja' }] as const;
type CoupleData = { couple: { id: number; members: number[]; display_name: string; image_url: string } | null };
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
  const [rememberMe, setRememberMe] = useState(true);
  const [restoringSession, setRestoringSession] = useState(() => hasRememberedSession());
  const [demo, setDemo] = useState(false);
  const [paired, setPaired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [appName, setAppName] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [sharedName, setSharedName] = useState('');
  const [sharedNameDraft, setSharedNameDraft] = useState('');
  const [sharedImage, setSharedImage] = useState('');
  const [imageDraft, setImageDraft] = useState('');
  const [noteTag, setNoteTag] = useState('Relación');
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleContent, setRuleContent] = useState('');
  const [ruleTag, setRuleTag] = useState('Convivencia');
  const personalizedName = (paired ? sharedName : appName).trim() || 'Nuestro espacio';
  const [email, setEmail] = useState('');
  const [personName, setPersonName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [acceptPassword, setAcceptPassword] = useState('');
  const invitationLink = generatedCode
    ? `${window.location.origin}${window.location.pathname}#invite=${encodeURIComponent(generatedCode)}`
    : '';
  const [newTask, setNewTask] = useState('');
  const [budgetTab, setBudgetTab] = useState(0);
  const [taskTab, setTaskTab] = useState(0);
  const [scope, setScope] = useState<WorkspaceScope>('personal');
  const [monthlyNeeds, setMonthlyNeeds] = useState<MonthlyNeed[]>([]);
  const [needName, setNeedName] = useState('');
  const [needCost, setNeedCost] = useState('');
  const [needPriority, setNeedPriority] = useState<MonthlyNeed['priority']>('medium');
  const [needShared, setNeedShared] = useState(false);
  const [editingNeed, setEditingNeed] = useState<number | null>(null);
  const [needsLoading, setNeedsLoading] = useState(false);
  const [needsError, setNeedsError] = useState('');
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [itemError, setItemError] = useState('');
  const scopeLabel = scope === 'personal' ? 'Mi espacio' : 'Nuestro espacio';
  const inApp = demo || Boolean(accessToken);
  const palette = themes[themeName];

  useEffect(() => {
    let active = true;
    async function restore() {
      const restored = await restoreSession();
      if (!active) return;
      if (!restored) { setRestoringSession(false); return; }
      try {
        const [profile, relation] = await Promise.all([
          api<UserProfile>('/auth/me/', {}, restored),
          api<CoupleData>('/couples/me/', {}, restored),
        ]);
        if (!active) return;
        setAccessToken(restored);
        setDemo(false);
        setShowAuth(false);
        setPersonName(profile.first_name?.trim() || profile.username || profile.email.split('@')[0]);
        setAppName(profile.app_name || '');
        setNameDraft(profile.app_name || '');
        setPaired(Boolean(relation.couple));
        setSharedName(relation.couple?.display_name || '');
        setSharedNameDraft(relation.couple?.display_name || '');
        setSharedImage(relation.couple?.image_url || '');
        setImageDraft(relation.couple?.image_url || '');
        setSharedImage(relation.couple?.image_url || '');
        setImageDraft(relation.couple?.image_url || '');
        setScope('personal');
        setPage(pendingInvite && !relation.couple ? 'pair' : 'home');
        if (pendingInvite && !relation.couple) setInviteCode(pendingInvite);
      } catch {
        // Network outages should not destroy a valid refresh token.
      } finally {
        if (active) setRestoringSession(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, [pendingInvite]);

  function navigate(next: Page) {
    setMessage(''); setPage(next);
  }

  useEffect(() => {
    if (!accessToken || demo || (scope === 'shared' && !paired)) return;
    let active = true;
    setItemsLoading(true);
    setItemError('');
    api<WorkspaceItem[]>(`/workspace/items/?scope=${scope}`, {}, accessToken)
      .then(data => { if (active) setItems(data); })
      .catch(error => { if (active) setItemError(error instanceof Error ? error.message : 'No se pudieron cargar los datos.'); })
      .finally(() => { if (active) setItemsLoading(false); });
    return () => { active = false; };
  }, [accessToken, scope, paired, demo]);

  useEffect(() => {
    if (!accessToken || demo || (scope === 'shared' && !paired) || page !== 'finances') return;
    let active = true;
    setNeedsLoading(true);
    setNeedsError('');
    api<MonthlyNeed[]>(`/finances/monthly-needs/?scope=${scope}`, {}, accessToken)
      .then(data => { if (active) setMonthlyNeeds(data); })
      .catch(error => { if (active) setNeedsError(error instanceof Error ? error.message : 'No se pudieron cargar las necesidades.'); })
      .finally(() => { if (active) setNeedsLoading(false); });
    return () => { active = false; };
  }, [accessToken, demo, paired, scope, page]);

  function resetNeedForm() {
    setNeedName(''); setNeedCost(''); setNeedPriority('medium'); setNeedShared(false); setEditingNeed(null);
  }

  async function saveNeed() {
    if (!accessToken || scope !== 'personal') return;
    const numeric = Number(needCost);
    if (!needName.trim() || !needCost.trim() || !Number.isFinite(numeric) || numeric < 0) {
      setNeedsError('Ingresa un nombre y un costo válido de cero o más.');
      return;
    }
    setNeedsLoading(true); setNeedsError('');
    try {
      const value = await api<MonthlyNeed>(editingNeed
        ? `/finances/monthly-needs/${editingNeed}/` : '/finances/monthly-needs/', {
        method: editingNeed ? 'PATCH' : 'POST',
        body: JSON.stringify({ name: needName.trim(), cost: numeric.toFixed(2),
          priority: needPriority, shared: needShared }),
      }, accessToken);
      setMonthlyNeeds(old => editingNeed
        ? old.map(need => need.id === editingNeed ? value : need)
        : [value, ...old]);
      resetNeedForm();
    } catch (error) { setNeedsError(error instanceof Error ? error.message : 'No se pudo guardar.'); }
    finally { setNeedsLoading(false); }
  }

  async function removeNeed(id: number) {
    setNeedsLoading(true); setNeedsError('');
    try {
      await api<unknown>(`/finances/monthly-needs/${id}/`, { method: 'DELETE' }, accessToken);
      setMonthlyNeeds(old => old.filter(need => need.id !== id));
      if (editingNeed === id) resetNeedForm();
    } catch (error) { setNeedsError(error instanceof Error ? error.message : 'No se pudo eliminar.'); }
    finally { setNeedsLoading(false); }
  }

  async function addItem(kind: 'task' | 'note') {
    const title = kind === 'task' ? newTask.trim() : noteTitle.trim();
    if (!title) return;
    if (demo) {
      setMessage('Para guardar información real, crea una cuenta e inicia sesión.');
      return;
    }
    setLoading(true); setItemError('');
    try {
      const editing = kind === 'note' && editingNoteId !== null;
      const result = await api<WorkspaceItem>(editing
        ? `/workspace/items/${editingNoteId}/?scope=${scope}`
        : `/workspace/items/?scope=${scope}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...(editing ? {} : { kind }), title,
          content: kind === 'note' ? noteContent : '', tag: kind === 'note' ? noteTag.trim() : '', priority: 'medium' }),
      }, accessToken);
      setItems(old => editing
        ? old.map(item => item.id === editingNoteId ? result : item)
        : [result, ...old]);
      if (kind === 'task') setNewTask('');
      else { setNoteTitle(''); setNoteContent(''); setNoteTag('Relación'); setEditingNoteId(null); }
    } catch (error) { setItemError(error instanceof Error ? error.message : 'No se pudo guardar.'); }
    finally { setLoading(false); }
  }

  async function toggleItem(item: WorkspaceItem) {
    try {
      const updated = await api<WorkspaceItem>(`/workspace/items/${item.id}/?scope=${scope}`, {
        method: 'PATCH', body: JSON.stringify({ completed: !item.completed }),
      }, accessToken);
      setItems(old => old.map(x => x.id === item.id ? updated : x));
    } catch (error) { setItemError(error instanceof Error ? error.message : 'No se pudo actualizar.'); }
  }

  async function removeItem(item: WorkspaceItem) {
    try {
      await api<unknown>(`/workspace/items/${item.id}/?scope=${scope}`, { method: 'DELETE' }, accessToken);
      setItems(old => old.filter(x => x.id !== item.id));
    } catch (error) { setItemError(error instanceof Error ? error.message : 'No se pudo eliminar.'); }
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
        rememberSession(result.access, result.refresh, rememberMe);
        setAccessToken(result.access); setDemo(false); setShowAuth(false);
        const profile = await api<UserProfile>('/auth/me/', {}, result.access);
        setPersonName(profile.first_name?.trim() || profile.username || profile.email.split('@')[0]);
        setAppName(profile.app_name || '');
        setNameDraft(profile.app_name || '');
        const relation = await api<CoupleData>('/couples/me/', {}, result.access);
        const linked = Boolean(relation.couple);
        setPaired(linked); setSharedName(relation.couple?.display_name || '');
        setSharedNameDraft(relation.couple?.display_name || '');
        setSharedImage(relation.couple?.image_url || '');
        setImageDraft(relation.couple?.image_url || '');
        setScope('personal'); setPage(pendingInvite && !linked ? 'pair' : 'home');
        if (!linked && pendingInvite) setInviteCode(pendingInvite);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible conectarse.'); }
    finally { setLoading(false); }
  }

  async function refreshPairing() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const relation = await api<CoupleData>('/couples/me/', {}, accessToken);
      const linked = Boolean(relation.couple);
      setPaired(linked);
      setSharedName(relation.couple?.display_name || '');
      setSharedNameDraft(relation.couple?.display_name || '');
        setSharedImage(relation.couple?.image_url || '');
        setImageDraft(relation.couple?.image_url || '');
      if (linked) {
        setScope('shared');
        setPage('home');
        setMessage('¡Tu pareja ya está vinculada! Ahora puedes usar el espacio compartido.');
      } else {
        setMessage('La invitación sigue pendiente. Mientras tanto puedes utilizar tu espacio individual.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el estado.');
    } finally { setLoading(false); }
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
      setPaired(true); setSharedName(''); setSharedNameDraft(''); setSharedImage(''); setImageDraft(''); setScope('shared'); setPage('home'); setMessage('¡Ya están vinculados!');
      setAcceptPassword('');
      if (window.location.hash.startsWith('#invite=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo aceptar la invitación.'); }
    finally { setLoading(false); }
  }

  async function saveSharedName() {
    if (!paired) return;
    setLoading(true); setMessage('');
    try {
      const result = await api<{ display_name: string }>('/couples/me/', {
        method: 'PATCH', body: JSON.stringify({ display_name: sharedNameDraft.trim() }),
      }, accessToken);
      setSharedName(result.display_name || '');
      setSharedNameDraft(result.display_name || '');
      setMessage('Nombre compartido actualizado para ambos.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar el nombre compartido.');
    } finally { setLoading(false); }
  }

  async function saveSharedImage() {
    if (!paired) return;
    setLoading(true); setMessage('');
    try {
      const result = await api<{ image_url: string }>('/couples/me/', {
        method: 'PATCH', body: JSON.stringify({ image_url: imageDraft.trim() }),
      }, accessToken);
      setSharedImage(result.image_url || '');
      setImageDraft(result.image_url || '');
      setMessage('Imagen de nuestro espacio guardada para ambos.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la imagen.');
    } finally { setLoading(false); }
  }

  async function saveRule() {
    if (!ruleTitle.trim() || demo) return;
    setLoading(true); setItemError('');
    try {
      const result = await api<WorkspaceItem>(`/workspace/items/?scope=${scope}`, {
        method: 'POST', body: JSON.stringify({ kind: 'rule', title: ruleTitle.trim(), content: ruleContent, tag: ruleTag.trim() }),
      }, accessToken);
      setItems(old => [result, ...old]);
      setRuleTitle(''); setRuleContent('');
    } catch (error) { setItemError(error instanceof Error ? error.message : 'No se pudo guardar el acuerdo.'); }
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
    clearSession();
    setAccessToken(''); setDemo(false); setPaired(false); setShowAuth(false);
    setPassword(''); setGeneratedCode(''); setInvitePassword(''); setAcceptPassword(''); setPage('home'); setMessage('');
    setMonthlyNeeds([]); resetNeedForm(); setPersonName(''); setAppName(''); setNameDraft(''); setSharedName(''); setSharedNameDraft(''); setSharedImage(''); setImageDraft(''); setItems([]); setScope('personal');
  }

  const nav = [
    { value: 'home' as const, label: 'Inicio', icon: <HomeRounded /> },
    { value: 'tasks' as const, label: 'Tareas', icon: <ChecklistRounded /> },
    { value: 'budget' as const, label: 'Nuestro hogar', icon: <HomeRounded /> },
    { value: 'fire' as const, label: 'Fuego sagrado', icon: <LocalFireDepartmentRounded /> },
    { value: 'profile' as const, label: 'Configurar', icon: <SettingsRounded /> }
  ];

  const visibleTasks = demo ? initialTasks.map((task, index) => ({
    id: index + 1, kind: 'task' as const, title: task.name, content: '', tag: '',
    completed: task.done, priority: task.priority === 'Alta' ? 'high' as const : task.priority === 'Baja' ? 'low' as const : 'medium' as const
  })) : items.filter(item => item.kind === 'task');
  const visibleNotes = demo ? [] : items.filter(item => item.kind === 'note');
  const availableTags = Array.from(new Set([
    'Relación', 'Casa', 'Planes',
    ...items.map(item => item.tag?.trim()).filter((tag): tag is string => Boolean(tag)),
  ])).sort((a,b)=>a.localeCompare(b,'es'));
  const visibleRules = demo ? [] : items.filter(item => item.kind === 'rule');
  const tasksContent = <Stack spacing={0.5}>
    {visibleTasks.length === 0 && <Typography variant="body2" color="text.secondary">
      Aún no tienes tareas. Agrega la primera para empezar a organizarte.
    </Typography>}
    {visibleTasks.map(task => <Stack key={task.id} direction="row" gap={1} alignItems="center" className="task-row">
      <IconButton aria-label={task.completed ? 'Marcar pendiente' : 'Completar tarea'} disabled={demo}
        onClick={() => void toggleItem(task)} size="small" color={task.completed ? 'success' : 'default'}>
        {task.completed ? <CheckCircleRounded /> : <Box className="task-circle" />}
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ textDecoration: task.completed ? 'line-through' : 'none', fontWeight: 600 }}>
          {task.title}
        </Typography>
      </Box>
      <Chip size="small" label={task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Media'}
        variant="outlined" />
      {!demo && <Button color="error" size="small" onClick={() => void removeItem(task)}>Eliminar</Button>}
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
      {restoringSession ? <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h6">Recuperando tu sesión…</Typography>
        <LinearProgress sx={{ mt: 3 }} />
      </Container> : !inApp ? <>
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
                    {authMode === 'login' && <FormControlLabel
                      control={<Checkbox checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} />}
                      label="Recordar mi sesión en este dispositivo" />}
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
            {!demo && <Button size="small" variant="outlined" onClick={() => navigate('pair')} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              {paired ? 'Invitación' : 'Vincular pareja'}
            </Button>}
            <Button size="small" variant="outlined" startIcon={<SettingsRounded />} onClick={() => navigate('profile')}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Administrar</Button>
            <IconButton aria-label="Administrar mi espacio" onClick={() => navigate('profile')}
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}><SettingsRounded /></IconButton>
            <IconButton aria-label="Cambiar tema" onClick={() => setThemeName(t => t === 'light' ? 'dark' : t === 'dark' ? 'premium' : 'light')}>
              {themeName === 'dark' ? <LightModeRounded /> : <DarkModeRounded />}
            </IconButton>
            <IconButton aria-label="Notificaciones" onClick={() => setMessage('Las notificaciones estarán disponibles próximamente.')}><NotificationsNoneRounded /></IconButton>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main' }}><FavoriteRounded fontSize="small" /></Avatar>
          </Toolbar>
        </AppBar>
        <Container maxWidth={false} sx={{ maxWidth: '1500px', px: { xs: 2, sm: 3, lg: 5 }, pt: { xs: 3, md: 4 }, pb: { xs: 12, md: 5 } }}>
          {(demo || page === 'home') && <Alert severity="info" sx={{ mb: 2 }}>
            Las tareas y notas se guardan en tu espacio seleccionado. El aniversario, los recuerdos y los presupuestos aún son ejemplos visuales.
            {demo && <Button size="small" sx={{ ml: 1 }} onClick={signOut}>Salir de demo</Button>}
          </Alert>}
          {message && <Alert severity="info" onClose={() => setMessage('')} sx={{ mb: 2 }}>{message}</Alert>}
          {itemError && <Alert severity="error" onClose={() => setItemError('')} sx={{ mb: 2 }}>{itemError}</Alert>}
          {!demo && <Card sx={{ mb: 3 }}><CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>{scopeLabel}</Typography>
              <Typography variant="caption" color="text.secondary">
                {paired ? (scope === 'personal' ? 'Solo tú puedes ver estos datos.' : 'Estos datos son visibles para ambos.') :
                  'Tu espacio personal está activo. Puedes crear tareas y notas antes de vincularte.'}
              </Typography>
            </Box>
            {paired ? <Stack direction="row" spacing={1}>
              <Button size="small" variant={scope === 'personal' ? 'contained' : 'outlined'} onClick={() => setScope('personal')}>Individual</Button>
              <Button size="small" variant={scope === 'shared' ? 'contained' : 'outlined'} onClick={() => setScope('shared')}>Compartido</Button>
            </Stack> : <Stack direction="row" gap={1}>
              <Button variant="outlined" onClick={() => navigate('pair')}>Invitar a mi pareja</Button>
              <Button disabled={loading} onClick={() => void refreshPairing()}>Verificar vínculo</Button>
            </Stack>}
          </CardContent></Card>}
          {itemsLoading && <LinearProgress sx={{ mb: 2 }} />}
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
                <Typography color="text.secondary">Hola, {personName || (demo ? 'bienvenidos' : 'bienvenido')}</Typography>
                <Typography variant="h4" sx={{ fontSize: { xs: '2rem', md: '2.65rem' } }}>{personName ? `Qué gusto verte, ${personName}` : 'Tu espacio para crecer'}</Typography>
                <Typography color="text.secondary">Un lugar para construir lo que importa.</Typography>
              </Box>
              <Box className="anniversary-hero" sx={paired && sharedImage ? {
                backgroundImage: `linear-gradient(135deg, rgba(45,30,30,.65), rgba(45,30,30,.28)), url("${sharedImage.replace(/"/g, '%22')}")`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              } : undefined}>
                <Box className="anniversary-content">
                  <FavoriteRounded />
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontSize: { xs: '2.2rem', sm: '3.1rem' }, lineHeight: 1.15 }}>
                    {paired ? sharedName.trim() || 'Nuestro espacio' : appName.trim() || 'Mi espacio'}
                  </Typography>
                  <Typography sx={{ fontFamily: 'Georgia, serif', fontSize: { xs: '1.15rem', sm: '1.45rem' }, mt: 1, maxWidth: 500 }}>
                    «Que nunca nos falten razones para escucharnos, elegirnos y crecer juntos».
                  </Typography>
                </Box>
              </Box>
              <Panel title="Borrador de pensamientos" icon={<PushPinRounded />}>
                <Box className="notes-grid">
                  {demo ? <Typography color="text.secondary">Anota ideas para conversar, negociar o compartir en algún momento.</Typography> :
                  visibleNotes.length ? visibleNotes.map(note => <Box key={note.id} className="note-card note-cream">
                    <Chip label={note.tag || 'Sin etiqueta'} size="small" sx={{ alignSelf: 'start' }} />
                    <Typography fontWeight={700}>{note.title}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', flex: 1 }}>{note.content}</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => { setEditingNoteId(note.id); setNoteTitle(note.title); setNoteContent(note.content); setNoteTag(note.tag || 'Relación'); }}>Editar</Button>
                      <Button size="small" color="error" onClick={() => void removeItem(note)}>Eliminar</Button>
                    </Stack>
                  </Box>) : <Typography color="text.secondary">Todavía no tienes pensamientos guardados. Puedes comenzar con algo que quisieras hablar.</Typography>}
                </Box>
                {!demo && <Stack spacing={1} sx={{ mt: 2 }}>
                  <TextField size="small" label="Idea o tema para conversar" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} inputProps={{ maxLength: 150 }} />
                  <Autocomplete freeSolo options={availableTags} value={noteTag}
                    onChange={(_, value) => setNoteTag(value || '')}
                    onInputChange={(_, value) => setNoteTag(value.slice(0, 60))}
                    renderInput={params => <TextField {...params} size="small" label="Buscar o crear etiqueta"
                      helperText="Escribe una etiqueta nueva o elige una existente." />} />
                  <TextField size="small" multiline minRows={2} label="¿Qué te gustaría hablar o negociar?" value={noteContent} onChange={e => setNoteContent(e.target.value)} />
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" disabled={loading || !noteTitle.trim()} onClick={() => void addItem('note')}>
                      {editingNoteId === null ? 'Guardar pensamiento' : 'Guardar cambios'}
                    </Button>
                    {editingNoteId !== null && <Button onClick={() => { setEditingNoteId(null); setNoteTitle(''); setNoteContent(''); }}>Cancelar</Button>}
                  </Stack>
                </Stack>}
              </Panel>
              <Panel title="Nuestros recuerdos" icon={<FavoriteRounded />}
                action={<Chip size="small" label="Próximamente" />}>
                <Typography color="text.secondary">Un lugar para guardar fotos e historias especiales. Lo construiremos en una siguiente etapa.</Typography>
              </Panel>
            </Box>
            <Box className="dashboard-side">
              <Panel title="Actividades y tareas" icon={<ChecklistRounded />}
                action={<Button size="small" onClick={() => navigate('tasks')}>Ver todas</Button>}>
                {tasksContent}
              </Panel>
              <Panel title="Nuestra próxima cita" icon={<CalendarMonthRounded />}
                action={<Chip label="Próximamente" size="small" />}>
                <Typography fontWeight={600}>Un momento para nosotros</Typography>
                <Typography variant="body2" color="text.secondary">Aquí aparecerán nuestras próximas actividades.</Typography>
              </Panel>
              <Panel title="Nuestro hogar" icon={<HomeRounded />}
                action={<Button size="small" onClick={() => navigate('budget')}>Entrar</Button>}>
                <Typography color="text.secondary" variant="body2">Organicen juntos la limpieza, los acuerdos y las normas para convivir.</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                  <Chip label="Limpieza" size="small" /><Chip label="Acuerdos" size="small" />
                  <Chip label="Compras del hogar" size="small" />
                </Stack>
              </Panel>
              <Panel title="Nuestro fuego sagrado" icon={<LocalFireDepartmentRounded />}
                action={<Button size="small" onClick={() => navigate('fire')}>Explorar</Button>}>
                <Typography variant="body2" color="text.secondary">Metas, proyectos y decisiones que alimentan nuestra vida juntos.</Typography>
                <Stack direction="row" gap={1} sx={{ mt: 2 }}>
                  <Chip label="Finanzas" size="small" /><Chip label="Proyectos" size="small" />
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
                  <Button variant="contained" disabled={loading || demo || !newTask.trim()} aria-label="Agregar tarea"
                    onClick={() => void addItem('task')}><AddRounded /></Button>
                </Stack>
              </Panel>
              <Panel title="Lista del supermercado" icon={<ShoppingCartRounded />}>
                {['Leche', 'Huevos', 'Aguacate', 'Pasta'].map(item => <Typography key={item} sx={{ py: 1 }}>○ &nbsp;{item}</Typography>)}
                <Typography variant="caption" color="text.secondary">Los datos se sincronizarán al implementar las API de tareas.</Typography>
              </Panel>
            </Box>
          </Box>}
          {page === 'budget' && <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Nuestro hogar</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Pequeños acuerdos para construir una convivencia más sencilla.</Typography>
            <Box className="two-column">
              <Panel title="Limpieza y responsabilidades" icon={<ChecklistRounded />}
                action={<Chip size="small" label="Próximamente" />}>
                <Typography color="text.secondary" variant="body2">
                  Aquí organizaremos las tareas de limpieza, turnos y responsabilidades del hogar.
                </Typography>
              </Panel>
              <Panel title="Normas y acuerdos de convivencia" icon={<FavoriteRounded />}
                action={<Chip size="small" label="Próximamente" />}>
                <Typography color="text.secondary" variant="body2">
                  Un espacio para definir juntos acuerdos, límites y reglas que faciliten la convivencia.
                </Typography>
              </Panel>
              <Panel title="Compras y gastos del hogar" icon={<ShoppingCartRounded />}
                action={<Chip size="small" label="Próximamente" />}>
                <Typography color="text.secondary" variant="body2">
                  Aquí reuniremos las compras necesarias para la casa. Los importes podrán consultarse después en Finanzas, con privacidad configurable.
                </Typography>
              </Panel>
              <Panel title="Finanzas e inversiones" icon={<WalletRounded />}
                action={<Chip size="small" label="En diseño" />}>
                <Typography color="text.secondary" variant="body2">
                  Ingresos y salarios serán opcionales. Cada persona decidirá si comparte sus cifras. No asumiremos que ambos tienen ingresos.
                </Typography>
              </Panel>
            </Box>
          </Box>}
          {page === 'fire' && <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
            <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}>
              <LocalFireDepartmentRounded color="primary" sx={{ fontSize: 36 }} />
              <Typography variant="h4">Nuestro fuego sagrado</Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ mb: 3 }}>Ideas y decisiones para construir lo que soñamos juntos.</Typography>
            <Box className="two-column">
              <Panel title="Finanzas" icon={<WalletRounded />}
                action={<Button size="small" onClick={() => navigate('finances')}>Entrar</Button>}>
                <Typography variant="body2" color="text.secondary">
                  Empieza con las necesidades mensuales. Regístralas en tu espacio individual y decide cuáles compartir.
                </Typography>
                <Chip label="Necesidades mensuales disponibles" color="success" size="small" sx={{ mt: 2 }} />
              </Panel>
              <Panel title="Metas y proyectos" icon={<FavoriteRounded />} action={<Chip label="Próximamente" size="small" />}>
                <Typography variant="body2" color="text.secondary">Sueños, planes y objetivos que quieran construir juntos.</Typography>
              </Panel>
            </Box>
          </Box>}
          {page === 'finances' && <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
            <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 1 }}>
              <WalletRounded color="primary" sx={{ fontSize: 34 }} />
              <Typography variant="h4">Finanzas</Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Organiza tus necesidades mensuales. Los demás módulos financieros estarán disponibles próximamente.
            </Typography>
            <Panel title="Necesidades mensuales" icon={<ChecklistRounded />}>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                {scope === 'personal' ? 'Esta es tu lista individual. Comparte únicamente lo que decidas.' :
                  'Solo aparecen las necesidades que cada miembro decidió compartir. Sus valores son informativos, no pagos automáticos.'}
              </Typography>
              {needsError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setNeedsError('')}>{needsError}</Alert>}
              {needsLoading && <LinearProgress sx={{ mb: 2 }} />}
              {demo ? <Alert severity="info">Inicia sesión para crear y guardar necesidades reales.</Alert> : <>
                {scope === 'personal' && <Box component="form" onSubmit={event => { event.preventDefault(); void saveNeed(); }}
                  sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mb: 3 }}>
                  <TextField required label="Nombre de la necesidad" value={needName}
                    inputProps={{ maxLength: 150 }} onChange={e => setNeedName(e.target.value)} />
                  <TextField required type="number" label="Costo mensual (MXN)" value={needCost}
                    inputProps={{ min: 0, step: '0.01' }} onChange={e => setNeedCost(e.target.value)} />
                  <TextField select label="Prioridad" value={needPriority}
                    onChange={e => setNeedPriority(e.target.value as MonthlyNeed['priority'])}>
                    {needPriorities.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                  </TextField>
                  <FormControlLabel control={<Checkbox checked={needShared} onChange={e => setNeedShared(e.target.checked)} />}
                    label="Compartir con mi pareja" />
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" disabled={needsLoading || !needName.trim() || !needCost.trim()}>
                      {editingNeed ? 'Guardar cambios' : 'Añadir necesidad'}
                    </Button>
                    {editingNeed !== null && <Button onClick={resetNeedForm}>Cancelar</Button>}
                  </Stack>
                </Box>}
                <Divider sx={{ mb: 2 }} />
                {monthlyNeeds.length === 0 ? <Typography color="text.secondary">
                  {scope === 'personal' ? 'Aún no tienes necesidades registradas.' :
                    'No hay necesidades compartidas todavía.'}
                </Typography> : <Stack spacing={1}>
                  {monthlyNeeds.map(need => <Card key={need.id} variant="outlined" sx={{ boxShadow: 'none' }}>
                    <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={700}>{need.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{scope === 'shared' ? `Registrada por ${need.owner_name}` : need.shared ? 'Visible para tu pareja' : 'Solo tú puedes verla'}</Typography>
                        </Box>
                        <Chip size="small" variant="outlined" label={needPriorities.find(p => p.value === need.priority)?.label || need.priority} />
                        <Typography fontWeight={700}>{currency(Number(need.cost))}/mes</Typography>
                        {scope === 'personal' && <Stack direction="row" gap={0.5}>
                          <Button size="small" onClick={() => {
                            setEditingNeed(need.id); setNeedName(need.name); setNeedCost(need.cost);
                            setNeedPriority(need.priority); setNeedShared(need.shared);
                          }}>Editar</Button>
                          <Button size="small" color="error" onClick={() => void removeNeed(need.id)}>Eliminar</Button>
                        </Stack>}
                      </Stack>
                    </CardContent>
                  </Card>)}
                  <Stack direction="row" justifyContent="space-between" sx={{ pt: 2 }}>
                    <Typography fontWeight={600}>Total mensual {scope === 'shared' ? 'compartido' : 'individual'}</Typography>
                    <Typography fontWeight={700}>{currency(monthlyNeeds.reduce((sum, need) => sum + Number(need.cost), 0))}</Typography>
                  </Stack>
                </Stack>}
              </>}
            </Panel>
            <Box className="two-column">
              <Panel title="Ingresos y presupuestos" icon={<WalletRounded />} action={<Chip size="small" label="Próximamente" />}>
                <Typography variant="body2" color="text.secondary">Más adelante podrás decidir qué información financiera mostrar a tu pareja.</Typography>
              </Panel>
              <Panel title="Compras e inversiones" icon={<ShoppingCartRounded />} action={<Chip size="small" label="Próximamente" />}>
                <Typography variant="body2" color="text.secondary">Planeación de compras, ahorro y otras metas económicas.</Typography>
              </Panel>
            </Box>
          </Box>}
          {page === 'profile' && <Box sx={{ maxWidth: 660, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Administración de mi espacio</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Configura el nombre que aparecerá en tu panel. La portada pública siempre conserva la marca EntreNos.
            </Typography>
            <Panel title={paired ? "Nombre de nuestra aplicación" : "Nombre de mi aplicación"} icon={<FavoriteRounded />}>
              <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
                {paired
                  ? 'Ambos pueden cambiar este nombre y los dos verán el mismo título de su espacio compartido.'
                  : 'Personaliza tu espacio individual; después podrás elegir un nombre compartido con tu pareja.'}
              </Typography>
              <Box component="form" onSubmit={event => { event.preventDefault(); void (paired ? saveSharedName() : saveAppName()); }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="start">
                  <TextField label={paired ? 'Nombre compartido' : 'Nombre de tu espacio'}
                    value={paired ? sharedNameDraft : nameDraft}
                    onChange={event => paired ? setSharedNameDraft(event.target.value) : setNameDraft(event.target.value)}
                    inputProps={{ maxLength: 60 }}
                    placeholder="Ej. Nuestro rincón" helperText="Hasta 60 caracteres; vacío usa «Nuestro espacio»."
                    fullWidth />
                  <Button type="submit" variant="contained" disabled={loading} sx={{ minHeight: 56 }}>
                    Guardar
                  </Button>
                </Stack>
              </Box>
            </Panel>
            {paired && <Button sx={{ mb: 2 }} onClick={() => void refreshPairing()}>
              Actualizar nombre compartido
            </Button>}
            {paired && <Panel title="Fotografía de nuestro espacio" icon={<FavoriteRounded />}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ambos verán esta imagen en el panel. Por ahora puedes pegar una URL HTTPS de la fotografía; más adelante añadiremos subida de archivos.
              </Typography>
              {sharedImage && <Box component="img" src={sharedImage} alt="Foto compartida" sx={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 2, mb: 2 }} />}
              <TextField fullWidth label="URL HTTPS de la imagen" value={imageDraft}
                onChange={e => setImageDraft(e.target.value)} placeholder="https://..." />
              <Button sx={{ mt: 2 }} variant="outlined" disabled={loading} onClick={() => void saveSharedImage()}>
                Guardar foto compartida
              </Button>
            </Panel>}
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
