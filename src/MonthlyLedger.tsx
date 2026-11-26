import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, Divider, FormControlLabel, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ArrowBackRounded, ArrowForwardRounded } from '@mui/icons-material';
import { api } from './api/client';

export function currentMonth() {
  const d = new Date();
  return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function dateForMonth(month: string) {
  const d = new Date();
  return month + '-' + (month === currentMonth() ? String(d.getDate()).padStart(2, '0') : '01');
}
function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  const d = new Date(year, number - 1 + delta, 1);
  return String(d.getFullYear()).padStart(4, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
const money = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
type Entry = { id: number; name: string; category: string; cost?: string; amount?: string; purchase_date?: string; received_date?: string; shared: boolean; purchased?: boolean; owner_share?: number; owner_name: string };
type Draft = { name: string; category: string; amount: string; date: string; shared: boolean; purchased: boolean; share: number };
type Props = { kind: 'purchases' | 'incomes'; scope: 'personal' | 'shared'; token: string; demo: boolean; paired: boolean; month: string; onMonth: (value: string) => void };
export function MonthlyLedger({ kind, scope, token, demo, paired, month, onMonth }: Props) {
  const income = kind === 'incomes';
  const categories = income ? ['Salario', 'Negocio', 'Comisiones', 'Rentas', 'Bonos', 'Otros'] : ['Supermercado', 'Limpieza', 'Higiene', 'Mascotas', 'Equipamiento', 'Otros'];
  const fresh = (): Draft => ({ name: '', category: categories[0], amount: '', date: dateForMonth(month), shared: false, purchased: true, share: 100 });
  const [draft, setDraft] = useState<Draft>(fresh);
  const [editing, setEditing] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const endpoint = '/finances/' + kind + '/';
  useEffect(() => {
    setEntries([]); setError(''); setEditing(null); setDraft(fresh());
    if (!token || demo) return;
    let active = true;
    setBusy(true);
    api<Entry[]>(endpoint + '?scope=' + scope + '&month=' + month, {}, token)
      .then(data => { if (active) setEntries(data); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'No se pudieron cargar los registros.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [token, demo, endpoint, scope, month, revision]);
  async function save() {
    if (!token || busy || scope !== 'personal') return;
    if (!draft.name.trim() || !draft.amount.trim() || !Number.isFinite(Number(draft.amount)) || Number(draft.amount) < 0 || draft.date.slice(0, 7) !== month) {
      setError('Ingresa un concepto, importe válido y fecha del mes seleccionado.'); return;
    }
    setBusy(true); setError('');
    try {
      const body = income ? { name: draft.name.trim(), category: draft.category, amount: draft.amount, received_date: draft.date, shared: draft.shared } :
        { name: draft.name.trim(), category: draft.category, cost: draft.amount, purchase_date: draft.date, shared: draft.shared, purchased: draft.purchased, owner_share: draft.share };
      await api<Entry>(endpoint + (editing === null ? '' : editing + '/'), { method: editing === null ? 'POST' : 'PATCH', body: JSON.stringify(body) }, token);
      setRevision(n => n + 1);
    } catch(e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  async function remove(id: number) {
    if (!token || busy || scope !== 'personal' || !window.confirm('¿Eliminar este registro?')) return;
    setBusy(true); setError('');
    try { await api<unknown>(endpoint + id + '/', { method: 'DELETE' }, token); setRevision(n => n + 1); }
    catch(e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar.'); }
    finally { setBusy(false); }
  }
  const total = entries.reduce((sum, e) => sum + ((income || e.purchased) ? Number(e.amount ?? e.cost ?? 0) : 0), 0);
  const pending = entries.reduce((sum, e) => sum + (!income && !e.purchased ? Number(e.cost ?? 0) : 0), 0);
  return <Card><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography variant="h5" color="primary.main" gutterBottom>{income ? 'Ingresos y presupuestos' : 'Compras y gastos del hogar'}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{income ? 'Registra importes netos efectivamente recibidos. Compartirlos no significa destinarlos a gastos comunes.' : 'Organiza las compras por mes. Solo las realizadas se suman al balance; las pendientes son una previsión.'}</Typography>
    <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 2 }}>
      <Button aria-label="Mes anterior" onClick={() => onMonth(shiftMonth(month, -1))} disabled={busy}><ArrowBackRounded /></Button>
      <TextField type="month" label="Mes" size="small" InputLabelProps={{ shrink: true }} value={month} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) onMonth(e.target.value); }} disabled={busy} />
      <Button aria-label="Mes siguiente" onClick={() => onMonth(shiftMonth(month, 1))} disabled={busy}><ArrowForwardRounded /></Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {busy && <LinearProgress sx={{ mb: 2 }} />}
    {demo ? <Alert severity="info">Inicia sesión para guardar registros.</Alert> : <>
      {scope === 'personal' && <Box component="form" onSubmit={e => { e.preventDefault(); void save(); }} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <TextField required label={income ? 'Fuente de ingreso' : 'Concepto de compra'} value={draft.name} inputProps={{ maxLength: 150 }} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        <TextField select label="Categoría" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>{categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
        <TextField required type="number" label={income ? 'Importe neto (MXN)' : 'Importe (MXN)'} value={draft.amount} inputProps={{ min: 0, step: '0.01' }} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
        <TextField required type="date" label={income ? 'Fecha de recepción' : 'Fecha de compra'} InputLabelProps={{ shrink: true }} value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
        {!income && <FormControlLabel control={<Checkbox checked={draft.purchased} onChange={e => setDraft(d => ({ ...d, purchased: e.target.checked }))} />} label="Compra realizada" />}
        <FormControlLabel control={<Checkbox checked={draft.shared} disabled={!paired} onChange={e => setDraft(d => ({ ...d, shared: e.target.checked, share: 100 }))} />} label="Compartir con mi pareja" />
        {!income && draft.shared && <TextField type="number" label="Mi porcentaje (%)" value={draft.share} inputProps={{ min: 0, max: 100, step: 1 }} onChange={e => setDraft(d => ({ ...d, share: Number(e.target.value) }))} />}
        <Stack direction="row" gap={1}><Button type="submit" variant="contained" disabled={busy || !draft.name.trim() || !draft.amount.trim()}>{editing === null ? 'Añadir' : 'Guardar cambios'}</Button>{editing !== null && <Button onClick={() => { setEditing(null); setDraft(fresh()); }}>Cancelar</Button>}</Stack>
      </Box>}
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={1.5}>
        {!entries.length && !busy && <Typography color="text.secondary">No hay registros en este mes.</Typography>}
        {entries.map(entry => <Card key={entry.id} variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
          <Box sx={{ flex: 1 }}><Typography fontWeight={700}>{entry.name}</Typography><Typography variant="caption" color="text.secondary">{entry.category} · {entry.received_date || entry.purchase_date} · {scope === 'shared' ? entry.owner_name : entry.shared ? 'Compartido' : 'Privado'}</Typography></Box>
          {!income && <Chip size="small" label={entry.purchased ? 'Realizada' : 'Pendiente'} color={entry.purchased ? 'success' : 'default'} />}
          <Typography fontWeight={700}>{money(Number(entry.amount ?? entry.cost ?? 0))}</Typography>
          {scope === 'personal' && <Stack direction="row"><Button size="small" disabled={busy} onClick={() => { setEditing(entry.id); setDraft({ name: entry.name, category: entry.category, amount: entry.amount ?? entry.cost ?? '', date: entry.received_date || entry.purchase_date || dateForMonth(month), shared: entry.shared, purchased: entry.purchased ?? true, share: entry.owner_share ?? 100 }); }}>Editar</Button><Button size="small" color="error" disabled={busy} onClick={() => void remove(entry.id)}>Eliminar</Button></Stack>}
        </Stack></CardContent></Card>)}
        <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>{income ? 'Ingresos del mes' : 'Compras realizadas'}</Typography><Typography variant="h6">{money(total)}</Typography></Stack>
        {!income && <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Compras pendientes</Typography><Typography>{money(pending)}</Typography></Stack>}
      </Stack>
    </>}
  </CardContent></Card>;
}
