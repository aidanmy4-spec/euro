import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CalendarDays as CalendarIcon,
  Coffee,
  Facebook,
  FileText as FileIcon,
  Flame,
  Heart,
  LogIn,
  LogOut,
  Mail as MailIcon,
  MapPin,
  Menu as MenuIcon,
  Minus,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Users as UsersIcon,
  Utensils,
  X,
} from 'lucide-react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { CateringPage, ClubPage, OperationsContent, OrderPage, SeasonalPage, StaffKioskPage, type OpsTab, type SiteSettings } from '@/operations';
const TEMP_EMAIL = 'owner@europeansbest.com';
const TEMP_PASSWORD = 'WelcomeEB!2026';
const logoPath = '/images/Screenshot_2026-10-01_022550.png';
const familyPhoto = 'https://www.europeansbest.com/wp-content/uploads/DSC_0373.jpg';
const weddingCakePhoto = 'https://www.europeansbest.com/wp-content/uploads/wedding_cake.jpg';
const birthdayCakePhoto = 'https://www.europeansbest.com/wp-content/uploads/birthday_cake.jpg';

type Page = 'home' | 'menu' | 'bakery' | 'about' | 'contact' | 'login' | 'dashboard' | 'catering' | 'seasonal' | 'club' | 'clock' | 'order';
type DashboardTab = 'specials' | 'menu' | 'hours' | OpsTab;
type MenuItem = { id: string; category: string; name: string; description: string; price: string; is_visible: boolean; sort_order: number };
type Special = { id: string; title: string; description: string; special_date: string; is_published: boolean };
type Hour = { id: string; day_key: string; day_label: string; open_time: string | null; close_time: string | null; is_closed: boolean };

const fallbackMenu: MenuItem[] = [
  { id: '1', category: 'Breakfast', name: 'European Breakfast Plate', description: 'Two eggs, breakfast potatoes, toast, and your choice of bacon or sausage.', price: '$12.95', is_visible: true, sort_order: 1 },
  { id: '2', category: 'Breakfast', name: 'House-Made French Toast', description: 'Thick-cut bread, cinnamon, powdered sugar, and warm fruit.', price: '$10.95', is_visible: true, sort_order: 2 },
  { id: '3', category: 'Lunch', name: 'Chicken Paprikash', description: 'Tender chicken in a rich paprika sauce, served with dumplings.', price: '$15.95', is_visible: true, sort_order: 3 },
  { id: '4', category: 'Lunch', name: 'Reuben on Rye', description: 'House-style corned beef, sauerkraut, Swiss, and dressing.', price: '$14.95', is_visible: true, sort_order: 4 },
  { id: '5', category: 'Bakery', name: 'Fresh-Baked Pastries', description: "Ask about today's danishes, kolaches, cookies, and seasonal treats.", price: 'Market', is_visible: true, sort_order: 5 },
];

const fallbackSpecial: Special = { id: 'fallback', title: 'Breakfast served all day', description: 'Join us for a warm, made-to-order breakfast every day of the week.', special_date: new Date().toISOString().slice(0, 10), is_published: true };
const fallbackHours: Hour[] = [
  { id: 'm', day_key: 'monday', day_label: 'Monday', open_time: '07:00', close_time: '15:00', is_closed: false },
  { id: 't', day_key: 'tuesday', day_label: 'Tuesday', open_time: '07:00', close_time: '15:00', is_closed: false },
  { id: 'w', day_key: 'wednesday', day_label: 'Wednesday', open_time: '07:00', close_time: '15:00', is_closed: false },
  { id: 'th', day_key: 'thursday', day_label: 'Thursday', open_time: '07:00', close_time: '15:00', is_closed: false },
  { id: 'f', day_key: 'friday', day_label: 'Friday', open_time: '07:00', close_time: '19:00', is_closed: false },
  { id: 'sa', day_key: 'saturday', day_label: 'Saturday', open_time: '07:00', close_time: '15:00', is_closed: false },
  { id: 'su', day_key: 'sunday', day_label: 'Sunday', open_time: '07:00', close_time: '15:00', is_closed: false },
];

function formatTime(value: string | null) {
  if (!value) return 'Closed';
  const [hour, minute] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')}${suffix}`;
}

