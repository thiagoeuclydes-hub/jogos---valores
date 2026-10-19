import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Users, 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  ChevronRight,
  LogOut,
  LogIn,
  Search,
  UserPlus,
  AlertCircle,
  FileText,
  Lock,
  LayoutDashboard,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, testConnection } from './firebase';
import { Series, Participant, Expense, OperationType, FirestoreErrorInfo, SeriesValue } from './types';

// Smaller font sizes globally via Tailwind (text-sm, text-xs)

function EditableAmount({ value, onSave, isPaid }: { value: number, onSave: (val: number) => void, isPaid: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value.toString());

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-white/20">R$</span>
        <input
          autoFocus
          type="text"
          value={tempVal}
          onChange={(e) => setTempVal(e.target.value)}
          onBlur={() => {
            const num = parseFloat(tempVal.replace(',', '.')) || 0;
            onSave(num);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = parseFloat(tempVal.replace(',', '.')) || 0;
              onSave(num);
              setIsEditing(false);
            }
            if (e.key === 'Escape') {
              setTempVal(value.toString());
              setIsEditing(false);
            }
          }}
          className="w-16 bg-white/10 border border-neon-blue/50 rounded px-1.5 py-0.5 text-neon-blue font-black text-[11px] outline-none"
        />
      </div>
    );
  }

  return (
    <div 
      onDoubleClick={() => setIsEditing(true)}
      className="cursor-pointer group relative inline-block"
      title="Clique duplo para editar valor manual"
    >
      <span className={`font-black text-[12px] tracking-tight ${isPaid ? 'text-neon-green' : 'text-neon-red'} group-hover:text-neon-blue transition-colors`}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </span>
      <div className="absolute -top-3 left-0 text-[7px] font-black text-white/20 opacity-0 group-hover:opacity-100 uppercase tracking-widest transition-opacity pointer-events-none whitespace-nowrap">
        Clique duplo p/ editar
      </div>
    </div>
  );
}

