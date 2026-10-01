import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileText, Mail, MessageSquare, Pencil, Search, Send, ShieldCheck, Sparkles, Star, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type OpsTab = 'customers' | 'messages' | 'promotions' | 'reviews' | 'staff' | 'schedule' | 'time' | 'timeoff' | 'orders' | 'account' | 'activity';
export type SiteSettings = { join_family_enabled: boolean; seasonal_nav_enabled: boolean; online_ordering_enabled: boolean };
type Customer = { id: string; full_name: string; email: string | null; phone: string | null; email_consent: boolean; sms_consent: boolean; source: string; created_at: string };
type Promotion = { id?: string; title: string; message: string; coupon_code: string; starts_at: string; ends_at: string; is_published: boolean };
type HolidayPage = { id?: string; title: string; slug: string; description: string; image_url: string; is_published: boolean };
type Staff = { id: string; display_name: string; role: string; is_active: boolean };
type Log = { id: string; action: string; details: string; created_at: string };
type ManagerHour = { id: string; day_key: string; day_label: string; open_time: string | null; close_time: string | null; is_closed: boolean };

const birthdayImage = 'https://www.europeansbest.com/wp-content/uploads/birthday_cake.jpg';

function FormShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <section className="page-section container form-page"><div className="page-heading"><div className="section-kicker">European's Best</div><h1>{title}</h1><p>{intro}</p></div>{children}</section>;
}

function ContactFields({ values, setValues }: { values: { full_name: string; email: string; phone: string; email_consent: boolean; sms_consent: boolean }; setValues: (values: { full_name: string; email: string; phone: string; email_consent: boolean; sms_consent: boolean }) => void }) {
  return <><label>Name<input required value={values.full_name} onChange={(event) => setValues({ ...values, full_name: event.target.value })} placeholder="Your name" /></label><div className="form-two"><label>Email<input required type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder="you@example.com" /></label><label>Phone<input required type="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} placeholder="440-555-0123" /></label></div><label className="consent"><input type="checkbox" checked={values.email_consent} onChange={(event) => setValues({ ...values, email_consent: event.target.checked })} /> Send me weekly specials by email.</label><label className="consent"><input type="checkbox" checked={values.sms_consent} onChange={(event) => setValues({ ...values, sms_consent: event.target.checked })} /> Text me about this request and future specials.</label></>;
}

export function CateringPage({ onBack }: { onBack: () => void }) {
  const [values, setValues] = useState({ full_name: '', email: '', phone: '', email_consent: false, sms_consent: false }); const [details, setDetails] = useState(''); const [pickupDate, setPickupDate] = useState(''); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setStatus(''); const result = await supabase.from('inquiries').insert({ inquiry_type: 'catering', full_name: values.full_name, email: values.email, phone: values.phone, pickup_date: pickupDate || null, details }).select('id').maybeSingle(); if (result.error) setStatus('We could not send that request. Please call us at 440-572-0600.'); else { await supabase.from('customer_contacts').insert({ ...values, source: 'catering' }); setStatus("Thanks! Your catering inquiry is in our inbox. We'll be in touch soon."); setValues({ full_name: '', email: '', phone: '', email_consent: false, sms_consent: false }); setDetails(''); setPickupDate(''); } setBusy(false); }
  return <FormShell title="Bring European's Best to the party." intro="Tell us about your gathering and we'll help plan a warm, generous spread of party trays, bakery favorites, and family-style comfort."><form className="form-card narrow-form" onSubmit={submit}><ContactFields values={values} setValues={setValues} /><label>Event or pickup date<input type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} /></label><label>Tell us about your gathering<textarea required rows={7} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Guest count, occasion, timing, party trays, desserts, and anything else we should know" /></label>{status && <div className={status.startsWith('Thanks') ? 'form-success' : 'form-error'}>{status}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Sending inquiry…' : 'Send catering inquiry'} <ArrowRight size={17} /></button></form><button className="text-link form-back" onClick={onBack}>Back to visit page <ArrowRight size={16} /></button></FormShell>;
}

export function ClubPage({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [emailConsent, setEmailConsent] = useState(true); const [smsConsent, setSmsConsent] = useState(false); const [status, setStatus] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); const result = await supabase.from('customer_contacts').insert({ full_name: name, email, phone: phone || null, email_consent: emailConsent, sms_consent: smsConsent, source: 'club' }); setStatus(result.error ? 'We could not add you right now. Please try again.' : "You're on the list. Watch for warm weekly specials from us."); if (!result.error) { setName(''); setEmail(''); setPhone(''); } }
  return <FormShell title="A little good news, every week." intro="Join the European's Best club for breakfast specials, Friday dinner reminders, bakery drops, and seasonal favorites."><form className="form-card narrow-form" onSubmit={submit}><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Phone <span className="muted-label">(optional)</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="consent"><input type="checkbox" checked={emailConsent} onChange={(event) => setEmailConsent(event.target.checked)} /> I agree to receive weekly specials by email.</label><label className="consent"><input type="checkbox" checked={smsConsent} onChange={(event) => setSmsConsent(event.target.checked)} /> I agree to receive occasional texts. Message rates may apply.</label>{status && <div className={status.startsWith('You') ? 'form-success' : 'form-error'}>{status}</div>}<button className="button button-primary">Join the club <Mail size={17} /></button><p className="form-footnote">You can ask us to stop messages at any time.</p></form><button className="text-link form-back" onClick={onBack}>Back to the website <ArrowRight size={16} /></button></FormShell>;
}