function App() {
  const [page, setPage] = useState<Page>('home');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('specials');
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(fallbackMenu);
  const [specials, setSpecials] = useState<Special[]>([fallbackSpecial]);
  const [hours, setHours] = useState<Hour[]>(fallbackHours);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ join_family_enabled: true, seasonal_nav_enabled: true, online_ordering_enabled: false });
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState('The Family');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingTimeOffCount, setPendingTimeOffCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setUser(data.session?.user ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    Promise.all([
      supabase.from('menu_items').select('*').eq('is_visible', true).order('sort_order'),
      supabase.from('daily_specials').select('*').eq('is_published', true).order('special_date', { ascending: false }),
      supabase.from('site_hours').select('*').order('id'),
      supabase.from('site_settings').select('join_family_enabled,seasonal_nav_enabled,online_ordering_enabled').eq('setting_key', 'main').maybeSingle(),
    ]).then(([menuResult, specialResult, hourResult, settingsResult]) => {
      if (mounted) {
        if (menuResult.data?.length) setMenuItems(menuResult.data);
        if (specialResult.data?.length) setSpecials(specialResult.data);
        if (hourResult.data?.length) setHours(hourResult.data);
        if (settingsResult.data) setSiteSettings(settingsResult.data);
        setLoading(false);
      }
    });
    supabase.from('owner_accounts').select('display_name').maybeSingle().then(({ data }) => { if (mounted && data?.display_name) setOwnerName(data.display_name); });
    const unreadTimer = window.setInterval(() => {
      supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new').then(({ count }) => { if (mounted) setUnreadCount(count ?? 0); });
      supabase.from('time_off_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => { if (mounted) setPendingTimeOffCount(count ?? 0); });
    }, 15000);
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new').then(({ count }) => { if (mounted) setUnreadCount(count ?? 0); });
    supabase.from('time_off_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => { if (mounted) setPendingTimeOffCount(count ?? 0); });
    return () => { mounted = false; listener.subscription.unsubscribe(); window.clearInterval(unreadTimer); };
  }, []);

  const activeSpecial = specials[0] ?? fallbackSpecial;
  const todayHours = useMemo(() => {
    const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    return hours.find((item) => item.day_key === day) ?? fallbackHours[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  }, [hours]);
  const isOpen = (() => {
    if (!todayHours || todayHours.is_closed || !todayHours.open_time || !todayHours.close_time) return false;
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const open = Number(todayHours.open_time.slice(0, 2)) * 60 + Number(todayHours.open_time.slice(3, 5));
    const close = Number(todayHours.close_time.slice(0, 2)) * 60 + Number(todayHours.close_time.slice(3, 5));
    return current >= open && current < close;
  })();

  function navigate(nextPage: Page) { setPage(nextPage); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function signOut() { await supabase.auth.signOut(); navigate('home'); }

  if (page === 'login') return <LoginPage onBack={() => navigate('home')} onStaffLogin={() => navigate('clock')} onSuccess={() => navigate('dashboard')} />;
  if (page === 'dashboard') return <Dashboard user={user} tab={dashboardTab} setTab={setDashboardTab} menuItems={menuItems} setMenuItems={setMenuItems} specials={specials} setSpecials={setSpecials} hours={hours} setHours={setHours} onSignOut={signOut} onNavigate={navigate} onSiteSettingsChange={setSiteSettings} ownerName={ownerName} onOwnerNameChange={setOwnerName} unreadCount={unreadCount} onUnreadChange={setUnreadCount} pendingTimeOffCount={pendingTimeOffCount} onPendingTimeOffChange={setPendingTimeOffCount} />;
  if (page === 'catering') return <CateringPage onBack={() => navigate('contact')} />;
  if (page === 'seasonal') return <SeasonalPage onBack={() => navigate('bakery')} />;
  if (page === 'club') return <ClubPage onBack={() => navigate('home')} />;
  if (page === 'clock') return <StaffKioskPage onBack={() => navigate('home')} />;
  if (page === 'order') return <OrderPage menuItems={menuItems} onBack={() => navigate('menu')} />;

  return (
    <div className="site-shell">
      <div className="announcement"><Bell size={15} /> Friday dinner is back until 7pm. Come hungry, leave happy.</div>
      <header className="site-header">
        <div className="container header-inner">
          <button className="brand" onClick={() => navigate('home')} aria-label="European's Best home">
            <img src={logoPath} alt="European's Best chef logo" />
            <span><strong>European’s Best</strong><small>Restaurant & Bakery</small></span>
          </button>
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <MenuIcon />}</button>
          <nav className={menuOpen ? 'main-nav open' : 'main-nav'}>
            {(['home', 'menu', 'bakery', 'about', 'contact'] as Page[]).map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => navigate(item)}>{item === 'home' ? 'Home' : item === 'contact' ? 'Visit Us' : item[0].toUpperCase() + item.slice(1)}</button>)}
            {siteSettings.online_ordering_enabled && <button className="nav-owner" onClick={() => navigate('order')}><Utensils size={16} /> Order online</button>}{siteSettings.join_family_enabled && <button className="nav-owner" onClick={() => navigate('club')}><Sparkles size={16} /> Join the family</button>}<button className="nav-owner-icon" onClick={() => navigate('login')} aria-label="Owner login"><ShieldCheck size={18} /></button>
          </nav>
        </div>
      </header>
      <main>
        {page === 'home' && <Home activeSpecial={activeSpecial} isOpen={isOpen} todayHours={todayHours} onNavigate={navigate} />}
        {page === 'menu' && <MenuPage items={menuItems} hours={hours} onNavigate={navigate} />}
        {page === 'bakery' && <BakeryPage onNavigate={navigate} />}
        {page === 'about' && <AboutPage onNavigate={navigate} />}
        {page === 'contact' && <ContactPage hours={hours} onNavigate={navigate} />}
      </main>
      <footer className="footer"><div className="container footer-grid"><div><div className="footer-brand">European’s Best</div><p>Old-world comfort, fresh-baked every morning, and a table where everyone is family.</p></div><div><strong>Find us</strong><p>19608 West 130th Street<br />Strongsville, Ohio 44136</p></div><div><strong>Call ahead</strong><p><a href="tel:4405720600">440-572-0600</a><br />Cash or check only</p></div><a className="social" href="https://www.facebook.com/profile.php?id=100063476925361" target="_blank" rel="noreferrer"><Facebook size={18} /> Follow along</a></div><div className="container footer-bottom">© {new Date().getFullYear()} European’s Best Restaurant and Bakery <span>Designed by Aidan Mann.</span><span className="designer-contact">Contact Aidan at 4403344336</span></div></footer>
      {!loading && <div className="mobile-call"><a href="tel:4405720600"><Phone size={18} /> Call Now</a><button onClick={() => navigate('menu')}><Utensils size={18} /> Menu</button></div>}
    </div>
  );
}