function SafeDate({ date }: { date: any }) {
  if (!date) return <span className="opacity-20 italic">...</span>;
  try {
    const d = typeof date.toDate === 'function' ? date.toDate() : date;
    return <span>{new Intl.DateTimeFormat('pt-BR').format(d)}</span>;
  } catch (e) {
    return <span className="opacity-20">--/--/--</span>;
  }
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy-dark flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-16 h-16 text-neon-red mb-4" />
          <h2 className="text-xl font-black text-white mb-2">OPS! ALGO DEU ERRADO</h2>
          <p className="text-white/60 mb-6 text-sm">O aplicativo encontrou um erro inesperado.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-neon-blue text-navy-dark font-black py-3 px-8 rounded-xl text-sm"
          >
            RECARREGAR APLICATIVO
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: 'custom-auth', email: 'prof.thiago' },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const [series, setSeries] = useState<Series[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'series' | 'expenses'>('dashboard');
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
    const savedAuth = localStorage.getItem('dançapp_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    setGlobalError(null);

    // Defensive mapping with optional chaining and defaults to prevent crashes if data is malformed
    const unsubSeries = onSnapshot(collection(db, 'series'), (snapshot) => {
      try {
        const seriesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Series));
        setSeries(seriesData.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setLoading(false);
      } catch (e) {
        console.error("Mapping error:", e);
        setGlobalError("Erro ao processar dados das séries.");
      }
    }, (err) => {
      setGlobalError(`Erro ao carregar séries: ${err.message}`);
      handleFirestoreError(err, OperationType.LIST, 'series');
      setLoading(false);
    });

    const unsubParticipants = onSnapshot(collection(db, 'participants'), (snapshot) => {
      try {
        const participantData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Participant));
        setParticipants(participantData.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      } catch (e) {
        console.error("Mapping error:", e);
      }
    }, (err) => {
      setGlobalError(`Erro ao carregar alunos: ${err.message}`);
      handleFirestoreError(err, OperationType.LIST, 'participants');
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      try {
        const expenseData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
        setExpenses(expenseData.sort((a, b) => {
          const dateA = a.date?.toDate?.() || new Date(0);
          const dateB = b.date?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        }));
      } catch (e) {
        console.error("Mapping error:", e);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'expenses');
    });

    return () => {
      unsubSeries();
      unsubParticipants();
      unsubExpenses();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'Prof.Thiago' && password.trim() === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('dançapp_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('dançapp_auth');
    setUsername('');
    setPassword('');
  };

  const totals = useMemo(() => {
    const totalGoal = series.reduce((acc, s) => {
      const count = participants.filter(p => p.seriesId === s.id).length;
      const seriesTotalPerStudent = (s.values || []).reduce((sum, v) => sum + (v.amount || 0), 0);
      return acc + (count * seriesTotalPerStudent);
    }, 0);
    const totalCollected = participants.reduce((acc, p) => {
      const pPaid = Object.values(p.payments || {}).reduce((sum, v) => sum + (v || 0), 0);
      return acc + pPaid;
    }, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    return {
      totalGoal,
      totalCollected,
      totalExpenses,
      balance: totalCollected - totalExpenses
    };
  }, [series, participants, expenses]);

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-navy-dark flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-neon-blue/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-neon-green/20 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-navy-dark/80 backdrop-blur-xl rounded-3xl p-8 text-center border border-neon-blue/30 shadow-[0_0_40px_rgba(0,242,255,0.1)]"
      >
        <div className="bg-gradient-to-br from-neon-blue to-neon-green w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-neon-blue/20">
          <Lock className="w-8 h-8 text-navy-dark" />
        </div>
        <h1 className="text-xl font-black text-white mb-1 tracking-tighter neon-text-blue">DançApp</h1>
        <p className="text-neon-green/80 mb-6 font-bold uppercase text-[9px] tracking-widest">Controle de Adereços</p>
        
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-neon-blue uppercase tracking-[0.2em] ml-1">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-neon-blue focus:bg-white/10 outline-none transition-all text-white font-semibold text-xs"
              placeholder="Prof.Thiago"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-neon-blue uppercase tracking-[0.2em] ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-neon-blue focus:bg-white/10 outline-none transition-all text-white font-semibold text-xs"
              placeholder="••••••••"
              required
            />
          </div>
          
          {loginError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neon-red/10 text-neon-red p-3 rounded-xl text-[10px] font-bold border border-neon-red/20 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              {loginError}
            </motion.div>
          )}

          <button 
            type="submit"
            className="w-full bg-neon-blue hover:bg-neon-blue/90 text-navy-dark font-black py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.3)] active:scale-95 text-xs"
          >
            <LogIn className="w-4 h-4" />
            ENTRAR
          </button>
        </form>
      </motion.div>
    </div>
  );

  if (loading && series.length === 0) return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-navy-dark text-white pb-20 lg:pb-0 lg:pl-56 font-sans text-sm">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-navy-dark border-r border-white/10 fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-10">
            <div className="bg-gradient-to-br from-neon-blue to-neon-green p-1.5 rounded-lg">
              <Users className="w-5 h-5 text-navy-dark" />
            </div>
            <span className="font-black text-xl tracking-tighter neon-text-blue">DançApp</span>
          </div>
          
          <nav className="space-y-1">
            <SidebarLink 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setSelectedSeries(null); }} 
              icon={<LayoutDashboard className="w-4 h-4" />} 
              label="Painel Geral" 
              activeColor="neon-blue"
            />
            <SidebarLink 
              active={activeTab === 'series'} 
              onClick={() => { setActiveTab('series'); setSelectedSeries(null); }} 
              icon={<Users className="w-4 h-4" />} 
              label="Séries & Alunos" 
              activeColor="neon-green"
            />
            <SidebarLink 
              active={activeTab === 'expenses'} 
              onClick={() => { setActiveTab('expenses'); setSelectedSeries(null); }} 
              icon={<TrendingDown className="w-4 h-4" />} 
              label="Saídas" 
              activeColor="neon-red"
            />
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-white/5 bg-white/2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-neon-blue/20 flex items-center justify-center font-black text-neon-blue border border-neon-blue/30 text-xs">
              PT
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">Prof. Thiago</p>
              <p className="text-[8px] text-neon-green font-bold uppercase tracking-widest">Admin</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[9px] font-black text-white/40 hover:text-neon-red transition-colors uppercase tracking-widest"
          >
            <LogOut className="w-3 h-3" />
            Desconectar
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-navy-dark/90 backdrop-blur-lg border-t border-white/10 z-50 px-4 py-3 flex justify-around">
        <MobileNavLink active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSelectedSeries(null); }} icon={<LayoutDashboard />} activeColor="neon-blue" />
        <MobileNavLink active={activeTab === 'series'} onClick={() => { setActiveTab('series'); setSelectedSeries(null); }} icon={<Users />} activeColor="neon-green" />
        <MobileNavLink active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); setSelectedSeries(null); }} icon={<TrendingDown />} activeColor="neon-red" />
        <button onClick={handleLogout} className="p-2 text-white/40"><LogOut className="w-5 h-5" /></button>
      </nav>

      {/* Main Content */}
      <main className="p-4 lg:p-6 max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight mb-1 uppercase">
              {activeTab === 'dashboard' ? 'PAINEL GERAL' : 
               activeTab === 'series' ? (selectedSeries ? `SÉRIE: ${selectedSeries.name.toUpperCase()}` : 'MINHAS SÉRIES') : 
               'CONTROLE DE SAÍDAS'}
            </h2>
            <div className="h-1 w-10 bg-gradient-to-r from-neon-blue to-transparent rounded-full"></div>
          </div>
        </header>

        {globalError && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-neon-red/10 border border-neon-red/20 p-3 rounded-xl flex items-center gap-3 text-neon-red text-[11px] font-bold"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <p className="uppercase tracking-widest mb-0.5">Erro no Sistema</p>
              <p className="opacity-70 font-medium">{globalError}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-neon-red text-white px-3 py-1 rounded-lg hover:bg-neon-red/80 transition-all uppercase text-[10px]"
            >
              Recarregar
            </button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {series.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-sm p-10 rounded-2xl border border-white/10 text-center space-y-4 shadow-2xl">
                  <div className="bg-neon-blue/10 w-14 h-14 rounded-xl flex items-center justify-center mx-auto border border-neon-blue/20">
                    <FileText className="w-7 h-7 text-neon-blue" />
                  </div>
                  <div className="max-w-sm mx-auto">
                    <h3 className="text-base font-black mb-1 uppercase tracking-tight">BEM-VINDO, PROF. THIAGO!</h3>
                    <p className="text-white/60 font-medium text-[11px]">Comece cadastrando sua primeira turma para gerenciar os adereços.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('series')}
                    className="bg-neon-blue hover:bg-neon-blue/90 text-navy-dark font-black py-2.5 px-6 rounded-xl transition-all inline-flex items-center gap-2 text-xs"
                  >
                    CADASTRAR PRIMEIRA SÉRIE
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="TOTAL PREVISTO" value={totals.totalGoal} icon={<DollarSign className="text-neon-blue" />} color="blue" />
                    <StatCard title="TOTAL RECEBIDO" value={totals.totalCollected} icon={<TrendingUp className="text-neon-green" />} color="green" />
                    <StatCard title="TOTAL SAÍDAS" value={totals.totalExpenses} icon={<TrendingDown className="text-neon-red" />} color="red" />
                    <StatCard title="SALDO ATUAL" value={totals.balance} icon={<AlertCircle className="text-neon-yellow" />} color="yellow" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-lg">
                      <h3 className="font-black text-sm mb-5 flex items-center gap-2 uppercase tracking-tight">
                        <TrendingUp className="w-4 h-4 text-neon-green" />
                        ARRECADAÇÃO POR TURMA
                      </h3>
                      <div className="space-y-5">
                        {series.map(s => {
                          const sParticipants = participants.filter(p => p.seriesId === s.id);
                          const sCollected = sParticipants.reduce((acc, p) => {
                            const pPaid = Object.values(p.payments || {}).reduce((sum, v) => sum + (v || 0), 0);
                            return acc + pPaid;
                          }, 0);
                          const seriesTotalPerStudent = (s.values || []).reduce((sum, v) => sum + (v.amount || 0), 0);
                          const sGoal = sParticipants.length * seriesTotalPerStudent;
                          const percent = sGoal > 0 ? (sCollected / sGoal) * 100 : 0;
                          return (
                            <div key={s.id} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-black tracking-widest uppercase">
                                <span className="text-white/80">{s.name}</span>
                                <span className="text-neon-blue">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sCollected)} 
                                  <span className="text-white/20 mx-1">/</span>
                                  <span className="text-white/40">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sGoal)}</span>
                                </span>
                              </div>
                              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percent}%` }}
                                  className="h-full bg-gradient-to-r from-neon-blue to-neon-green rounded-full shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 shadow-lg">
                      <h3 className="font-black text-sm mb-5 flex items-center gap-2 uppercase tracking-tight">
                        <TrendingDown className="w-4 h-4 text-neon-red" />
                        ÚLTIMAS SAÍDAS
                      </h3>
                      <div className="space-y-3">
                        {expenses.slice(0, 5).map(e => (
                          <div key={e.id} className="flex justify-between items-center p-3 bg-white/2 hover:bg-white/5 rounded-xl transition-all border border-white/5 group">
                            <div>
                              <p className="font-bold text-white/90 group-hover:text-neon-red transition-colors text-xs">{e.description}</p>
                              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">
                                <SafeDate date={e.date} />
                              </p>
                            </div>
                            <span className="text-neon-red font-black text-sm">
                              -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.amount || 0)}
                            </span>
                          </div>
                        ))}
                        {expenses.length === 0 && (
                          <div className="text-center py-10 text-white/10 font-black tracking-tighter text-xl uppercase italic opacity-50">
                            Nenhum Gasto
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'series' && !selectedSeries && (
            <motion.div 
              key="series-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/5 blur-[40px]"></div>
                <h3 className="font-black text-sm mb-4 tracking-tight uppercase text-neon-blue">NOVA SÉRIE DE ALUNOS</h3>
                <SeriesForm />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {series.map(s => (
                  <SeriesCard 
                    key={s.id} 
                    series={s} 
                    participantsCount={participants.filter(p => p.seriesId === s.id).length}
                    onClick={() => setSelectedSeries(s)}
                    onDelete={() => handleDeleteSeries(s.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'series' && selectedSeries && (
            <motion.div 
              key="participants"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setSelectedSeries(null)}
                className="flex items-center gap-2 text-neon-blue font-black text-[10px] uppercase tracking-widest hover:neon-text-blue transition-all mb-2 group"
              >
                <div className="bg-neon-blue/10 p-1.5 rounded-lg group-hover:bg-neon-blue/20 transition-all">←</div>
                Voltar para lista de séries
              </button>
              <ParticipantManager 
                series={selectedSeries} 
                participants={participants.filter(p => p.seriesId === selectedSeries.id)} 
                processingId={processingId}
                setProcessingId={setProcessingId}
              />
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-neon-red/5 blur-[40px]"></div>
                <h3 className="font-black text-sm mb-4 tracking-tight uppercase text-neon-red">REGISTRAR NOVA SAÍDA</h3>
                <ExpenseForm />
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/2 border-b border-white/10 uppercase font-black text-[8px] tracking-[0.2em] text-white/40">
                        <th className="px-5 py-3">Descrição</th>
                        <th className="px-5 py-3">Data</th>
                        <th className="px-5 py-3">Valor Gasto</th>
                        <th className="px-5 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-white/5 transition-all group">
                          <td className="px-5 py-3 font-bold text-white/90 group-hover:text-neon-red transition-colors">{e.description}</td>
                          <td className="px-5 py-3 text-white/40 font-black text-[9px]">
                            <SafeDate date={e.date} />
                          </td>
                          <td className="px-5 py-3 font-black text-neon-red text-sm tracking-tighter">
                            -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.amount || 0)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button 
                              onClick={() => handleDeleteExpense(e.id)} 
                              className="bg-white/5 hover:bg-neon-red/20 text-white/20 hover:text-neon-red p-1.5 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {expenses.length === 0 && (
                    <div className="p-16 text-center">
                      <div className="text-white/10 font-black text-2xl uppercase italic opacity-20">Nenhum Registro de Saída</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
    </ErrorBoundary>
  );

  async function handleDeleteSeries(id: string) {
    if (!confirm('DESEJA REALMENTE EXCLUIR ESTA SÉRIE?')) return;
    try {
      await deleteDoc(doc(db, 'series', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `series/${id}`);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm('EXCLUIR REGISTRO DE GASTO?')) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    }
  }
}

function SidebarLink({ active, onClick, icon, label, activeColor }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, activeColor: string }) {
  const activeClasses: Record<string, string> = {
    'neon-blue': 'bg-neon-blue/10 text-neon-blue border-neon-blue/20 shadow-[0_0_15px_rgba(0,242,255,0.1)]',
    'neon-green': 'bg-neon-green/10 text-neon-green border-neon-green/20 shadow-[0_0_15px_rgba(57,255,20,0.1)]',
    'neon-red': 'bg-neon-red/10 text-neon-red border-neon-red/20 shadow-[0_0_15px_rgba(255,0,60,0.1)]'
  };

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-transparent ${
        active ? activeClasses[activeColor] : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavLink({ active, onClick, icon, activeColor }: { active: boolean, onClick: () => void, icon: React.ReactNode, activeColor: string }) {
  const activeClasses: Record<string, string> = {
    'neon-blue': 'bg-neon-blue text-navy-dark shadow-[0_0_20px_rgba(0,242,255,0.4)]',
    'neon-green': 'bg-neon-green text-navy-dark shadow-[0_0_20px_rgba(57,255,20,0.4)]',
    'neon-red': 'bg-neon-red text-navy-dark shadow-[0_0_20px_rgba(255,0,60,0.4)]'
  };

  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all ${active ? activeClasses[activeColor] : 'text-white/20'}`}
    >
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' }) : icon}
    </button>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-neon-blue/20 bg-neon-blue/5',
    green: 'border-neon-green/20 bg-neon-green/5',
    red: 'border-neon-red/20 bg-neon-red/5',
    yellow: 'border-neon-yellow/20 bg-neon-yellow/5'
  };
  const textColors: Record<string, string> = {
    blue: 'text-neon-blue',
    green: 'text-neon-green',
    red: 'text-neon-red',
    yellow: 'text-neon-yellow'
  };
  return (
    <div className={`p-3 rounded-xl border ${colors[color]} backdrop-blur-sm shadow-xl`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="bg-white/5 p-1.5 rounded-lg text-[10px]">
          {icon}
        </div>
        <div className={`h-1 w-1 rounded-full ${textColors[color]} bg-current shadow-[0_0_8px_currentColor]`}></div>
      </div>
      <div>
        <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">{title}</p>
        <p className={`text-base font-black tracking-tighter ${textColors[color]}`}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
        </p>
      </div>
    </div>
  );
}