export function SeasonalPage({ onBack }: { onBack: () => void }) {
  const [pages, setPages] = useState<HolidayPage[]>([]); useEffect(() => { supabase.from('holiday_pages').select('*').eq('is_published', true).order('title').then(({ data }) => setPages(data ?? [])); }, []);
  return <FormShell title="Seasonal bakery favorites." intro="Our holiday case changes with the calendar. Check back for fresh announcements, special pastries, and celebration orders."><div className="seasonal-grid">{pages.map((page) => <article className="seasonal-card" key={page.id}><img src={page.image_url || birthdayImage} alt={page.title} /><div><div className="section-kicker">Coming up</div><h2>{page.title}</h2><p>{page.description}</p><button className="text-link" onClick={() => onBack()}>Ask about this season <ArrowRight size={16} /></button></div></article>)}{pages.length === 0 && <div className="empty-state"><Sparkles size={22} /><h2>New seasonal favorites are coming.</h2><p>Call us at 440-572-0600 to ask what's fresh in the case today.</p></div>}</div><button className="text-link form-back" onClick={onBack}>Back to bakery <ArrowRight size={16} /></button></FormShell>;
}

type StaffDashboard = { staff: { id: string; display_name: string; role: string; can_view_calendar: boolean }; current_status: string | null; active_since: string | null; events: { event_type: string; created_at: string; notes: string }[]; schedules: { date: string; start_time: string; end_time: string; notes: string }[] };

function elapsedSince(value: string | null, now: number) { if (!value) return 'Not clocked in'; const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000)); return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`; }
function eventLabel(value: string) { return value === 'clock_in' ? 'Clocked in' : value === 'clock_out' ? 'Clocked out' : value === 'break_start' ? 'Break started' : 'Break ended'; }
function formatHour(value: string | null) { if (!value) return 'Closed'; const [h, m] = value.split(':').map(Number); const suffix = h >= 12 ? 'pm' : 'am'; const dh = h % 12 || 12; return `${dh}:${String(m).padStart(2, '0')}${suffix}`; }

export function StaffKioskPage({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState(''); const [pin, setPin] = useState(''); const [note, setNote] = useState(''); const [dashboard, setDashboard] = useState<StaffDashboard | null>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now());
  const [timeOffStart, setTimeOffStart] = useState(''); const [timeOffEnd, setTimeOffEnd] = useState(''); const [timeOffReason, setTimeOffReason] = useState('');
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => { window.clearInterval(timer); }; }, [pin]);
  async function signIn(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(''); const { data, error } = await supabase.rpc('staff_sign_in', { p_name: name, p_pin: pin }); if (error || !data) setMessage('We could not verify that first name and code. Please try again.'); else setDashboard(data as StaffDashboard); setBusy(false); }
  async function refresh() { const { data } = await supabase.rpc('staff_dashboard', { p_pin: pin }); if (data) setDashboard(data as StaffDashboard); }
  async function doAction(action: string) { setBusy(true); const { error } = await supabase.rpc('staff_clock_action', { p_pin: pin, p_action: action, p_note: note }); if (error) setMessage('That time action is not available right now.'); else { setMessage('Time saved.'); setNote(''); await refresh(); } setBusy(false); }
  async function submitTimeOff() { if (!timeOffStart || !timeOffEnd) { setMessage('Please pick a start and end date.'); return; } const { error } = await supabase.rpc('staff_request_time_off', { p_pin: pin, p_start_date: timeOffStart, p_end_date: timeOffEnd, p_reason: timeOffReason }); setMessage(error ? 'Could not submit that request.' : 'Time off request sent to the owner.'); if (!error) { setTimeOffStart(''); setTimeOffEnd(''); setTimeOffReason(''); } }
  const status = dashboard?.current_status;
  if (!dashboard) return <div className="kiosk-page"><div className="kiosk-card"><Clock3 size={30} /><div className="section-kicker">Team time clock</div><h1>Welcome, team.</h1><p>Enter your first name and personal code to clock in and see your schedule.</p><form className="kiosk-form" onSubmit={signIn}><label className="kiosk-label">First name<input className="kiosk-field login-field" value={name} onChange={(event) => setName(event.target.value)} placeholder="First name" required /></label><label className="kiosk-label">Enter code<input className="kiosk-field login-field" inputMode="numeric" pattern="[0-9]*" maxLength={12} value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter code" aria-label="Staff code" required /></label>{message && <div className="form-error">{message}</div>}<button className="button button-primary full-button" disabled={busy}>{busy ? 'Checking…' : 'Open my staff page'} <ArrowRight size={17} /></button></form><button className="text-link" onClick={onBack}>Back to website <ArrowRight size={16} /></button></div></div>;
  return <div className="kiosk-page"><div className="staff-dashboard-card"><div className="staff-dashboard-head"><div><div className="section-kicker">Staff page</div><h1>Hi, {dashboard.staff.display_name}.</h1><p>{dashboard.staff.role} · Your workday at a glance.</p></div><button className="text-link" onClick={() => { setDashboard(null); setPin(''); }}>Sign out</button></div><div className="clock-status"><div><span className={status === 'clock_in' || status === 'break_end' ? 'status-dot' : 'status-dot closed'} /> <strong>{status === 'break_start' ? 'On break' : status === 'clock_in' || status === 'break_end' ? `Clocked in for ${elapsedSince(dashboard.active_since, now)}` : 'Not clocked in'}</strong></div><div className="clock-actions"><button className="button button-primary" onClick={() => doAction(status === 'break_start' ? 'break_end' : status === 'clock_in' || status === 'break_end' ? 'clock_out' : 'clock_in')} disabled={busy}>{status === 'break_start' ? 'End break' : status === 'clock_in' || status === 'break_end' ? 'Clock out' : 'Clock in'} <Clock3 size={16} /></button>{(status === 'clock_in' || status === 'break_end') && <button className="button button-outline" onClick={() => doAction('break_start')} disabled={busy}>Start break</button>}</div></div><label className="staff-note-field">Note for this time action<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Forgot to clock out? Add a note for the owner here." /></label>{message && <div className="form-success">{message}</div>}<div className="time-off-request-form"><div className="section-kicker">Request time off</div><h3>Pick your dates and send the request</h3><div className="form-two"><label>Start date<input type="date" value={timeOffStart} onChange={(event) => setTimeOffStart(event.target.value)} /></label><label>End date<input type="date" value={timeOffEnd} onChange={(event) => setTimeOffEnd(event.target.value)} /></label></div><label>Reason <span className="muted-label">(optional)</span><textarea rows={2} value={timeOffReason} onChange={(event) => setTimeOffReason(event.target.value)} placeholder="Vacation, appointment, etc." /></label><button className="button button-primary" onClick={submitTimeOff}>Submit request <ArrowRight size={16} /></button></div>{dashboard.staff.role === 'manager' && <ManagerDashboard pin={pin} />}<div className="staff-dashboard-grid"><section className="staff-panel"><div className="section-kicker">My time</div><h2>Clock history</h2>{dashboard.events.slice(0, 15).map((event, index) => <div className="staff-event" key={`${event.created_at}-${index}`}><span>{eventLabel(event.event_type)}<small>{event.notes}</small></span><strong>{new Date(event.created_at).toLocaleString()}</strong></div>)}{dashboard.events.length === 0 && <p className="muted-copy">No clock history yet.</p>}</section>{dashboard.staff.can_view_calendar && <section className="staff-panel"><div className="section-kicker">Everyone's schedule</div><h2>Upcoming shifts</h2>{dashboard.schedules.map((schedule) => <div className="staff-event" key={`${schedule.date}-${schedule.start_time}`}><span>{schedule.date}</span><strong>{schedule.start_time}–{schedule.end_time}<small>{schedule.notes}</small></strong></div>)}{dashboard.schedules.length === 0 && <p className="muted-copy">No upcoming shifts have been posted.</p>}</section>}</div></div></div>;
}

const gridDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type GridDay = {
  date: string; day_name: string;
  clock_in: string | null; clock_in_raw: string | null; clock_in_event_id: string | null;
  clock_out: string | null; clock_out_raw: string | null; clock_out_event_id: string | null;
  break_start: string | null; break_end: string | null;
  notes: string | null; is_currently_in: boolean; current_status: string | null;
};
type GridStaff = {
  staff_id: string; display_name: string; role: string;
  current_status: string | null; active_since: string | null; days: GridDay[];
};

type MgrTab = 'time' | 'timeoff' | 'messages' | 'hours';

type TimeEdit = { eventId: string; staffName: string; eventType: string; rawTime: string; notes: string };

function TimeEditModal({ edit, onClose, onSave }: { edit: TimeEdit; onClose: () => void; onSave: (eventId: string, eventType: string, rawTime: string, notes: string) => void }) {
  const [eventType, setEventType] = useState(edit.eventType);
  const [rawTime, setRawTime] = useState(edit.rawTime);
  const [notes, setNotes] = useState(edit.notes);
  return <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={onClose}><X /></button><div className="section-kicker">Edit time entry</div><h2>{edit.staffName}</h2><label>Action<select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="clock_in">Clocked in</option><option value="clock_out">Clocked out</option><option value="break_start">Break started</option><option value="break_end">Break ended</option></select></label><label>Time<input type="datetime-local" value={rawTime.length >= 16 ? rawTime.slice(0, 16) : rawTime} onChange={(event) => setRawTime(event.target.value)} /></label><label>Note<input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Note" /></label><button className="button button-primary full-button" onClick={() => onSave(edit.eventId, eventType, rawTime, notes)}>Save time <Check size={17} /></button></div></div>;
}

async function saveTimeEntryOwner(eventId: string, eventType: string, rawTime: string, notes: string) {
  const isoTime = rawTime.length === 16 ? new Date(rawTime).toISOString() : rawTime;
  const { error } = await supabase.rpc('owner_update_clock_event', { p_event_id: eventId, p_event_type: eventType, p_created_at: isoTime, p_note: notes });
  return error;
}

async function saveTimeEntryManager(pin: string, eventId: string, eventType: string, rawTime: string, notes: string) {
  const isoTime = rawTime.length === 16 ? new Date(rawTime).toISOString() : rawTime;
  const { error } = await supabase.rpc('staff_manager_update_clock_event', { p_pin: pin, p_event_id: eventId, p_event_type: eventType, p_created_at: isoTime, p_note: notes });
  return error;
}

function ManagerDashboard({ pin }: { pin: string }) {
  const [tab, setTab] = useState<MgrTab>('time');
  return <section className="staff-panel manager-time-panel"><div className="section-kicker">Manager tools</div><h2>Team management</h2><div className="mgr-tabs"><button className={tab === 'time' ? 'selected' : ''} onClick={() => setTab('time')}><Clock3 size={16} /> Time grid</button><button className={tab === 'timeoff' ? 'selected' : ''} onClick={() => setTab('timeoff')}><CalendarIconSmall /> Time off</button><button className={tab === 'messages' ? 'selected' : ''} onClick={() => setTab('messages')}><Mail size={16} /> Messages</button><button className={tab === 'hours' ? 'selected' : ''} onClick={() => setTab('hours')}><Clock3 size={16} /> Hours</button></div>{tab === 'time' && <ManagerTimeGrid pin={pin} />}{tab === 'timeoff' && <ManagerTimeOff pin={pin} />}{tab === 'messages' && <ManagerMessages />}{tab === 'hours' && <ManagerHours />}</section>;
}

function CalendarIconSmall() { return <span style={{ fontSize: '14px' }}>📅</span>; }

function ManagerTimeGrid({ pin }: { pin: string }) {
  const [grid, setGrid] = useState<GridStaff[]>([]);
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<TimeEdit | null>(null);

  async function load() {
    const { data, error } = await supabase.rpc('staff_manager_week_grid', { p_pin: pin, p_week_start: isoDate(weekStart) });
    if (error) { setNotice('Could not load the time grid.'); return; }
    setGrid((data ?? []) as GridStaff[]);
  }
  useEffect(() => { load(); }, [weekStart]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);

  async function clockAction(staffId: string, action: string) {
    const { error } = await supabase.rpc('staff_manager_clock_action', { p_pin: pin, p_staff_id: staffId, p_action: action, p_note: '' });
    setNotice(error ? `Could not ${action.replace('_', ' ')} that staff member.` : 'Time action saved.');
    if (!error) await load();
  }

  async function handleSave(eventId: string, eventType: string, rawTime: string, notes: string) {
    const error = await saveTimeEntryManager(pin, eventId, eventType, rawTime, notes);
    setNotice(error ? 'Could not save that time entry.' : 'Time entry updated.');
    setEditing(null);
    if (!error) await load();
  }

  function moveWeek(direction: number) { setWeekStart(new Date(weekStart.getTime() + direction * 7 * 86400000)); }

  function statusLabel(staff: GridStaff) {
    const s = staff.current_status;
    if (s === 'break_start') return 'On break';
    if (s === 'clock_in' || s === 'break_end') return `Clocked in${staff.active_since ? ` for ${elapsedSince(staff.active_since, now)}` : ''}`;
    return 'Clocked out';
  }

  return <>{notice && <div className="form-success">{notice}</div>}<div className="week-nav-bar"><div className="week-selector"><button className="category-arrow" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={20} /></button><div><span className="section-kicker">Week of</span><h3>{weekRangeMon(weekStart)}</h3></div><button className="category-arrow" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={20} /></button></div></div><div className="time-grid-wrapper"><div className="time-grid-scroll"><table className="time-grid-table"><thead><tr><th className="time-grid-name-col">Staff member</th>{gridDayNames.map((day) => <th key={day}>{day.slice(0, 3)}</th>)}</tr></thead><tbody>{grid.map((staff) => <tr key={staff.staff_id}><td className="time-grid-name-col"><div className="time-grid-staff-cell"><span className={`time-grid-status-dot ${staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? '' : 'closed'}`} /><div><strong>{staff.display_name}</strong><small>{statusLabel(staff)}</small></div><div className="time-grid-actions"><button className="time-grid-mini-btn" onClick={() => clockAction(staff.staff_id, staff.current_status === 'break_start' ? 'break_end' : staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? 'clock_out' : 'clock_in')} title={staff.current_status === 'break_start' ? 'End break' : staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? 'Clock out' : 'Clock in'}>{staff.current_status === 'break_start' ? 'End brk' : staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? 'Out' : 'In'}</button>{(staff.current_status === 'clock_in' || staff.current_status === 'break_end') && <button className="time-grid-mini-btn" onClick={() => clockAction(staff.staff_id, 'break_start')} title="Start break">Brk</button>}</div></div></td>{staff.days.map((day) => <td key={day.date} className={day.is_currently_in ? 'time-grid-cell active' : 'time-grid-cell'}><div className="time-grid-times">{day.clock_in ? <><span className="tg-in">In: {day.clock_in}{day.clock_in_event_id && <button className="tg-edit-btn" onClick={() => setEditing({ eventId: day.clock_in_event_id!, staffName: staff.display_name, eventType: 'clock_in', rawTime: day.clock_in_raw ?? '', notes: day.notes ?? '' })} title="Edit clock in"><Pencil size={11} /></button>}</span>{day.clock_out ? <span className="tg-out">Out: {day.clock_out}{day.clock_out_event_id && <button className="tg-edit-btn" onClick={() => setEditing({ eventId: day.clock_out_event_id!, staffName: staff.display_name, eventType: 'clock_out', rawTime: day.clock_out_raw ?? '', notes: day.notes ?? '' })} title="Edit clock out"><Pencil size={11} /></button>}</span> : day.is_currently_in ? <span className="tg-current">Out: current</span> : <span className="tg-missing">Out: —</span>}</> : <span className="tg-none">—</span>}{day.break_start && <span className="tg-break">Break: {day.break_start}–{day.break_end ?? 'current'}</span>}</div>{day.notes && <div className="time-grid-notes">{day.notes}</div>}</td>)}</tr>)}</tbody></table></div>{grid.length === 0 && <p className="muted-copy">No active staff.</p>}</div>{editing && <TimeEditModal edit={editing} onClose={() => setEditing(null)} onSave={handleSave} />}</>;
}

type MgrTimeOffReq = { id: string; staff_id: string; start_date: string; end_date: string; reason: string; status: string; created_at: string; staff_members?: { display_name: string }[] };

function ManagerTimeOff({ pin }: { pin: string }) {
  const [requests, setRequests] = useState<MgrTimeOffReq[]>([]);
  const [notice, setNotice] = useState('');
  async function load() { const { data } = await supabase.from('time_off_requests').select('*,staff_members(display_name)').order('created_at', { ascending: false }); setRequests(data ?? []); }
  useEffect(() => { load(); }, []);
  async function updateStatus(id: string, status: string) { const { error } = await supabase.rpc('staff_manager_update_time_off', { p_pin: pin, p_request_id: id, p_status: status }); setNotice(error ? 'Could not update that request.' : `Request ${status}.`); if (!error) await load(); }
  const pending = requests.filter((item) => item.status === 'pending');
  return <>{notice && <div className="form-success">{notice}</div>}{pending.length > 0 && <div className="content-list-card"><div className="list-card-heading"><div><div className="section-kicker">Pending</div><h3>{pending.length} pending {pending.length === 1 ? 'request' : 'requests'}</h3></div></div>{pending.map((item) => <div className="time-off-card" key={item.id}><div className="time-off-info"><strong>{item.staff_members?.[0]?.display_name ?? 'Staff member'}</strong><span>{item.start_date} to {item.end_date}{item.reason ? ` · ${item.reason}` : ''}</span></div><div className="check-all-buttons"><button className="button button-outline button-sm" onClick={() => updateStatus(item.id, 'approved')}>Approve</button><button className="button button-outline button-sm" onClick={() => updateStatus(item.id, 'denied')}>Deny</button></div></div>)}</div>}<div className="content-list-card"><div className="list-card-heading"><div><div className="section-kicker">All requests</div><h3>Time off history</h3></div></div>{requests.map((item) => <div className="time-off-card" key={item.id}><div className="time-off-info"><strong>{item.staff_members?.[0]?.display_name ?? 'Staff member'}</strong><span>{item.start_date} to {item.end_date}{item.reason ? ` · ${item.reason}` : ''}</span></div><div className="check-all-buttons"><span className={`time-off-status ${item.status}`}>{item.status}</span></div></div>)}{requests.length === 0 && <p className="muted-copy">No time off requests.</p>}</div></>;
}

function ManagerMessages() {
  const [items, setItems] = useState<{ id: string; full_name: string; email: string; phone: string | null; message: string; status: string; created_at: string }[]>([]);
  const [notice, setNotice] = useState('');
  useEffect(() => { supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).then(({ data }) => setItems(data ?? [])); }, []);
  async function updateStatus(id: string, status: string) { const { error } = await supabase.from('contact_messages').update({ status, updated_at: new Date().toISOString() }).eq('id', id); setNotice(error ? 'Could not update.' : 'Message updated.'); if (!error) setItems(items.map((item) => item.id === id ? { ...item, status } : item)); }
  return <>{notice && <div className="form-success">{notice}</div>}<div className="inbox-list">{items.map((item) => <article className="inbox-item" key={item.id}><div className="inbox-top"><span className="item-category">{item.status}</span><select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}><option>new</option><option>read</option><option>replied</option><option>archived</option></select></div><h3>{item.full_name}</h3><p>{item.message}</p><div className="inbox-meta"><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone && <a href={`tel:${item.phone}`}>{item.phone}</a>}<span>{new Date(item.created_at).toLocaleString()}</span></div></article>)}{items.length === 0 && <p className="muted-copy">No messages.</p>}</div></>;
}

function ManagerHours() {
  const [hours, setHours] = useState<ManagerHour[]>([]);
  useEffect(() => { supabase.from('site_hours').select('*').order('id').then(({ data }) => setHours(data ?? [])); }, []);
  return <div className="hours-readonly-list">{hours.map((hour) => <div className="hours-readonly-row" key={hour.id}><strong>{hour.day_label}</strong><span>{hour.is_closed ? 'Closed' : `${formatHour(hour.open_time)}–${formatHour(hour.close_time)}`}</span></div>)}</div>;
}

export function OperationsContent({ tab, onNotice, onSiteSettingsChange, onOwnerNameChange, onUnreadChange, onPendingTimeOffChange }: { tab: OpsTab; onNotice: (message: string) => void; onSiteSettingsChange: (settings: SiteSettings) => void; onOwnerNameChange?: (name: string) => void; onUnreadChange?: (count: number) => void; onPendingTimeOffChange?: (count: number) => void }) {
  if (tab === 'customers') return <CustomersPanel onNotice={onNotice} onSettingsChange={onSiteSettingsChange} />;
  if (tab === 'messages') return <MessagesPanel onNotice={onNotice} onUnreadChange={onUnreadChange} />;
  if (tab === 'promotions') return <PromotionsPanel onNotice={onNotice} />;
  if (tab === 'reviews') return <ReviewsPanel onNotice={onNotice} />;
  if (tab === 'staff') return <StaffPanel onNotice={onNotice} />;
  if (tab === 'schedule') return <SchedulePanel onNotice={onNotice} />;
  if (tab === 'time') return <StaffTimePanel onNotice={onNotice} />;
  if (tab === 'timeoff') return <TimeOffPanel onNotice={onNotice} onPendingTimeOffChange={onPendingTimeOffChange} />;
  if (tab === 'orders') return <OrdersPanel onNotice={onNotice} />;
  if (tab === 'account') return <AccountPanel onNotice={onNotice} onOwnerNameChange={onOwnerNameChange} />;
  return <ActivityPanel />;
}

function CustomersPanel({ onNotice, onSettingsChange }: { onNotice: (message: string) => void; onSettingsChange: (settings: SiteSettings) => void }) {
  const [items, setItems] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ join_family_enabled: true, seasonal_nav_enabled: true, online_ordering_enabled: false });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  useEffect(() => { Promise.all([supabase.from('customer_contacts').select('*').order('created_at', { ascending: false }), supabase.from('site_settings').select('join_family_enabled,seasonal_nav_enabled,online_ordering_enabled').eq('setting_key', 'main').maybeSingle()]).then(([customers, settingsResult]) => { setItems(customers.data ?? []); if (settingsResult.data) { setSettings(settingsResult.data); onSettingsChange(settingsResult.data); } }); }, [onSettingsChange]);
  async function updateSetting(key: keyof SiteSettings) { const next = { ...settings, [key]: !settings[key] }; const { error } = await supabase.from('site_settings').update({ ...next, updated_at: new Date().toISOString() }).eq('setting_key', 'main'); onNotice(error ? 'Could not update that homepage button.' : 'Homepage button updated.'); if (!error) { setSettings(next); onSettingsChange(next); } }
  const emailCustomers = items.filter((item) => item.email_consent && item.email);
  function toggleCustomer(id: string) { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); setSelected(next); }
  function checkAll() { setSelected(new Set(emailCustomers.map((item) => item.id))); }
  function uncheckAll() { setSelected(new Set()); }
  function sendEmail() { const recipients = emailCustomers.filter((item) => selected.has(item.id)); if (recipients.length === 0) { setEmailStatus('Select at least one customer to email.'); return; } const emails = recipients.map((item) => item.email).join(', '); window.location.href = `mailto:${emails}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`; setEmailStatus(`Opened your email app for ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}.`); }
  return <OpsPanel title="Customer list" intro="Use consent flags to see who agreed to email or text updates. Homepage buttons can be turned on or off here."><div className="site-toggle-card"><strong>Homepage buttons</strong><label><input type="checkbox" checked={settings.join_family_enabled} onChange={() => updateSetting('join_family_enabled')} /> Show Join the Family</label><label><input type="checkbox" checked={settings.online_ordering_enabled ?? false} onChange={() => updateSetting('online_ordering_enabled')} /> Show Order Online button</label></div><div className="email-blast-card"><div className="section-kicker">Email customers</div><h3>Send a message to everyone who opted in</h3><label>Subject<input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} placeholder="Weekly specials from European's Best" /></label><label>Message<textarea rows={4} value={emailBody} onChange={(event) => setEmailBody(event.target.value)} placeholder="Write your message here..." /></label>{emailStatus && <div className="form-success">{emailStatus}</div>}<button className="button button-primary" onClick={sendEmail} disabled={selected.size === 0}><Send size={16} /> Send to {selected.size} selected</button></div><div className="customer-email-section"><div className="customer-email-header"><div><strong>Email subscribers ({emailCustomers.length})</strong><small>Only customers who opted in to email are listed below.</small></div><div className="check-all-buttons"><button className="button button-outline button-sm" onClick={checkAll}>Check all</button><button className="button button-outline button-sm" onClick={uncheckAll}>Uncheck all</button></div></div><div className="customer-table"><div className="table-head"><span></span><span>Name</span><span>Email</span></div>{emailCustomers.map((item) => <div className="table-row" key={item.id}><label className="consent"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleCustomer(item.id)} /></label><strong>{item.full_name}</strong><span>{item.email}<br />{item.phone || 'No phone'}</span></div>)}{emailCustomers.length === 0 && <Empty title="No email subscribers yet" text="Customers who opt in to email will appear here." />}</div></div><div className="customer-all-section"><div className="section-kicker">All customers</div><div className="customer-table"><div className="table-head"><span>Name</span><span>Contact</span><span>Permission</span></div>{items.map((item) => <div className="table-row" key={item.id}><strong>{item.full_name}</strong><span>{item.email || 'No email'}<br />{item.phone || 'No phone'}</span><span>{item.email_consent && <b className="consent-pill">Email</b>}{item.sms_consent && <b className="consent-pill sms">Text</b>}{!item.email_consent && !item.sms_consent && <small>No outreach</small>}</span></div>)}{items.length === 0 && <Empty title="No customers yet" text="Signups and family requests will build your list here." />}</div></div></OpsPanel>;
}

function MessagesPanel({ onNotice, onUnreadChange }: { onNotice: (message: string) => void; onUnreadChange?: (count: number) => void }) { const [items, setItems] = useState<{ id: string; full_name: string; email: string; phone: string | null; message: string; status: string; created_at: string }[]>([]); async function load() { const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }); setItems(data ?? []); if (onUnreadChange) onUnreadChange(data?.filter((item) => item.status === 'new').length ?? 0); } useEffect(() => { load(); }, []); async function updateStatus(id: string, status: string) { const { error } = await supabase.from('contact_messages').update({ status, updated_at: new Date().toISOString() }).eq('id', id); onNotice(error ? 'Could not update that message.' : 'Message updated.'); if (!error) { setItems(items.map((item) => item.id === id ? { ...item, status } : item)); if (onUnreadChange) onUnreadChange(items.filter((item) => item.id !== id ? item.status === 'new' : status === 'new').length); } } async function deleteMessage(id: string) { if (!window.confirm('Delete this message permanently?')) return; const { error } = await supabase.from('contact_messages').delete().eq('id', id); onNotice(error ? 'Could not delete that message.' : 'Message deleted.'); if (!error) { const remaining = items.filter((item) => item.id !== id); setItems(remaining); if (onUnreadChange) onUnreadChange(remaining.filter((item) => item.status === 'new').length); } } return <OpsPanel title="Contact messages" intro="Read questions and messages sent from the Contact Us page."><div className="inbox-list">{items.map((item) => <article className="inbox-item" key={item.id}><div className="inbox-top"><span className="item-category">{item.status}</span><div className="inbox-top-actions"><select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}><option>new</option><option>read</option><option>replied</option><option>archived</option></select><button className="inbox-delete" onClick={() => deleteMessage(item.id)}><Trash2 size={14} /> Delete</button></div></div><h3>{item.full_name}</h3><p>{item.message}</p><div className="inbox-meta"><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone && <a href={`tel:${item.phone}`}>{item.phone}</a>}<span>{new Date(item.created_at).toLocaleString()}</span></div></article>)}{items.length === 0 && <Empty title="No contact messages yet" text="Messages from the website will appear here." />}</div></OpsPanel>; }

function PromotionsPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [promo, setPromo] = useState<Promotion>({ title: '', message: '', coupon_code: '', starts_at: new Date().toISOString().slice(0, 16), ends_at: '', is_published: false }); const [holiday, setHoliday] = useState<HolidayPage>({ title: '', slug: '', description: '', image_url: '', is_published: false }); const [promotions, setPromotions] = useState<Promotion[]>([]); const [holidays, setHolidays] = useState<HolidayPage[]>([]); const [seasonalNav, setSeasonalNav] = useState(true);
  async function load() { const [promotionResult, holidayResult, settingsResult] = await Promise.all([supabase.from('promotions').select('*').order('created_at', { ascending: false }), supabase.from('holiday_pages').select('*').order('title'), supabase.from('site_settings').select('seasonal_nav_enabled').eq('setting_key', 'main').maybeSingle()]); setPromotions(promotionResult.data ?? []); setHolidays(holidayResult.data ?? []); if (settingsResult.data) setSeasonalNav(settingsResult.data.seasonal_nav_enabled); }
  useEffect(() => { load(); }, []);
  async function toggleSeasonalNav() { const next = !seasonalNav; const { error } = await supabase.from('site_settings').update({ seasonal_nav_enabled: next, updated_at: new Date().toISOString() }).eq('setting_key', 'main'); onNotice(error ? 'Could not update the Seasonal Bakery button.' : next ? 'Seasonal Bakery now shows in the main navigation.' : 'Seasonal Bakery hidden from the main navigation.'); if (!error) setSeasonalNav(next); }
  async function savePromotion() { const { error } = await supabase.from('promotions').insert({ ...promo, ends_at: promo.ends_at || null }); onNotice(error ? 'Could not save this announcement.' : 'Announcement saved.'); if (!error) { setPromo({ title: '', message: '', coupon_code: '', starts_at: new Date().toISOString().slice(0, 16), ends_at: '', is_published: false }); await load(); } }
  async function saveHoliday() { const { error } = await supabase.from('holiday_pages').insert(holiday); onNotice(error ? 'Could not save this holiday page.' : 'Holiday page saved.'); if (!error) { setHoliday({ title: '', slug: '', description: '', image_url: '', is_published: false }); await load(); } }
  async function remove(table: 'promotions' | 'holiday_pages', id: string, label: string) { if (!window.confirm(`Remove this ${label}?`)) return; const { error } = await supabase.from(table).delete().eq('id', id); onNotice(error ? `Could not remove this ${label}.` : `${label[0].toUpperCase()}${label.slice(1)} removed.`); if (!error) await load(); }
  return <OpsPanel title="Promotions" intro="Add or remove announcements and holiday pages from one place."><div className="site-toggle-card"><strong>Holiday section</strong><label><input type="checkbox" checked={seasonalNav} onChange={toggleSeasonalNav} /> Show Seasonal Bakery in the main navigation</label></div><div className="split-editors"><div className="editor-card"><div className="section-kicker">Announcement</div><h3>New announcement</h3><label>Title<input value={promo.title} onChange={(event) => setPromo({ ...promo, title: event.target.value })} /></label><label>Message<textarea rows={3} value={promo.message} onChange={(event) => setPromo({ ...promo, message: event.target.value })} /></label><label>Coupon code <span className="muted-label">(optional)</span><input value={promo.coupon_code} onChange={(event) => setPromo({ ...promo, coupon_code: event.target.value })} /></label><label className="consent"><input type="checkbox" checked={promo.is_published} onChange={(event) => setPromo({ ...promo, is_published: event.target.checked })} /> Publish when saved</label><button className="button button-primary" onClick={savePromotion}>Add announcement <Check size={16} /></button></div><div className="editor-card"><div className="section-kicker">Holiday page</div><h3>New holiday page</h3><label>Page title<input value={holiday.title} onChange={(event) => setHoliday({ ...holiday, title: event.target.value })} /></label><label>Short web address<input value={holiday.slug} onChange={(event) => setHoliday({ ...holiday, slug: event.target.value })} placeholder="christmas-bakery" /></label><label>Description<textarea rows={3} value={holiday.description} onChange={(event) => setHoliday({ ...holiday, description: event.target.value })} /></label><label>Photo URL <span className="muted-label">(optional)</span><input value={holiday.image_url} onChange={(event) => setHoliday({ ...holiday, image_url: event.target.value })} /></label><label className="consent"><input type="checkbox" checked={holiday.is_published} onChange={(event) => setHoliday({ ...holiday, is_published: event.target.checked })} /> Publish page now</label><button className="button button-primary" onClick={saveHoliday}>Add holiday page <Check size={16} /></button></div></div><div className="content-list-card"><div className="list-card-heading"><div><div className="section-kicker">Announcements</div><h3>Saved announcements</h3></div><span>{promotions.length} saved</span></div>{promotions.map((item) => <div className="managed-content-row" key={item.id}><div><strong>{item.title}</strong><small>{item.is_published ? 'Published' : 'Hidden'} · {item.message}</small></div><button className="item-action-danger" onClick={() => remove('promotions', item.id ?? '', 'announcement')}><X size={15} /> Remove</button></div>)}{promotions.length === 0 && <Empty title="No announcements" text="Add an announcement above." />}</div><div className="content-list-card"><div className="list-card-heading"><div><div className="section-kicker">Holiday pages</div><h3>Saved holiday pages</h3></div><span>{holidays.length} saved</span></div>{holidays.map((item) => <div className="managed-content-row" key={item.id}><div><strong>{item.title}</strong><small>{item.is_published ? 'Published' : 'Hidden'} · {item.slug}</small></div><button className="item-action-danger" onClick={() => remove('holiday_pages', item.id ?? '', 'holiday page')}><X size={15} /> Remove</button></div>)}{holidays.length === 0 && <Empty title="No holiday pages" text="Add a holiday page above." />}</div></OpsPanel>;
}

function ReviewsPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [googleUrl, setGoogleUrl] = useState(''); const [saved, setSaved] = useState(false);
  useEffect(() => { supabase.from('review_settings').select('google_business_url').eq('setting_key', 'main').maybeSingle().then(({ data }) => { if (data) setGoogleUrl(data.google_business_url || ''); }); }, []);
  async function saveUrl() { const { error } = await supabase.from('review_settings').update({ google_business_url: googleUrl, updated_at: new Date().toISOString() }).eq('setting_key', 'main'); onNotice(error ? 'Could not save the Google Business link.' : 'Google Business link saved.'); setSaved(!error); }
  return <OpsPanel title="Reviews tracker" intro="Link your Google Business account so all reviews go to the right place, and ask happy guests for feedback."><div className="editor-card narrow-form"><div className="section-kicker">Google Business account</div><h3>Link your review profile</h3><label>Google Business profile URL<input value={googleUrl} onChange={(event) => setGoogleUrl(event.target.value)} placeholder="https://www.google.com/maps/place/..." /></label><button className="button button-primary" onClick={saveUrl}>Save Google Business link <Check size={16} /></button>{saved && <p className="form-footnote"><ShieldCheck size={14} /> Reviews from the website will link to this profile.</p>}</div><div className="review-tool"><div className="review-score"><Star size={22} fill="currentColor" /><strong>Google reviews</strong><span>Open your live review page to see new feedback.</span></div><a className="button button-primary" href={googleUrl || 'https://www.google.com/search?q=European%27s+Best+Restaurant+and+Bakery+Strongsville+reviews'} target="_blank" rel="noreferrer">Open Google reviews <ExternalLink size={16} /></a></div><div className="review-request"><MessageSquare size={21} /><div><strong>Simple review request wording</strong><p>"Thank you for visiting European's Best. If you enjoyed your meal, would you share a quick Google review? It helps neighbors find our family business."</p></div></div></OpsPanel>;
}

function StaffPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [staff, setStaff] = useState<(Staff & { can_view_calendar: boolean })[]>([]);
  const [name, setName] = useState(''); const [role, setRole] = useState('staff'); const [pin, setPin] = useState(''); const [page, setPage] = useState(0); const [allCanViewCalendar, setAllCanViewCalendar] = useState(false);
  const perPage = 6;
  useEffect(() => { supabase.from('staff_members').select('id,display_name,role,is_active,can_view_calendar').order('display_name', { ascending: true }).then(({ data }) => { setStaff(data ?? []); setAllCanViewCalendar(data?.every((item: Staff & { can_view_calendar: boolean }) => item.can_view_calendar) ?? false); }); }, []);
  const totalPages = Math.ceil(staff.length / perPage);
  const pageStaff = staff.slice(page * perPage, page * perPage + perPage);
  function movePage(direction: number) { setPage((idx) => Math.max(0, Math.min(totalPages - 1, idx + direction))); }
  async function addStaff() { const { data, error } = await supabase.rpc('create_staff_member', { p_name: name, p_role: role, p_pin: pin }); onNotice(error ? `Could not add that staff member. ${error.message}` : 'Staff member added and active.'); if (!error && data) { const updated = [...staff, { ...data, can_view_calendar: true }].sort((a, b) => a.display_name.localeCompare(b.display_name)); setStaff(updated); } setName(''); setPin(''); }
  async function toggleActive(item: Staff) { const { error } = await supabase.from('staff_members').update({ is_active: !item.is_active }).eq('id', item.id); if (!error) setStaff(staff.map((existing) => existing.id === item.id ? { ...existing, is_active: !existing.is_active } : existing)); }
  async function removeStaff(item: Staff) { if (!window.confirm(`Permanently delete ${item.display_name} and all their time entries, schedules, and time-off requests? This cannot be undone.`)) return; const { error } = await supabase.rpc('owner_delete_staff_member', { p_staff_id: item.id }); onNotice(error ? 'Could not delete that staff member.' : `${item.display_name} deleted and all their data removed.`); if (!error) setStaff(staff.filter((existing) => existing.id !== item.id)); }
  async function toggleAllSchedule() { const next = !allCanViewCalendar; const { error } = await supabase.from('staff_members').update({ can_view_calendar: next }).in('id', staff.map((item) => item.id)); onNotice(error ? 'Could not update schedule access.' : next ? 'All staff can view the schedule.' : 'Schedule view turned off for all staff.'); if (!error) { setStaff(staff.map((item) => ({ ...item, can_view_calendar: next }))); setAllCanViewCalendar(next); } }
  async function toggleSchedule(item: Staff & { can_view_calendar: boolean }) { const next = !item.can_view_calendar; const { error } = await supabase.from('staff_members').update({ can_view_calendar: next }).eq('id', item.id); if (!error) { const updated = staff.map((existing) => existing.id === item.id ? { ...existing, can_view_calendar: next } : existing); setStaff(updated); setAllCanViewCalendar(updated.every((item) => item.can_view_calendar)); } }
  return <OpsPanel title="Staff & permissions" intro="Give each team member a name, private code, role, and schedule access. New members are active immediately."><div className="staff-layout"><div className="editor-card"><div className="section-kicker">Add team member</div><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="staff">Staff</option><option value="manager">Manager</option></select></label><label>Private staff code<input inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} /></label><button className="button button-primary" onClick={addStaff} disabled={!name || pin.length < 4}>Add staff member <PlusIcon /></button><p className="form-footnote"><ShieldCheck size={14} /> Codes are protected and never shown in the staff list. New members start active.</p></div><div className="staff-list">{staff.length > 0 && <div className="schedule-toggle-top"><label className="consent"><input type="checkbox" checked={allCanViewCalendar} onChange={toggleAllSchedule} /> Everyone can view the schedule</label></div>}{staff.length > 0 && totalPages > 1 && <div className="staff-arrow-nav"><button className="category-arrow" onClick={() => movePage(-1)} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={20} /></button><div className="staff-arrow-info"><span className="section-kicker">Page {page + 1} of {totalPages}</span></div><button className="category-arrow" onClick={() => movePage(1)} disabled={page >= totalPages - 1} aria-label="Next page"><ChevronRight size={20} /></button></div>}{staff.length > 0 && <div className="staff-grid-cards">{pageStaff.map((item) => <div className="staff-grid-card" key={item.id}><div className="staff-row"><span className="owner-avatar">{item.display_name[0]}</span><div><strong>{item.display_name}</strong><small>{item.role}</small></div><button className={item.is_active ? 'active-toggle' : 'inactive-toggle'} onClick={() => toggleActive(item)}>{item.is_active ? 'Active' : 'Off'}</button></div><div className="permission-grid"><label><input type="checkbox" checked={item.can_view_calendar} onChange={() => toggleSchedule(item)} /> View everyone's schedule</label><button className="item-action-danger staff-remove-button" onClick={() => removeStaff(item)}><Trash2 size={14} /> Delete</button></div></div>)}</div>}{staff.length === 0 && <Empty title="No staff added yet" text="Add a staff member to start using the staff page." />}</div></div><div className="kiosk-link"><Clock3 size={18} /><span>Staff page preview</span><a href="/" target="_blank" rel="noreferrer">Open the staff sign-in page <ExternalLink size={14} /></a></div></OpsPanel>;
}

function ActivityPanel() { const [logs, setLogs] = useState<Log[]>([]); useEffect(() => { supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => setLogs(data ?? [])); }, []); return <OpsPanel title="Activity log" intro="A simple history of management changes made in the control panel."><div className="activity-list">{logs.map((log) => <div className="activity-row" key={log.id}><span><Check size={15} /></span><div><strong>{log.action}</strong><p>{log.details}</p></div><small>{new Date(log.created_at).toLocaleString()}</small></div>)}{logs.length === 0 && <Empty title="No changes recorded yet" text="Future dashboard changes will appear here." />}</div></OpsPanel>; }

type ScheduleRow = { id: string; staff_id: string; schedule_date: string; start_time: string; end_time: string; notes: string; staff_members?: { display_name: string }[] };

function SchedulePanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('15:00');
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));

  async function load() { const [staffResult, scheduleResult] = await Promise.all([supabase.from('staff_members').select('id,display_name,role,is_active').eq('is_active', true).order('display_name'), supabase.from('staff_schedules').select('*,staff_members(display_name)').order('schedule_date')]); setStaff(staffResult.data ?? []); setSchedules(scheduleResult.data ?? []); }
  useEffect(() => { load(); }, []);

  const filteredStaff = search ? staff.filter((item) => item.display_name.toLowerCase().includes(search.toLowerCase())) : staff;

  function toggleStaff(id: string) { const next = new Set(selectedStaff); if (next.has(id)) next.delete(id); else next.add(id); setSelectedStaff(next); }

  async function save() {
    if (selectedStaff.size === 0) { onNotice('Select at least one person.'); return; }
    if (!startDate) { onNotice('Pick a start date.'); return; }
    const endDateVal = endDate || startDate;
    const ids = Array.from(selectedStaff);
    const { data, error } = await supabase.rpc('owner_save_schedule', { p_staff_ids: ids, p_start_date: startDate, p_end_date: endDateVal, p_start_time: start, p_end_time: end, p_notes: notes });
    onNotice(error ? `Could not save those shifts. ${error.message}` : `Saved ${data ?? 0} shift(s).`);
    if (!error) { setNotes(''); setSelectedStaff(new Set()); await load(); }
  }

  async function remove(id: string) { if (!window.confirm('Remove this shift?')) return; const { error } = await supabase.from('staff_schedules').delete().eq('id', id); onNotice(error ? 'Could not remove that shift.' : 'Shift removed.'); if (!error) await load(); }

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase.rpc('owner_update_schedule', { p_schedule_id: editing.id, p_start_time: editing.start_time, p_end_time: editing.end_time, p_notes: editing.notes });
    onNotice(error ? `Could not update that shift. ${error.message}` : 'Shift updated.');
    if (!error) { setEditing(null); await load(); }
  }

  const groupedByDate: Record<string, ScheduleRow[]> = {};
  for (const item of schedules) { (groupedByDate[item.schedule_date] ??= []).push(item); }
  const sortedDates = Object.keys(groupedByDate).sort();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      return { date: isoDate(d), label: d.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: d.getDate(), monthLabel: d.toLocaleDateString('en-US', { month: 'short' }) };
    });
  }, [weekStart]);
  const weekDateSet = new Set(weekDays.map((d) => d.date));
  const weekSchedules = schedules.filter((s) => weekDateSet.has(s.schedule_date));
  function moveWeek(direction: number) { setWeekStart(new Date(weekStart.getTime() + direction * 7 * 86400000)); }
  function formatTime12(time: string) { const [h, m] = time.split(':').map(Number); const suffix = h >= 12 ? 'pm' : 'am'; const dh = h % 12 || 12; return `${dh}:${String(m).padStart(2, '0')}${suffix}`; }

  return <OpsPanel title="Schedule maker" intro="Search for people, pick one or many, choose a date range, and save all shifts at once."><div className="split-editors"><div className="editor-card"><div className="section-kicker">Add shifts</div><label>Search staff<input className="schedule-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type a name…" /><Search size={15} className="schedule-search-icon" /></label><div className="schedule-staff-list">{filteredStaff.map((item) => <label key={item.id} className={`schedule-staff-chip ${selectedStaff.has(item.id) ? 'selected' : ''}`}><input type="checkbox" checked={selectedStaff.has(item.id)} onChange={() => toggleStaff(item.id)} />{item.display_name}</label>)}{filteredStaff.length === 0 && <p className="muted-copy">No matching staff.</p>}</div><div className="form-two"><label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>End date <span className="muted-label">(same day if blank)</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><div className="form-two"><label>Starts<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Ends<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div><label>Notes <span className="muted-label">(optional)</span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Front counter, prep, Friday dinner" /></label><button className="button button-primary" onClick={save} disabled={selectedStaff.size === 0 || !startDate}>Save {selectedStaff.size > 0 ? `${selectedStaff.size} person${selectedStaff.size > 1 ? 's' : ''}` : ''} shift(s) <Check size={16} /></button></div><div className="staff-list schedule-shift-list">{sortedDates.map((date) => <div key={date} className="schedule-date-group"><div className="schedule-date-header">{date}</div>{groupedByDate[date].map((item) => <div className="schedule-row" key={item.id}><div><strong>{item.staff_members?.[0]?.display_name ?? 'Staff member'}</strong><span>{item.start_time}–{item.end_time}</span><small>{item.notes}</small></div><div className="schedule-row-actions"><button className="schedule-edit-btn" onClick={() => setEditing(item)} aria-label="Edit shift"><Pencil size={15} /></button><button className="item-action-danger" onClick={() => remove(item.id)}><X size={15} /></button></div></div>)}{schedules.length === 0 && <Empty title="No shifts scheduled" text="Add shifts on the left." />}</div>)}</div></div>{editing! && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setEditing(null)}><X /></button><div className="section-kicker">Edit shift</div><h2>{editing!.staff_members?.[0]?.display_name ?? 'Staff'}</h2><label>Date<input type="date" value={editing!.schedule_date} disabled /></label><div className="form-two"><label>Starts<input type="time" value={editing!.start_time} onChange={(event) => setEditing({ ...editing!, start_time: event.target.value })} /></label><label>Ends<input type="time" value={editing!.end_time} onChange={(event) => setEditing({ ...editing!, end_time: event.target.value })} /></label></div><label>Notes<input value={editing!.notes} onChange={(event) => setEditing({ ...editing!, notes: event.target.value })} /></label><button className="button button-primary full-button" onClick={saveEdit}>Save changes <Check size={17} /></button></div></div>}<div className="content-list-card schedule-calendar-card"><div className="list-card-heading"><div><div className="section-kicker">Week view</div><h3>Scheduled shifts for {weekRangeMon(weekStart)}</h3></div><div className="week-selector"><button className="category-arrow" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={20} /></button><button className="category-arrow" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={20} /></button></div></div><div className="schedule-calendar-grid">{weekDays.map((day) => { const dayShifts = weekSchedules.filter((s) => s.schedule_date === day.date).sort((a, b) => a.start_time.localeCompare(b.start_time)); return <div className="schedule-cal-day" key={day.date}><div className="schedule-cal-day-header"><span className="schedule-cal-day-name">{day.label}</span><span className="schedule-cal-day-num">{day.dayNum}</span></div>{dayShifts.length > 0 ? dayShifts.map((shift) => <div className="schedule-cal-shift" key={shift.id}><strong>{shift.staff_members?.[0]?.display_name ?? 'Staff'}</strong><span>{formatTime12(shift.start_time)}–{formatTime12(shift.end_time)}</span>{shift.notes && <small>{shift.notes}</small>}</div>) : <div className="schedule-cal-empty">No shifts</div>}</div>; })}</div></div></OpsPanel>;
}

function AccountPanel({ onNotice, onOwnerNameChange }: { onNotice: (message: string) => void; onOwnerNameChange?: (name: string) => void }) {
  const [email, setEmail] = useState(''); const [displayName, setDisplayName] = useState('The Family'); const [password, setPassword] = useState('');
  useEffect(() => { supabase.auth.getUser().then(async ({ data }) => { setEmail(data.user?.email ?? ''); if (data.user) { const { data: account } = await supabase.from('owner_accounts').select('display_name').eq('user_id', data.user.id).maybeSingle(); if (account?.display_name) setDisplayName(account.display_name); } }); }, []);
  async function saveAccount() { if (password && password.length < 10) { onNotice('Use at least 10 characters for a new password.'); return; } const updates: { email?: string; password?: string } = {}; if (email) updates.email = email; if (password) updates.password = password; const authResult = await supabase.auth.updateUser(updates); const { error: nameError } = await supabase.from('owner_accounts').update({ display_name: displayName }).eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? ''); onNotice(authResult.error || nameError ? 'Could not update the owner account.' : 'Owner account updated.'); setPassword(''); if (!authResult.error && !nameError && onOwnerNameChange) onOwnerNameChange(displayName); }
  return <OpsPanel title="The Family account" intro="Change the owner name, email address, or password used for the control panel."><div className="editor-card narrow-form"><div className="section-kicker">The Family login</div><label>Owner name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label>Owner email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current password" /></label><button className="button button-primary" onClick={saveAccount}>Save account details <Check size={16} /></button><p className="form-footnote"><ShieldCheck size={14} /> You may need to confirm a new email from your inbox.</p></div></OpsPanel>;
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function formatTime12(time: string) { const [h, m] = time.split(':').map(Number); const suffix = h >= 12 ? 'pm' : 'am'; const dh = h % 12 || 12; return `${dh}:${String(m).padStart(2, '0')}${suffix}`; }

function getMondayWeekStart(date: Date) { const d = new Date(date); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0); return d; }
function weekRangeMon(start: Date) { const end = new Date(start); end.setDate(end.getDate() + 6); return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; }

function StaffTimePanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [grid, setGrid] = useState<GridStaff[]>([]);
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState<TimeEdit | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));

  async function load() {
    const { data, error } = await supabase.rpc('owner_week_clock_grid', { p_week_start: isoDate(weekStart) });
    if (error) { onNotice('Could not load the time grid.'); return; }
    setGrid((data ?? []) as GridStaff[]);
  }
  useEffect(() => { load(); }, [weekStart]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);

  async function clockAction(staffId: string, action: string) {
    const { error } = await supabase.rpc('owner_clock_action', { p_staff_id: staffId, p_action: action, p_note: '' });
    onNotice(error ? `Could not ${action.replace('_', ' ')} that staff member.` : 'Time action saved.');
    if (!error) await load();
  }

  async function handleSave(eventId: string, eventType: string, rawTime: string, notes: string) {
    const error = await saveTimeEntryOwner(eventId, eventType, rawTime, notes);
    onNotice(error ? 'Could not save that time entry.' : 'Time entry updated.');
    setEditing(null);
    if (!error) await load();
  }

  async function exportToSheets() {
    setExporting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/export-daily-shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ date: exportDate }),
      });
      const result = await response.json();
      if (result.error && result.error.includes('not configured')) {
        onNotice('Google Sheets export needs setup. Add a Google service account key and spreadsheet ID in the project secrets.');
      } else if (result.error) {
        onNotice('Could not export to Google Sheets. ' + result.error);
      } else if (result.success) {
        onNotice(`Exported ${result.shiftsExported} shift(s) for ${exportDate} to Google Sheets.`);
      } else {
        onNotice('Could not export to Google Sheets.');
      }
    } catch {
      onNotice('Could not reach the export service.');
    }
    setExporting(false);
  }

  function moveWeek(direction: number) { setWeekStart(new Date(weekStart.getTime() + direction * 7 * 86400000)); setSelectedWeekIndex(null); }
  function selectMonth(monthIndex: number) {
    const baseDate = new Date(); baseDate.setDate(1); baseDate.setMonth(baseDate.getMonth() + monthIndex);
    setWeekStart(getMondayWeekStart(baseDate)); setMonthOffset(monthIndex); setSelectedWeekIndex(null);
  }
  function selectWeekInMonth(weekIndex: number) {
    const baseDate = new Date(); baseDate.setDate(1); baseDate.setMonth(baseDate.getMonth() + monthOffset);
    const firstWeekStart = getMondayWeekStart(baseDate);
    setWeekStart(new Date(firstWeekStart.getTime() + weekIndex * 7 * 86400000));
    setSelectedWeekIndex(weekIndex);
  }
  const monthOptions = Array.from({ length: 12 }, (_, i) => i - 3);
  const weeksInMonth = Array.from({ length: 5 }, (_, i) => i);

  function statusLabel(staff: GridStaff) {
    const s = staff.current_status;
    if (s === 'break_start') return 'On break';
    if (s === 'clock_in' || s === 'break_end') return `Clocked in${staff.active_since ? ` for ${elapsedSince(staff.active_since, now)}` : ''}`;
    return 'Clocked out';
  }

  return <OpsPanel title="Staff time & notes" intro="See everyone's hours for the week in one grid. Use the controls on the left to clock someone in, out, or on break. Click the pencil icon to manually adjust any time."><div className="week-nav-bar"><div className="week-selector"><button className="category-arrow" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={20} /></button><div><span className="section-kicker">Week of</span><h3>{weekRangeMon(weekStart)}</h3></div><button className="category-arrow" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={20} /></button></div><div className="week-selector"><select value={monthOffset} onChange={(event) => selectMonth(Number(event.target.value))}>{monthOptions.map((m) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + m); return <option key={m} value={m}>{d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>; })}</select><select onChange={(event) => selectWeekInMonth(Number(event.target.value))} value={selectedWeekIndex ?? ''}><option value="" disabled>Week…</option>{weeksInMonth.map((w) => <option key={w} value={w}>Week {w + 1}</option>)}</select></div></div><div className="time-grid-wrapper"><div className="time-grid-scroll"><table className="time-grid-table"><thead><tr><th className="time-grid-name-col">Staff member</th>{gridDayNames.map((day) => <th key={day}>{day.slice(0, 3)}</th>)}</tr></thead><tbody>{grid.map((staff) => <tr key={staff.staff_id}><td className="time-grid-name-col"><div className="time-grid-staff-cell"><span className={`time-grid-status-dot ${staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? '' : 'closed'}`} /><div><strong>{staff.display_name}</strong><small>{statusLabel(staff)}</small></div><div className="time-grid-actions"><button className="time-grid-mini-btn" onClick={() => clockAction(staff.staff_id, staff.current_status === 'break_start' ? 'break_end' : staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? 'clock_out' : 'clock_in')} title={staff.current_status === 'break_start' ? 'End break' : staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? 'Clock out' : 'Clock in'}>{staff.current_status === 'break_start' ? 'End brk' : staff.current_status === 'clock_in' || staff.current_status === 'break_end' ? 'Out' : 'In'}</button>{(staff.current_status === 'clock_in' || staff.current_status === 'break_end') && <button className="time-grid-mini-btn" onClick={() => clockAction(staff.staff_id, 'break_start')} title="Start break">Brk</button>}</div></div></td>{staff.days.map((day) => <td key={day.date} className={day.is_currently_in ? 'time-grid-cell active' : 'time-grid-cell'}><div className="time-grid-times">{day.clock_in ? <><span className="tg-in">In: {day.clock_in}{day.clock_in_event_id && <button className="tg-edit-btn" onClick={() => setEditing({ eventId: day.clock_in_event_id!, staffName: staff.display_name, eventType: 'clock_in', rawTime: day.clock_in_raw ?? '', notes: day.notes ?? '' })} title="Edit clock in"><Pencil size={11} /></button>}</span>{day.clock_out ? <span className="tg-out">Out: {day.clock_out}{day.clock_out_event_id && <button className="tg-edit-btn" onClick={() => setEditing({ eventId: day.clock_out_event_id!, staffName: staff.display_name, eventType: 'clock_out', rawTime: day.clock_out_raw ?? '', notes: day.notes ?? '' })} title="Edit clock out"><Pencil size={11} /></button>}</span> : day.is_currently_in ? <span className="tg-current">Out: current</span> : <span className="tg-missing">Out: —</span>}</> : <span className="tg-none">—</span>}{day.break_start && <span className="tg-break">Break: {day.break_start}–{day.break_end ?? 'current'}</span>}</div>{day.notes && <div className="time-grid-notes">{day.notes}</div>}</td>)}</tr>)}</tbody></table></div>{grid.length === 0 && <Empty title="No active staff" text="Add staff members to see the time grid." />}</div><div className="content-list-card"><div className="list-card-heading"><div><div className="section-kicker">Daily export</div><h3>Send shifts to Google Sheets</h3></div></div><p className="muted-copy" style={{ marginBottom: '14px' }}>Pick a date and export everyone's clock-in, clock-out, breaks, and total hours to a Google Spreadsheet. This can also run automatically at the end of each day once configured.</p><div className="form-two" style={{ maxWidth: '500px', marginBottom: '14px' }}><label>Date<input type="date" value={exportDate} onChange={(event) => setExportDate(event.target.value)} /></label></div><button className="button button-primary" onClick={exportToSheets} disabled={exporting}>{exporting ? 'Exporting…' : 'Export to Google Sheets'} <ExternalLink size={16} /></button></div>{editing && <TimeEditModal edit={editing} onClose={() => setEditing(null)} onSave={handleSave} />}</OpsPanel>;
}

function OpsPanel({ title, intro, children }: { title: string; intro: string; children: ReactNode }) { return <div className="ops-content"><div className="editor-heading"><div><h2>{title}</h2><p>{intro}</p></div></div>{children}</div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state"><FileText size={22} /><h3>{title}</h3><p>{text}</p></div>; }
function PlusIcon() { return <span aria-hidden="true">+</span>; }

type TimeOffRequest = { id: string; staff_id: string; start_date: string; end_date: string; reason: string; status: string; created_at: string; staff_members?: { display_name: string }[] };

function TimeOffPanel({ onNotice, onPendingTimeOffChange }: { onNotice: (message: string) => void; onPendingTimeOffChange?: (count: number) => void }) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [weekStart, setWeekStart] = useState(getMondayWeekStart(new Date()));
  async function load() { const { data } = await supabase.from('time_off_requests').select('*,staff_members(display_name)').order('created_at', { ascending: false }); setRequests(data ?? []); if (onPendingTimeOffChange) onPendingTimeOffChange(data?.filter((item) => item.status === 'pending').length ?? 0); }
  useEffect(() => { load(); }, []);
  async function updateStatus(id: string, status: string) { const { error } = await supabase.from('time_off_requests').update({ status }).eq('id', id); onNotice(error ? 'Could not update that request.' : `Request ${status}.`); if (!error) await load(); }
  async function deleteRequest(id: string) { if (!window.confirm('Remove this time-off request?')) return; const { error } = await supabase.from('time_off_requests').delete().eq('id', id); onNotice(error ? 'Could not remove that request.' : 'Request removed.'); if (!error) await load(); }
  function moveWeek(direction: number) { setWeekStart(new Date(weekStart.getTime() + direction * 7 * 86400000)); }
  const weekStartIso = isoDate(weekStart);
  const weekEndIso = isoDate(new Date(weekStart.getTime() + 6 * 86400000));
  const weekRequests = requests.filter((item) => !(item.end_date < weekStartIso || item.start_date > weekEndIso));
  const pendingRequests = requests.filter((item) => item.status === 'pending');
  return <OpsPanel title="Time off requests" intro="See who requested time off, week by week. Approve or deny pending requests."><div className="week-nav-bar"><div className="week-selector"><button className="category-arrow" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={20} /></button><div><span className="section-kicker">Week of</span><h3>{weekRangeMon(weekStart)}</h3></div><button className="category-arrow" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={20} /></button></div></div>{pendingRequests.length > 0 && <div className="content-list-card"><div className="list-card-heading"><div><div className="section-kicker">Pending</div><h3>{pendingRequests.length} pending {pendingRequests.length === 1 ? 'request' : 'requests'}</h3></div></div>{pendingRequests.map((item) => <div className="time-off-card" key={item.id}><div className="time-off-info"><strong>{item.staff_members?.[0]?.display_name ?? 'Staff member'}</strong><span>{item.start_date} to {item.end_date}{item.reason ? ` · ${item.reason}` : ''}</span></div><div className="check-all-buttons"><button className="button button-outline button-sm" onClick={() => updateStatus(item.id, 'approved')}>Approve</button><button className="button button-outline button-sm" onClick={() => updateStatus(item.id, 'denied')}>Deny</button></div></div>)}</div>}<div className="content-list-card"><div className="list-card-heading"><div><div className="section-kicker">This week</div><h3>Time off for {weekRangeMon(weekStart)}</h3></div></div>{weekRequests.map((item) => <div className="time-off-card" key={item.id}><div className="time-off-info"><strong>{item.staff_members?.[0]?.display_name ?? 'Staff member'}</strong><span>{item.start_date} to {item.end_date}{item.reason ? ` · ${item.reason}` : ''}</span></div><div className="check-all-buttons"><span className={`time-off-status ${item.status}`}>{item.status}</span><button className="inbox-delete" onClick={() => deleteRequest(item.id)}><Trash2 size={14} /></button></div></div>)}{weekRequests.length === 0 && <Empty title="No time off this week" text="Time off requests for this week will appear here." />}</div></OpsPanel>;
}

type OrderItem = { menu_item_id: string; item_name: string; item_price: string; quantity: number };
type Order = { id: string; customer_name: string; customer_phone: string; customer_email: string; order_type: string; payment_method: string; total_price: number; pickup_date: string | null; notes: string; status: string; created_at: string; order_items?: OrderItemRow[] };
type OrderItemRow = { id: string; item_name: string; item_price: string; quantity: number };

function OrdersPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  async function load() {
    const { data, error } = await supabase.from('orders').select('*, order_items(id, item_name, item_price, quantity)').order('created_at', { ascending: false });
    if (error) { onNotice('Could not load orders.'); return; }
    setOrders(data as unknown as Order[]);
  }
  useEffect(() => { load(); }, []);
  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    onNotice(error ? 'Could not update that order.' : `Order marked ${status}.`);
    if (!error) await load();
  }
  async function deleteOrder(id: string) {
    if (!window.confirm('Delete this order permanently?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    onNotice(error ? 'Could not delete that order.' : 'Order deleted.');
    if (!error) await load();
  }
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const newCount = orders.filter((o) => o.status === 'new').length;
  return <OpsPanel title="Online orders" intro="See orders placed through the website. Update the status as you prepare and hand off each order.">
    <div className="order-filter-bar">
      <button className={filter === 'all' ? 'order-filter-btn active' : 'order-filter-btn'} onClick={() => setFilter('all')}>All ({orders.length})</button>
      <button className={filter === 'new' ? 'order-filter-btn active' : 'order-filter-btn'} onClick={() => setFilter('new')}>New ({newCount})</button>
      <button className={filter === 'preparing' ? 'order-filter-btn active' : 'order-filter-btn'} onClick={() => setFilter('preparing')}>Preparing</button>
      <button className={filter === 'ready' ? 'order-filter-btn active' : 'order-filter-btn'} onClick={() => setFilter('ready')}>Ready</button>
      <button className={filter === 'picked_up' ? 'order-filter-btn active' : 'order-filter-btn'} onClick={() => setFilter('picked_up')}>Picked up</button>
    </div>
    {filtered.length === 0 && <Empty title="No orders yet" text="Online orders will appear here once customers start ordering." />}
    {filtered.map((order) => <div className="order-card" key={order.id}>
      <div className="order-card-header">
        <div><strong>{order.customer_name}</strong><span className={`order-status-badge ${order.status}`}>{order.status}</span></div>
        <small>{new Date(order.created_at).toLocaleString()}</small>
      </div>
      <div className="order-card-items">
        {order.order_items?.map((item) => <div className="order-item-row" key={item.id}><span>{item.quantity}x {item.item_name}</span><strong>{item.item_price}</strong></div>)}
      </div>
      <div className="order-card-footer">
        <div className="order-meta">
          <span>Total: <strong>${Number(order.total_price).toFixed(2)}</strong></span>
          <span>Payment: <strong>{order.payment_method === 'check' ? 'Check' : 'Cash'}</strong></span>
          <span>Type: {order.order_type === 'bakery' ? 'Bakery' : 'Menu'}</span>
          {order.pickup_date && <span>Pickup: {order.pickup_date}</span>}
          <span>Phone: {order.customer_phone}</span>
          {order.customer_email && <span>Email: {order.customer_email}</span>}
          {order.notes && <span>Notes: {order.notes}</span>}
        </div>
        <div className="order-actions">
          <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>
            <option value="new">New</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="picked_up">Picked up</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="inbox-delete" onClick={() => deleteOrder(order.id)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>
    </div>)}
  </OpsPanel>;
}

type MenuOption = { id: string; name: string; price: string; category: string };

export function OrderPage({ menuItems, onBack }: { menuItems: MenuOption[]; onBack: () => void }) {
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [payment, setPayment] = useState<'cash' | 'check'>('cash');
  const [pickupDate, setPickupDate] = useState('');
  const [notes, setNotes] = useState('');
  const [orderType, setOrderType] = useState<'menu' | 'bakery'>('menu');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const categories = [...new Set(menuItems.map((item) => item.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? '');
  const categoryItems = menuItems.filter((item) => item.category === activeCategory);

  function addToCart(id: string) { setCart(new Map(cart).set(id, (cart.get(id) ?? 0) + 1)); }
  function removeFromCart(id: string) { const next = new Map(cart); const qty = next.get(id) ?? 0; if (qty <= 1) next.delete(id); else next.set(id, qty - 1); setCart(next); }
  function clearCart() { setCart(new Map()); }

  const cartItems: OrderItem[] = [];
  let total = 0;
  for (const [id, qty] of cart) {
    const item = menuItems.find((m) => m.id === id);
    if (!item) continue;
    const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    if (!isNaN(priceNum)) total += priceNum * qty;
    cartItems.push({ menu_item_id: id, item_name: item.name, item_price: item.price, quantity: qty });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (cartItems.length === 0) { setStatus('Please add at least one item to your order.'); return; }
    if (name.trim().length < 2) { setStatus('Please enter your name.'); return; }
    if (phone.replace(/[^0-9]/g, '').length < 7) { setStatus('Please enter a valid phone number.'); return; }
    setBusy(true); setStatus('');
    const { data, error } = await supabase.rpc('submit_order', {
      p_customer_name: name.trim(), p_customer_phone: phone.trim(), p_customer_email: email.trim(),
      p_order_type: orderType, p_payment_method: payment, p_total_price: total,
      p_pickup_date: pickupDate || null, p_notes: notes.trim(),
      p_items: JSON.stringify(cartItems.map((item) => ({ menu_item_id: item.menu_item_id, item_name: item.item_name, item_price: item.item_price, quantity: item.quantity })))
    });
    if (error) { setStatus(`Could not place your order. ${error.message}`); setBusy(false); return; }
    // Try to notify the owner via edge function
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/notify-owner-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ order_id: data }),
      });
    } catch { /* SMS notification is best-effort */ }
    setStatus('Your order has been placed! We will see it right away. Pay with ' + (payment === 'check' ? 'check' : 'cash') + ' at pickup.');
    clearCart(); setName(''); setPhone(''); setEmail(''); setPickupDate(''); setNotes('');
    setBusy(false);
  }

  return <section className="page-section container">
    <div className="page-heading"><div className="section-kicker">Order ahead</div><h1>Place your order.</h1><p>Pick your items, choose cash or check, and we'll have it ready for pickup.</p></div>
    <div className="order-layout">
      <div className="order-menu-side">
        <div className="order-type-toggle">
          <button className={orderType === 'menu' ? 'selected' : ''} onClick={() => setOrderType('menu')}>Menu items</button>
          <button className={orderType === 'bakery' ? 'selected' : ''} onClick={() => setOrderType('bakery')}>Bakery</button>
        </div>
        <div className="order-category-tabs">
          {categories.map((cat) => <button key={cat} className={activeCategory === cat ? 'selected' : ''} onClick={() => setActiveCategory(cat)}>{cat}</button>)}
        </div>
        <div className="order-item-list">
          {categoryItems.map((item) => <div className="order-menu-item" key={item.id}>
            <div><h3>{item.name}</h3><strong>{item.price}</strong></div>
            <div className="order-item-controls">
              {cart.has(item.id) && <button className="order-qty-btn" onClick={() => removeFromCart(item.id)}>−</button>}
              {cart.has(item.id) && <span className="order-qty">{cart.get(item.id)}</span>}
              <button className="order-add-btn" onClick={() => addToCart(item.id)}>Add</button>
            </div>
          </div>)}
          {categoryItems.length === 0 && <p className="muted-copy">No items in this category.</p>}
        </div>
      </div>
      <div className="order-cart-side">
        <div className="order-cart-card">
          <div className="section-kicker">Your order</div>
          <h3>Cart ({cartItems.length})</h3>
          {cartItems.length === 0 && <p className="muted-copy">Add items from the left to start your order.</p>}
          {cartItems.map((item) => <div className="order-cart-row" key={item.menu_item_id}>
            <span>{item.quantity}x {item.item_name}</span>
            <strong>{item.item_price}</strong>
          </div>)}
          {cartItems.length > 0 && <div className="order-total-row"><span>Total</span><strong>${total.toFixed(2)}</strong></div>}
          {cartItems.length > 0 && <button className="text-link" onClick={clearCart}>Clear cart</button>}
        </div>
        <form className="order-form-card" onSubmit={submit}>
          <h3>Your details</h3>
          <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>
          <label>Phone<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="440-555-0123" /></label>
          <label>Email <span className="muted-label">(optional)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Pickup date <span className="muted-label">(optional)</span><input type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} /></label>
          <label>Notes <span className="muted-label">(optional)</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Special requests, allergies, etc." /></label>
          <div className="order-payment-section">
            <strong>Payment method</strong>
            <div className="payment-options">
              <label className={`payment-option ${payment === 'cash' ? 'selected' : ''}`}><input type="radio" name="payment" value="cash" checked={payment === 'cash'} onChange={() => setPayment('cash')} /> Cash</label>
              <label className={`payment-option ${payment === 'check' ? 'selected' : ''}`}><input type="radio" name="payment" value="check" checked={payment === 'check'} onChange={() => setPayment('check')} /> Check</label>
            </div>
          </div>
          {status && <div className={status.startsWith('Your order') ? 'form-success' : 'form-error'}>{status}</div>}
          <button className="button button-primary full-button" disabled={busy || cartItems.length === 0}>{busy ? 'Placing order…' : `Place order · ${total.toFixed(2)}`} <Check size={17} /></button>
          <p className="form-footnote">Pay at pickup. Cash or check only.</p>
        </form>
        <button className="text-link form-back" onClick={onBack}>Back to website <ArrowRight size={16} /></button>
      </div>
    </div>
  </section>;
}