function Home({ activeSpecial, isOpen, todayHours, onNavigate }: { activeSpecial: Special; isOpen: boolean; todayHours: Hour; onNavigate: (page: Page) => void }) {
  return <>
    <section className="hero"><div className="hero-image" /><div className="hero-content container"><div className="eyebrow"><span className="eyebrow-line" /> Strongsville’s neighborhood table</div><div className="slogan">Quickness, Quality, Quantity</div><h1>Come for the<br /><em>comfort.</em> Stay for family.</h1><p>Old-world European flavor, breakfast specials seven days a week, and a bakery case filled fresh every morning.</p><div className="button-row"><button className="button button-primary" onClick={() => onNavigate('menu')}>View the menu <ArrowRight size={18} /></button><a className="button button-light" href="tel:4405720600"><Phone size={17} /> Call now</a></div><div className="hero-note"><span className={isOpen ? 'status-dot' : 'status-dot closed'} /> <strong>{isOpen ? 'We’re open today' : 'We open tomorrow at 7am'}</strong><span>· {todayHours?.day_label} {todayHours?.open_time ? `${formatTime(todayHours.open_time)}–${formatTime(todayHours.close_time)}` : 'Closed'}</span></div></div></section>
    <section className="trust-strip"><div className="container trust-grid"><div><Star className="gold-icon" size={18} fill="currentColor" /><strong>Loved by locals</strong><span>Warm service, generous plates</span></div><div><span className="fox-badge">FOX 8</span><strong>As seen on New Day Cleveland</strong><span>A family story worth sharing</span></div><div><Coffee className="gold-icon" size={19} /><strong>Breakfast all week</strong><span>Made to order, never rushed</span></div></div></section>
    <section className="intro section container"><div className="section-kicker">A seat is waiting</div><div className="intro-grid"><div><h2>Good food tastes better when you know the people who made it.</h2><p>European’s Best is a family-run restaurant and bakery in Strongsville, serving comforting favorites with the kind of welcome that keeps neighbors coming back.</p><button className="text-link" onClick={() => onNavigate('about')}>Meet the family <ArrowRight size={16} /></button></div><div className="special-card"><div className="special-label"><Sparkles size={16} /> Today’s table</div><h3>{activeSpecial.title}</h3><p>{activeSpecial.description}</p><button className="text-link" onClick={() => onNavigate('menu')}>See all specials <ArrowRight size={16} /></button></div></div></section>
    <section className="feature-section"><div className="container feature-grid"><div className="feature-copy"><div className="section-kicker">Fresh from the bakery</div><h2>Make the morning sweeter.</h2><p>From celebration cakes to traditional European pastries, our bakery is here for birthdays, holidays, and the little “just because” moments.</p><div className="button-row"><button className="button button-dark" onClick={() => onNavigate('bakery')}>Explore the bakery <ArrowRight size={17} /></button><button className="text-link" onClick={() => onNavigate('contact')}>Ask about a cake <ArrowRight size={16} /></button></div></div><div className="cake-collage"><img className="cake-main" src={weddingCakePhoto} alt="Celebration cake from the bakery" /><img className="cake-small" src={birthdayCakePhoto} alt="Birthday cake from the bakery" /><div className="stamp">Made<br />with<br /><em>heart</em></div></div></div></section>
    <section className="visit-section section container"><div><div className="section-kicker">Plan your visit</div><h2>Your neighborhood table is in Strongsville.</h2><p>Breakfast, lunch, bakery treats, and a little extra time together. We’re easy to find in Boston Square Plaza.</p></div><div className="visit-card"><div className="visit-status"><span className={isOpen ? 'status-dot' : 'status-dot closed'} /> <strong>{isOpen ? 'Open today' : 'Closed for today'}</strong></div><div className="address"><MapPin size={18} /><span>19608 West 130th Street<br />Strongsville, Ohio 44136</span></div><div className="button-row"><a className="button button-primary" href="https://www.google.com/maps/search/?api=1&query=19608+West+130th+Street+Strongsville+Ohio+44136" target="_blank" rel="noreferrer">Get directions <MapPin size={17} /></a><a className="button button-outline" href="tel:4405720600">Call now <Phone size={17} /></a></div></div></section>
    <section className="review-section"><div className="container review-content"><div className="stars">★★★★★</div><blockquote>“The food is delicious, the bakery is amazing, and everyone makes you feel like family.”</blockquote><p>— A favorite local review</p><a href="https://www.google.com/search?q=European%27s+Best+Restaurant+and+Bakery+Strongsville+reviews" target="_blank" rel="noreferrer" className="text-link light-link">Read our Google reviews <ArrowRight size={16} /></a></div></section>
  </>;
}