function SeriesForm() {
  const [name, setName] = useState('');
  const [entryLabel, setEntryLabel] = useState('Entrada 1');
  const [val, setVal] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !val) return;
    try {
      const amount = parseFloat(val.replace(',', '.')) || 0;
      await addDoc(collection(db, 'series'), {
        name,
        values: [
          { id: crypto.randomUUID(), name: entryLabel || 'Entrada 1', amount }
        ]
      });
      setName('');
      setVal('');
      setEntryLabel('Entrada 1');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'series');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div className="space-y-1">
        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Turma / Série</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon-blue outline-none transition-all text-white font-bold text-xs"
          placeholder="Ex: 6º ano..."
        />
      </div>
      <div className="space-y-1">
        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Descrição</label>
        <input 
          type="text" 
          value={entryLabel} 
          onChange={e => setEntryLabel(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon-blue outline-none transition-all text-white font-bold text-xs"
          placeholder="Ex: Entrada 1"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Valor (R$)</label>
        <input 
          type="text" 
          value={val} 
          onChange={e => setVal(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon-blue outline-none transition-all text-white font-bold text-xs"
          placeholder="0,00"
        />
      </div>
      <button className="bg-neon-blue hover:bg-neon-blue/90 text-navy-dark font-black py-2 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.2)] active:scale-95 text-[10px]">
        <Plus className="w-3.5 h-3.5" />
        SALVAR SÉRIE
      </button>
    </form>
  );
}

function SeriesCard({ series, participantsCount, onClick, onDelete }: { series: Series, participantsCount: number, onClick: () => void, onDelete: () => void }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:border-neon-blue/50 transition-all group relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-20 h-20 bg-neon-blue/5 blur-[30px] group-hover:bg-neon-blue/10 transition-all"></div>
      
      <button 
        onClick={onDelete}
        className="absolute top-3 right-3 text-white/10 hover:text-neon-red p-1.5 rounded-lg hover:bg-neon-red/10 transition-all z-10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <div className="bg-neon-blue/10 w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-neon-blue/20">
        <Users className="w-5 h-5 text-neon-blue" />
      </div>

      <h3 className="text-base font-black mb-0.5 truncate pr-8 text-white tracking-tight uppercase italic">{series.name}</h3>
      <div className="flex items-center gap-2 text-neon-green text-[8px] font-black tracking-widest uppercase mb-4">
        <span>{participantsCount} ALUNOS</span>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div>
          <p className="text-[7px] text-white/30 uppercase font-black tracking-[0.2em] mb-0.5">VALOR TURMA</p>
          <p className="font-black text-base text-neon-blue tracking-tighter">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              (series.values || []).reduce((sum, v) => sum + (v.amount || 0), 0)
            )}
          </p>
        </div>
        <button 
          onClick={onClick}
          className="bg-white hover:bg-neon-blue text-navy-dark px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-xl active:scale-95"
        >
          Ver Alunos
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ParticipantManager({ 
  series, 
  participants, 
  processingId, 
  setProcessingId 
}: { 
  series: Series, 
  participants: Participant[],
  processingId: string | null,
  setProcessingId: (id: string | null) => void
}) {
  const [batchNames, setBatchNames] = useState('');
  const [addingBatch, setAddingBatch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newValueName, setNewValueName] = useState('');
  const [newValueAmount, setNewValueAmount] = useState('');
  const [showValueForm, setShowValueForm] = useState(false);

  const handleAddValue = async () => {
    if (!newValueName || !newValueAmount) return;
    try {
      const amount = parseFloat(newValueAmount.replace(',', '.')) || 0;
      const newValues = [...(series.values || []), { id: crypto.randomUUID(), name: newValueName, amount }];
      await updateDoc(doc(db, 'series', series.id), { values: newValues });
      setNewValueName('');
      setNewValueAmount('');
      setShowValueForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `series/${series.id}`);
    }
  };

  const handleRemoveValue = async (valId: string) => {
    if (!confirm('Remover este valor da turma?')) return;
    try {
      const newValues = (series.values || []).filter(v => v.id !== valId);
      await updateDoc(doc(db, 'series', series.id), { values: newValues });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `series/${series.id}`);
    }
  };

  const filteredParticipants = participants.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBatch = async () => {
    const names = batchNames.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;
    setAddingBatch(true);
    try {
      const batch = writeBatch(db);
      names.forEach(name => {
        const docRef = doc(collection(db, 'participants'));
        batch.set(docRef, {
          seriesId: series.id,
          name,
          payments: {}, 
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      setBatchNames('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'participants/batch');
    } finally {
      setAddingBatch(false);
    }
  };

  const handleToggleItemPayment = async (p: Participant, valueId: string, fullAmount: number) => {
    if (processingId === `${p.id}-${valueId}`) return;
    setProcessingId(`${p.id}-${valueId}`);
    
    const currentPaid = (p.payments || {})[valueId] || 0;
    const newAmount = currentPaid >= fullAmount ? 0 : fullAmount;
    
    const newPayments = { ...(p.payments || {}), [valueId]: newAmount };
    
    try {
      await updateDoc(doc(db, 'participants', p.id), {
        payments: newPayments,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `participants/${p.id}`);
    } finally {
      // Small timeout to prevent super rapid clicks
      setTimeout(() => setProcessingId(null), 300);
    }
  };

  const handleManualItemPayment = async (p: Participant, valueId: string, newAmount: number) => {
    const newPayments = { ...(p.payments || {}), [valueId]: newAmount };
    try {
      await updateDoc(doc(db, 'participants', p.id), {
        payments: newPayments,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `participants/${p.id}`);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('REMOVER ESTE ALUNO DO SISTEMA?')) return;
    try {
      await deleteDoc(doc(db, 'participants', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `participants/${id}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Series Info & Values Management */}
      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-neon-blue tracking-tighter uppercase italic">
              {series.name}
            </h2>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Gestão de Valores e Alunos</p>
          </div>
          <button 
            onClick={() => setShowValueForm(!showValueForm)}
            className="bg-transparent border border-neon-green/30 text-neon-green font-black px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest hover:bg-neon-green hover:text-navy-dark transition-all active:scale-95"
          >
            + Inserir Outro Valor
          </button>
        </div>

        {showValueForm && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-navy-dark/50 rounded-2xl border border-white/10"
          >
            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Descrição (ex: Entrada 2)</label>
              <input 
                type="text" 
                value={newValueName}
                onChange={e => setNewValueName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-dark border border-white/10 focus:border-neon-green outline-none text-white text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Valor (R$)</label>
              <input 
                type="text" 
                value={newValueAmount}
                onChange={e => setNewValueAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-dark border border-white/10 focus:border-neon-green outline-none text-white text-xs font-bold"
                placeholder="0,00"
              />
            </div>
            <button 
              onClick={handleAddValue}
              className="bg-neon-green text-navy-dark font-black py-2 px-6 rounded-xl text-[10px] uppercase tracking-widest self-end"
            >
              Confirmar
            </button>
          </motion.div>
        )}

        <div className="flex flex-wrap gap-3">
          {(series.values || []).map(v => (
            <div key={v.id} className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-4 group">
              <div>
                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">{v.name}</p>
                <p className="font-black text-sm text-neon-green">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.amount)}</p>
              </div>
              <button 
                onClick={() => handleRemoveValue(v.id)}
                className="text-white/10 hover:text-neon-red transition-colors p-1"
                title="Remover valor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Batch Registration */}
        <div className="bg-white/5 p-5 rounded-2xl border border-white/10 h-fit">
          <h3 className="font-black text-xs mb-4 uppercase tracking-widest text-neon-blue flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Adicionar Alunos em Lote
          </h3>
          <p className="text-[10px] text-white/40 mb-3 italic">Cole a lista de nomes (um por linha)</p>
          <textarea 
            className="w-full h-40 bg-navy-dark/50 border border-white/10 rounded-xl p-3 text-white font-medium text-xs focus:border-neon-blue outline-none resize-none mb-3"
            value={batchNames}
            onChange={e => setBatchNames(e.target.value)}
            placeholder="Nome Sobrenome&#10;Nome Sobrenome..."
          />
          <button 
            onClick={handleAddBatch}
            disabled={addingBatch || !batchNames.trim()}
            className="w-full bg-neon-blue disabled:opacity-30 text-navy-dark font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {addingBatch ? 'Processando...' : 'Cadastrar Alunos'}
          </button>
        </div>

        {/* Participant Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text"
              placeholder="BUSCAR ALUNO NESTA SÉRIE..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white focus:border-neon-blue outline-none uppercase tracking-widest"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/2 border-b border-white/10 text-[8px] font-black uppercase tracking-[0.15em] text-white/30">
                    <th className="px-4 py-3 min-w-[150px]">Aluno</th>
                    {(series.values || []).map(v => (
                      <th key={v.id} className="px-4 py-3 text-center">{v.name}</th>
                    ))}
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredParticipants.map(p => (
                    <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                      <td className="px-4 py-3 font-bold text-white/90">{p.name}</td>
                      {(series.values || []).map(v => {
                        const paid = (p.payments || {})[v.id] || 0;
                        const isFullyPaid = paid >= v.amount && v.amount > 0;
                        const isProcessing = processingId === `${p.id}-${v.id}`;
                        
                        return (
                          <td key={v.id} className="px-4 py-3">
                            <div className="flex flex-col items-center gap-1.5">
                              <EditableAmount 
                                value={paid} 
                                isPaid={isFullyPaid}
                                onSave={(val) => handleManualItemPayment(p, v.id, val)}
                              />
                              <button 
                                onClick={() => handleToggleItemPayment(p, v.id, v.amount)}
                                disabled={isProcessing}
                                className={`
                                  px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all w-full max-w-[80px]
                                  ${isFullyPaid 
                                    ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' 
                                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-neon-green hover:text-navy-dark'}
                                  ${isProcessing ? 'opacity-50 cursor-wait scale-95' : 'active:scale-95'}
                                `}
                              >
                                {isProcessing ? '...' : (isFullyPaid ? 'QUITADO' : 'QUITAR')}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDeleteParticipant(p.id)}
                          className="p-1.5 text-white/10 hover:text-neon-red hover:bg-neon-red/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredParticipants.length === 0 && (
                <div className="p-12 text-center text-white/20 uppercase font-black tracking-widest text-xs italic">
                  Nenhum aluno encontrado
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpenseForm() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    try {
      const val = parseFloat(amount.replace(',', '.')) || 0;
      await addDoc(collection(db, 'expenses'), {
        description,
        amount: val,
        date: serverTimestamp()
      });
      setDescription('');
      setAmount('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <div className="space-y-1">
        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">O que foi comprado?</label>
        <input 
          type="text" 
          value={description} 
          onChange={e => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon-red outline-none transition-all text-white font-bold text-xs"
          placeholder="Ex: Materiais, Confecção..."
        />
      </div>
      <div className="space-y-1">
        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Valor Gasto (R$)</label>
        <input 
          type="text" 
          value={amount} 
          onChange={e => setAmount(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon-red outline-none transition-all text-white font-bold text-xs"
          placeholder="0,00"
        />
      </div>
      <button className="bg-neon-red hover:bg-neon-red/90 text-white font-black py-2 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,0,60,0.2)] active:scale-95 text-[10px]">
        <Plus className="w-3.5 h-3.5" />
        REGISTRAR SAÍDA
      </button>
    </form>
  );
}