function MenuPage({ items, hours, onNavigate }: { items: MenuItem[]; hours: Hour[]; onNavigate: (page: Page) => void }) {
  const categories = [...new Set(items.map((item) => item.category))]; const [categoryIndex, setCategoryIndex] = useState(0); const category = categories[categoryIndex] ?? categories[0]; const categoryItems = items.filter((item) => item.category === category);
  function moveCategory(direction: number) { setCategoryIndex((current) => (current + direction + categories.length) % categories.length); }
  return <section className="page-section container"><div className="page-heading"><div className="section-kicker">Pull up a chair</div><h1>Made-to-order comfort.</h1><p>Browse one menu category at a time, with every item grouped under its own section.</p></div><div className="notice"><span><Check size={16} /> Cash or check only</span><small>We keep it simple, neighborly, and delicious.</small></div><div className="menu-layout"><div><div className="menu-category-bar"><button className="category-arrow" onClick={() => moveCategory(-1)} aria-label="Previous menu category"><ChevronLeft size={20} /></button><div><span className="section-kicker">Menu category {categoryIndex + 1} of {categories.length}</span><h2>{category}</h2></div><button className="category-arrow" onClick={() => moveCategory(1)} aria-label="Next menu category"><ChevronRight size={20} /></button></div><div className="menu-category menu-category-active">{categoryItems.map((item) => <div className="menu-item" key={item.id}><div><h3>{item.name}</h3><p>{item.description}</p></div><strong>{item.price}</strong></div>)}</div></div><aside className="hours-card"><Clock3 size={21} /><h3>Kitchen hours</h3>{hours.map((hour) => <div className="hours-row" key={hour.id}><span>{hour.day_label.slice(0, 3)}</span><strong>{hour.is_closed ? 'Closed' : `${formatTime(hour.open_time)}–${formatTime(hour.close_time)}`}</strong></div>)}<button className="text-link" onClick={() => onNavigate('contact')}>Plan your visit <ArrowRight size={15} /></button></aside></div></section>;
}

function BakeryPage({ onNavigate }: { onNavigate: (page: Page) => void }) { return <section className="page-section container"><div className="page-heading"><div className="section-kicker">A little something sweet</div><h1>Fresh-baked for your best moments.</h1><p>Traditional pastries, celebration cakes, and familiar favorites made fresh in our bakery.</p></div><div className="bakery-grid"><div className="bakery-photo-card"><img src={weddingCakePhoto} alt="Wedding cake" /><div><span>Celebration cakes</span><strong>Made for your milestone.</strong></div></div><div className="bakery-photo-card"><img src={birthdayCakePhoto} alt="Birthday cake" /><div><span>Birthday cakes</span><strong>Pick a favorite, or dream up your own.</strong></div></div></div><div className="bakery-copy"><div><h2>Let’s make it special.</h2><p>We take cake and pastry requests for birthdays, weddings, anniversaries, holidays, and all the sweet reasons in between. Pay at pickup by cash or check.</p></div><div className="button-row"><a className="button button-primary" href="tel:4405720600">Call about a bakery order <Phone size={17} /></a><button className="text-link" onClick={() => onNavigate('seasonal')}>Seasonal bakery <ArrowRight size={16} /></button></div></div></section>; }

function AboutPage({ onNavigate }: { onNavigate: (page: Page) => void }) { return <section className="about-page"><div className="container about-hero"><div><div className="section-kicker">Our family story</div><h1>We’re all family here.</h1><p>It’s family that supports us and grounds us in what truly matters. That spirit is in every plate, every pastry, and every hello at the door.</p><button className="button button-primary" onClick={() => onNavigate('contact')}>Come say hello <Heart size={17} /></button></div><img src={familyPhoto} alt="The European's Best family team" /></div><div className="container about-copy"><div className="section-kicker">Old-world flavor, local welcome</div><h2>A place for breakfast, lunch, and the stories in between.</h2><p>European’s Best Bakery and Restaurant has been serving satisfied customers since 2001. We are family owned and operated. We love to bring people together to share in the delight of European cuisine.</p><p>We offer a full menu of European dishes including chicken paprikas, stuffed cabbage, wiener schnitzel, fresh-made sausage. All of our delicious entrees use fresh quality meats. Bakery items include traditional European favorites such as nut roll, kolaczki, strudels, cakes and fresh baked breads.</p><div className="about-points"><div><strong>Fresh every morning</strong><span>From bakery classics to made-to-order breakfast.</span></div><div><strong>Neighbors first</strong><span>Friendly service for families, seniors, and everyone in between.</span></div><div><strong>Worth the drive</strong><span>Proudly serving Strongsville, Brunswick, Parma, Berea, and Medina, and surrounding areas.</span></div></div></div></section>; }

function ContactPage({ hours, onNavigate }: { hours: Hour[]; onNavigate: (page: Page) => void }) { const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [message, setMessage] = useState(''); const [status, setStatus] = useState(''); async function submit(event: FormEvent) { event.preventDefault(); if (name.trim().length < 2) { setStatus('Please enter your full name (at least 2 characters).'); return; } if (message.trim().length < 5) { setStatus('Please enter a longer message (at least 5 characters).'); return; } if (phone && phone.replace(/[^0-9]/g, '').length > 0 && phone.replace(/[^0-9]/g, '').length < 7) { setStatus('Please enter a full phone number (at least 7 digits), or leave it blank.'); return; } const { error } = await supabase.from('contact_messages').insert({ full_name: name.trim(), email: email.trim(), phone: phone.trim() || null, message: message.trim() }); setStatus(error ? 'We could not send your message. Please call us at 440-572-0600.' : 'Thanks! Your message is in our inbox.'); if (!error) { setName(''); setEmail(''); setPhone(''); setMessage(''); } } return <section className="page-section container contact-page"><div className="page-heading"><div className="section-kicker">Come visit</div><h1>There’s always room at our table.</h1><p>Call ahead, stop in, or send us a message. We’ll get back to you soon.</p></div><div className="contact-grid"><div className="contact-card dark-card"><MapPin size={24} /><h2>Find us in Strongsville</h2><p>19608 West 130th Street<br />Strongsville, Ohio 44136</p><a className="button button-light" href="https://www.google.com/maps/search/?api=1&query=19608+West+130th+Street+Strongsville+Ohio+44136" target="_blank" rel="noreferrer">Get directions <MapPin size={17} /></a></div><div className="contact-card"><Phone size={24} /><h2>Call the restaurant</h2><p>Questions about today’s specials or a bakery order? We’d love to hear from you.</p><a className="button button-primary" href="tel:4405720600">440-572-0600 <Phone size={17} /></a></div><div className="contact-card"><Clock3 size={24} /><h2>Hours</h2>{hours.map((hour) => <div className="hours-row" key={hour.id}><span>{hour.day_label}</span><strong>{hour.is_closed ? 'Closed' : `${formatTime(hour.open_time)}–${formatTime(hour.close_time)}`}</strong></div>)}</div></div><form className="contact-message-form" onSubmit={submit}><div className="section-kicker">Contact us</div><h2>Send us a message</h2><div className="form-two"><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><label>Phone <span className="muted-label">(optional)</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>Message<textarea required rows={6} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can we help?" /></label>{status && <div className={status.startsWith('Thanks') ? 'form-success' : 'form-error'}>{status}</div>}<button className="button button-primary">Send message <ArrowRight size={17} /></button></form><div className="contact-note"><Check size={18} /> Cash or check only. Thank you for supporting our family business.</div><div className="button-row"><button className="text-link" onClick={() => onNavigate('bakery')}>Explore the bakery <ArrowRight size={16} /></button><button className="text-link" onClick={() => onNavigate('catering')}>Ask about catering <ArrowRight size={16} /></button></div></section>; }

function LoginPage({ onBack, onStaffLogin, onSuccess }: { onBack: () => void; onStaffLogin: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); let result = await supabase.auth.signInWithPassword({ email, password }); if (result.error && email === TEMP_EMAIL && password === TEMP_PASSWORD) { const signup = await supabase.auth.signUp({ email, password }); if (!signup.error) result = await supabase.auth.signInWithPassword({ email, password }); } if (result.error) { setError(result.error.message.includes('Invalid') ? 'That login did not work. Please check the email and password.' : result.error.message); setBusy(false); return; } const { data: isOwner } = await supabase.rpc('claim_owner'); if (!isOwner) { await supabase.auth.signOut(); setError('This account is not the restaurant owner account.'); setBusy(false); return; } setBusy(false); onSuccess(); }
  return <div className="login-page"><div className="login-card"><button className="back-link" onClick={onBack}>← Back to website</button><img src={logoPath} alt="European's Best logo" /><div className="section-kicker">The Family</div><h1>Welcome back.</h1><p>Sign in to update the menu, specials, and hours.</p><form onSubmit={submit}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <div className="form-error">{error}</div>}<button className="button button-primary full-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} <LogIn size={17} /></button></form><div className="staff-login-help"><Clock3 size={17} /><div><strong>Staff sign-in</strong><span>Use the staff name and code to clock in, see your schedule, add notes, and manage permitted time actions.</span><button type="button" className="text-link" onClick={onStaffLogin}>Open staff sign-in <ArrowRight size={15} /></button></div></div></div></div>;
}

function Dashboard({ user, tab, setTab, menuItems, setMenuItems, specials, setSpecials, hours, setHours, onSignOut, onNavigate, onSiteSettingsChange, ownerName, onOwnerNameChange, unreadCount, onUnreadChange, pendingTimeOffCount, onPendingTimeOffChange }: { user: User | null; tab: DashboardTab; setTab: (tab: DashboardTab) => void; menuItems: MenuItem[]; setMenuItems: (items: MenuItem[]) => void; specials: Special[]; setSpecials: (items: Special[]) => void; hours: Hour[]; setHours: (items: Hour[]) => void; onSignOut: () => void; onNavigate: (page: Page) => void; onSiteSettingsChange: (settings: SiteSettings) => void; ownerName: string; onOwnerNameChange: (name: string) => void; unreadCount: number; onUnreadChange: (count: number) => void; pendingTimeOffCount: number; onPendingTimeOffChange: (count: number) => void }) {
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  function showNotice(msg: string, isError = false) { setNotice(msg); setNoticeIsError(isError); }
  async function changePassword() {
    if (newPassword.length < 10) { showNotice('Use at least 10 characters for your new password.', true); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    showNotice(error ? 'Could not change the password.' : 'Password changed successfully.', !!error);
    if (!error) { setNewPassword(''); setShowPassword(false); }
  }
  async function saveSpecial(special: Special) { const { error } = await supabase.from('daily_specials').upsert(special.id === 'fallback' ? { title: special.title, description: special.description, special_date: special.special_date, is_published: special.is_published } : special); showNotice(error ? 'Could not save this special.' : 'Special saved.', !!error); if (!error) setSpecials([special]); }
  async function removeSpecial(id: string) { if (id === 'fallback') { setSpecials([]); showNotice('Daily special hidden.'); return; } const { error } = await supabase.from('daily_specials').delete().eq('id', id); showNotice(error ? 'Could not remove this special.' : 'Daily special removed.', !!error); if (!error) setSpecials([]); }
  async function saveMenu(item: MenuItem) { const { data, error } = await supabase.from('menu_items').upsert(item.id.length < 10 ? { category: item.category, name: item.name, description: item.description, price: item.price, is_visible: item.is_visible, sort_order: item.sort_order } : item).select().maybeSingle(); showNotice(error ? 'Could not save this menu item.' : 'Menu item saved.', !!error); if (!error && data) setMenuItems([...menuItems.filter((existing) => existing.id !== item.id), data]); }
  async function removeMenu(id: string) { const { error } = await supabase.from('menu_items').delete().eq('id', id); showNotice(error ? 'Could not remove this item.' : 'Menu item removed.', !!error); if (!error) setMenuItems(menuItems.filter((item) => item.id !== id)); }
  async function saveHour(hour: Hour) { const { error } = await supabase.from('site_hours').update({ open_time: hour.open_time, close_time: hour.close_time, is_closed: hour.is_closed, updated_at: new Date().toISOString() }).eq('id', hour.id); showNotice(error ? 'Could not save hours.' : 'Hours saved.', !!error); }
  return <div className="dashboard"><aside className="dashboard-sidebar"><div className="dashboard-brand"><img src={logoPath} alt="" /><span>Restaurant<br /><strong>Control Panel</strong></span></div><div className="owner-chip"><span className="owner-avatar">{ownerName[0] ?? 'O'}</span><div><strong>{ownerName}</strong><small>{user?.email ?? TEMP_EMAIL}</small></div></div><nav><button className={tab === 'specials' ? 'selected' : ''} onClick={() => setTab('specials')}><Sparkles size={18} /> Daily specials</button><button className={tab === 'menu' ? 'selected' : ''} onClick={() => setTab('menu')}><Utensils size={18} /> Menu manager</button><button className={tab === 'hours' ? 'selected' : ''} onClick={() => setTab('hours')}><Clock3 size={18} /> Hours & closures</button><button className={tab === 'customers' ? 'selected' : ''} onClick={() => setTab('customers')}><UsersIcon /> Customer list</button><button className={tab === 'messages' ? 'selected' : ''} onClick={() => setTab('messages')}><MailIcon /> Contact messages{unreadCount > 0 && <span className="badge-unread">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button><button className={tab === 'promotions' ? 'selected' : ''} onClick={() => setTab('promotions')}><Sparkles size={18} /> Promotions</button><button className={tab === 'reviews' ? 'selected' : ''} onClick={() => setTab('reviews')}><Star size={18} /> Reviews</button><button className={tab === 'staff' ? 'selected' : ''} onClick={() => setTab('staff')}><UsersIcon /> Staff tools</button><button className={tab === 'schedule' ? 'selected' : ''} onClick={() => setTab('schedule')}><CalendarIcon /> Schedule maker</button><button className={tab === 'time' ? 'selected' : ''} onClick={() => setTab('time')}><Clock3 size={18} /> Staff time & notes</button><button className={tab === 'timeoff' ? 'selected' : ''} onClick={() => setTab('timeoff')}><CalendarIcon size={18} /> Time off requests{pendingTimeOffCount > 0 && <span className="badge-unread">{pendingTimeOffCount > 99 ? '99+' : pendingTimeOffCount}</span>}</button><button className={tab === 'orders' ? 'selected' : ''} onClick={() => setTab('orders')}><Utensils size={18} /> Online orders</button><button className={tab === 'account' ? 'selected' : ''} onClick={() => setTab('account')}><ShieldCheck size={18} /> Owner account</button><button className={tab === 'activity' ? 'selected' : ''} onClick={() => setTab('activity')}><FileIcon /> Activity log</button><button onClick={() => onNavigate('clock')}><Clock3 size={18} /> Open staff kiosk</button></nav><button className="signout" onClick={onSignOut}><LogOut size={17} /> Sign out</button></aside><main className="dashboard-main"><div className="dashboard-top"><div><div className="section-kicker">Good morning</div><h1>Keep today delicious.</h1></div><div className="dashboard-actions"><button onClick={() => window.open('/', '_blank')}>View website <ArrowRight size={16} /></button><button className="dashboard-password" onClick={() => setShowPassword(true)}>Change password</button><button className="avatar-button" onClick={onSignOut}>O</button></div></div>{notice && <div className={noticeIsError ? 'save-notice save-notice-error' : 'save-notice'}>{noticeIsError ? <X size={16} /> : <Check size={16} />} {notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}{tab === 'specials' && <SpecialEditor specials={specials} onSave={saveSpecial} onRemove={removeSpecial} />}{tab === 'menu' && <MenuEditor items={menuItems} onSave={saveMenu} onRemove={removeMenu} />}{tab === 'hours' && <HoursEditor hours={hours} setHours={setHours} onSave={saveHour} />}{!['specials', 'menu', 'hours'].includes(tab) && <OperationsContent tab={tab as OpsTab} onNotice={(msg) => showNotice(msg, msg.toLowerCase().startsWith('could not') || msg.toLowerCase().includes('not available') || msg.toLowerCase().includes('please '))} onSiteSettingsChange={onSiteSettingsChange} onOwnerNameChange={onOwnerNameChange} onUnreadChange={onUnreadChange} onPendingTimeOffChange={onPendingTimeOffChange} />}{showPassword && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setShowPassword(false)}><X /></button><div className="section-kicker">Account security</div><h2>Change your password</h2><label>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 10 characters" /></label><button className="button button-primary full-button" onClick={changePassword}>Save new password <Check size={17} /></button></div></div>}</main></div>;
}

function SpecialEditor({ specials, onSave, onRemove }: { specials: Special[]; onSave: (special: Special) => void; onRemove: (id: string) => void }) { const [special, setSpecial] = useState<Special>(specials[0] ?? fallbackSpecial); useEffect(() => setSpecial(specials[0] ?? fallbackSpecial), [specials]); return <div className="editor"><div className="editor-heading"><div><h2>Daily specials</h2><p>Change the message guests see on the homepage.</p></div><span className="live-pill"><span /> Live on website</span></div><div className="editor-card"><label>Special title<input value={special.title} onChange={(event) => setSpecial({ ...special, title: event.target.value })} /></label><label>What should guests know?<textarea rows={5} value={special.description} onChange={(event) => setSpecial({ ...special, description: event.target.value })} /></label><label>Date<input type="date" value={special.special_date} onChange={(event) => setSpecial({ ...special, special_date: event.target.value })} /></label><label className="toggle-label"><button className={special.is_published ? 'toggle on' : 'toggle'} onClick={() => setSpecial({ ...special, is_published: !special.is_published })}><span /></button>Show this special on the website</label><div className="button-row"><button className="button button-primary" onClick={() => onSave(special)}>Save special <Check size={17} /></button><button className="button button-outline" onClick={() => onRemove(special.id)}>Remove special <Minus size={16} /></button></div></div></div>; }

function MenuEditor({ items, onSave, onRemove }: { items: MenuItem[]; onSave: (item: MenuItem) => void; onRemove: (id: string) => void }) { const [editing, setEditing] = useState<MenuItem | null>(null); const [query, setQuery] = useState(''); const [categoryIndex, setCategoryIndex] = useState(0); const [activeCategory] = useState<string | null>(null); function blank(): MenuItem { return { id: `new-${Date.now()}`, category: activeCategory ?? 'Breakfast', name: '', description: '', price: '', is_visible: true, sort_order: items.length + 1 }; } const categories = [...new Set(items.map((item) => item.category))]; const currentCategory = categories[categoryIndex] ?? categories[0]; const categoryItems = items.filter((item) => item.category === currentCategory); const filtered = query ? items.filter((item) => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())) : categoryItems; function moveCategory(direction: number) { setCategoryIndex((current) => (current + direction + categories.length) % categories.length); } return <div className="editor"><div className="editor-heading menu-editor-heading"><div><h2>Menu manager</h2><p>Add, update, hide, or reprice items without touching the website.</p></div><div className="menu-editor-actions"><input className="menu-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all menu items" aria-label="Search menu items" /><button className="button button-primary" onClick={() => setEditing(blank())}><Plus size={17} /> Add item</button></div></div>{!query && categories.length > 0 && <div className="menu-category-bar"><button className="category-arrow" onClick={() => moveCategory(-1)} aria-label="Previous menu category"><ChevronLeft size={20} /></button><div><span className="section-kicker">Menu category {categoryIndex + 1} of {categories.length}</span><h2>{currentCategory}</h2></div><button className="category-arrow" onClick={() => moveCategory(1)} aria-label="Next menu category"><ChevronRight size={20} /></button></div>}<div className="item-list">{filtered.map((item) => <div className="managed-item" key={item.id}><div><span className="item-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p></div><strong>{item.price}</strong><div className="item-actions"><button onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}><Pencil size={16} /></button><button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`}><Minus size={16} /></button></div></div>)}{filtered.length === 0 && <EmptyMenuSearch />}</div>{editing && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setEditing(null)}><X /></button><div className="section-kicker">Menu item</div><h2>{editing.id.startsWith('new-') ? 'Add a menu item' : 'Edit menu item'}</h2><label>Category<input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} /></label><label>Item name<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label>Description<textarea rows={3} value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label><label>Price<input value={editing.price} onChange={(event) => setEditing({ ...editing, price: event.target.value })} /></label><label className="toggle-label"><button className={editing.is_visible ? 'toggle on' : 'toggle'} onClick={() => setEditing({ ...editing, is_visible: !editing.is_visible })}><span /></button>Show on public menu</label><button className="button button-primary full-button" onClick={() => { onSave(editing); setEditing(null); }}>Save item <Check size={17} /></button></div></div>}</div>; }
function EmptyMenuSearch() { return <div className="empty-state"><h3>No matching menu items</h3><p>Try a different name or category.</p></div>; }

function HoursEditor({ hours, setHours, onSave }: { hours: Hour[]; setHours: (hours: Hour[]) => void; onSave: (hour: Hour) => void }) { return <div className="editor"><div className="editor-heading"><div><h2>Hours & closures</h2><p>Keep your guests up to date when your schedule changes.</p></div></div><div className="editor-card hours-editor">{hours.map((hour) => <div className="hours-edit-row" key={hour.id}><strong>{hour.day_label}</strong><input type="time" value={hour.open_time ?? ''} disabled={hour.is_closed} onChange={(event) => setHours(hours.map((item) => item.id === hour.id ? { ...item, open_time: event.target.value } : item))} /><span>to</span><input type="time" value={hour.close_time ?? ''} disabled={hour.is_closed} onChange={(event) => setHours(hours.map((item) => item.id === hour.id ? { ...item, close_time: event.target.value } : item))} /><label className="closed-check"><input type="checkbox" checked={hour.is_closed} onChange={(event) => setHours(hours.map((item) => item.id === hour.id ? { ...item, is_closed: event.target.checked } : item))} /> Closed</label><button className="save-mini" onClick={() => onSave(hour)}><Check size={15} /></button></div>)}</div><div className="editor-tip"><Flame size={18} /><div><strong>Quick tip</strong><p>For weather or emergency closures, update the closed day here first, then use Promotions to remove outdated announcements.</p></div></div></div>; }

export default App;
