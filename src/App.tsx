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
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, testConnection } from './firebase';
import { Series, Participant, Expense, OperationType, FirestoreErrorInfo } from './types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'custom-auth',
      email: 'prof.thiago',
    },
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
  
  const [series, setSeries] = useState<Series[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'series' | 'expenses'>('dashboard');
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  useEffect(() => {
    testConnection();
    const savedAuth = localStorage.getItem('dançapp_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    const unsubSeries = onSnapshot(collection(db, 'series'), (snapshot) => {
      const seriesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Series));
      setSeries(seriesData.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'series'));

    const unsubParticipants = onSnapshot(collection(db, 'participants'), (snapshot) => {
      const participantData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Participant));
      setParticipants(participantData.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'participants'));

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'expenses'));

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
      return acc + (count * s.accessoryValue);
    }, 0);
    const totalCollected = participants.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    return {
      totalGoal,
      totalCollected,
      totalExpenses,
      balance: totalCollected - totalExpenses
    };
  }, [series, participants, expenses]);

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-navy-dark flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative Neon Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-neon-blue/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-neon-green/20 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-navy-dark/80 backdrop-blur-xl rounded-3xl p-8 lg:p-10 text-center border border-neon-blue/30 shadow-[0_0_40px_rgba(0,242,255,0.1)]"
      >
        <div className="bg-gradient-to-br from-neon-blue to-neon-green w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-neon-blue/20">
          <Lock className="w-10 h-10 text-navy-dark" />
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter neon-text-blue">DançApp</h1>
        <p className="text-neon-green/80 mb-10 font-medium tracking-wide uppercase text-xs">Controle de Adereços</p>
        
        <form onSubmit={handleLogin} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neon-blue uppercase tracking-[0.2em] ml-1">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-neon-blue focus:bg-white/10 outline-none transition-all text-white font-semibold"
              placeholder="Prof.Thiago"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neon-blue uppercase tracking-[0.2em] ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-neon-blue focus:bg-white/10 outline-none transition-all text-white font-semibold"
              placeholder="••••••••"
              required
            />
          </div>
          
          {loginError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neon-red/10 text-neon-red p-4 rounded-2xl text-xs font-bold border border-neon-red/20 flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4" />
              {loginError}
            </motion.div>
          )}

          <button 
            type="submit"
            className="w-full bg-neon-blue hover:bg-neon-blue/90 text-navy-dark font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.4)] active:scale-95"
          >
            <LogIn className="w-6 h-6" />
            ENTRAR
          </button>
        </form>
      </motion.div>
    </div>
  );

  if (loading && series.length === 0) return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-blue"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-dark text-white pb-20 lg:pb-0 lg:pl-64 font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-dark border-r border-white/10 fixed inset-y-0 left-0 z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-gradient-to-br from-neon-blue to-neon-green p-2 rounded-xl">
              <Users className="w-6 h-6 text-navy-dark" />
            </div>
            <span className="font-black text-2xl tracking-tighter neon-text-blue">DançApp</span>
          </div>
          
          <nav className="space-y-2">
            <SidebarLink 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setSelectedSeries(null); }} 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="Painel Geral" 
              activeColor="neon-blue"
            />
            <SidebarLink 
              active={activeTab === 'series'} 
              onClick={() => { setActiveTab('series'); setSelectedSeries(null); }} 
              icon={<Users className="w-5 h-5" />} 
              label="Séries & Alunos" 
              activeColor="neon-green"
            />
            <SidebarLink 
              active={activeTab === 'expenses'} 
              onClick={() => { setActiveTab('expenses'); setSelectedSeries(null); }} 
              icon={<TrendingDown className="w-5 h-5" />} 
              label="Saídas" 
              activeColor="neon-red"
            />
          </nav>
        </div>
        
        <div className="mt-auto p-8 border-t border-white/5 bg-white/2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center font-black text-neon-blue border border-neon-blue/30">
              PT
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">Prof. Thiago</p>
              <p className="text-[10px] text-neon-green font-bold uppercase tracking-widest">Admin</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-neon-red transition-colors uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Desconectar
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-navy-dark/90 backdrop-blur-lg border-t border-white/10 z-50 px-6 py-4 flex justify-around">
        <MobileNavLink active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSelectedSeries(null); }} icon={<LayoutDashboard />} activeColor="neon-blue" />
        <MobileNavLink active={activeTab === 'series'} onClick={() => { setActiveTab('series'); setSelectedSeries(null); }} icon={<Users />} activeColor="neon-green" />
        <MobileNavLink active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); setSelectedSeries(null); }} icon={<TrendingDown />} activeColor="neon-red" />
        <button onClick={handleLogout} className="p-3 text-white/40"><LogOut className="w-6 h-6" /></button>
      </nav>

      {/* Main Content */}
      <main className="p-4 lg:p-10 max-w-7xl mx-auto">
        <header className="mb-10">
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">
            {activeTab === 'dashboard' ? 'PAINEL GERAL' : 
             activeTab === 'series' ? (selectedSeries ? `SÉRIE: ${selectedSeries.name.toUpperCase()}` : 'MINHAS SÉRIES') : 
             'CONTROLE DE SAÍDAS'}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-neon-blue to-transparent rounded-full"></div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {series.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-sm p-16 rounded-[2rem] border border-white/10 text-center space-y-8 shadow-2xl">
                  <div className="bg-neon-blue/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto border border-neon-blue/20">
                    <FileText className="w-12 h-12 text-neon-blue" />
                  </div>
                  <div className="max-w-sm mx-auto">
                    <h3 className="text-2xl font-black mb-3">BEM-VINDO, PROF. THIAGO!</h3>
                    <p className="text-white/60 font-medium">Sua conta está ativa. Comece cadastrando sua primeira turma para gerenciar os adereços.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('series')}
                    className="bg-neon-blue hover:bg-neon-blue/90 text-navy-dark font-black py-4 px-10 rounded-2xl transition-all inline-flex items-center gap-3 shadow-[0_0_30px_rgba(0,242,255,0.3)]"
                  >
                    CADASTRAR PRIMEIRA SÉRIE
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="TOTAL PREVISTO" value={totals.totalGoal} icon={<DollarSign className="text-neon-blue" />} color="blue" />
                    <StatCard title="TOTAL RECEBIDO" value={totals.totalCollected} icon={<TrendingUp className="text-neon-green" />} color="green" />
                    <StatCard title="TOTAL SAÍDAS" value={totals.totalExpenses} icon={<TrendingDown className="text-neon-red" />} color="red" />
                    <StatCard title="SALDO ATUAL" value={totals.balance} icon={<AlertCircle className="text-neon-yellow" />} color="yellow" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] border border-white/10">
                      <h3 className="font-black text-xl mb-8 flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-neon-green" />
                        ARRECADAÇÃO POR SÉRIE
                      </h3>
                      <div className="space-y-6">
                        {series.map(s => {
                          const sParticipants = participants.filter(p => p.seriesId === s.id);
                          const sCollected = sParticipants.reduce((acc, p) => acc + p.paidAmount, 0);
                          const sGoal = sParticipants.length * s.accessoryValue;
                          const percent = sGoal > 0 ? (sCollected / sGoal) * 100 : 0;
                          return (
                            <div key={s.id} className="space-y-3">
                              <div className="flex justify-between text-xs font-black tracking-widest uppercase">
                                <span className="text-white/80">{s.name}</span>
                                <span className="text-neon-blue">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sCollected)} 
                                  <span className="text-white/20 mx-2">/</span>
                                  <span className="text-white/40">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sGoal)}</span>
                                </span>
                              </div>
                              <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5 p-[2px]">
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

                    <div className="bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] border border-white/10">
                      <h3 className="font-black text-xl mb-8 flex items-center gap-3">
                        <TrendingDown className="w-6 h-6 text-neon-red" />
                        ÚLTIMAS SAÍDAS
                      </h3>
                      <div className="space-y-4">
                        {expenses.slice(0, 5).map(e => (
                          <div key={e.id} className="flex justify-between items-center p-4 bg-white/2 hover:bg-white/5 rounded-2xl transition-all border border-white/5 group">
                            <div>
                              <p className="font-bold text-white/90 group-hover:text-neon-red transition-colors">{e.description}</p>
                              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">{e.date?.toDate().toLocaleDateString('pt-BR')}</p>
                            </div>
                            <span className="text-neon-red font-black text-lg">
                              -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.amount)}
                            </span>
                          </div>
                        ))}
                        {expenses.length === 0 && (
                          <div className="text-center py-12 text-white/20 font-black tracking-tighter text-2xl uppercase italic opacity-50">
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
              className="space-y-10"
            >
              <div className="bg-gradient-to-br from-neon-blue/5 to-neon-green/5 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/10 blur-[50px]"></div>
                <h3 className="font-black text-2xl mb-8 tracking-tighter italic uppercase text-neon-blue">NOVA SÉRIE DE ALUNOS</h3>
                <SeriesForm />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              className="space-y-8"
            >
              <button 
                onClick={() => setSelectedSeries(null)}
                className="flex items-center gap-3 text-neon-blue font-black text-xs uppercase tracking-widest hover:neon-text-blue transition-all mb-4 group"
              >
                <div className="bg-neon-blue/10 p-2 rounded-lg group-hover:bg-neon-blue/20 transition-all">←</div>
                Voltar para lista de séries
              </button>
              <ParticipantManager series={selectedSeries} participants={participants.filter(p => p.seriesId === selectedSeries.id)} />
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="bg-gradient-to-br from-neon-red/5 to-neon-yellow/5 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-red/10 blur-[50px]"></div>
                <h3 className="font-black text-2xl mb-8 tracking-tighter italic uppercase text-neon-red">REGISTRAR NOVA SAÍDA</h3>
                <ExpenseForm />
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/2 border-b border-white/10 uppercase font-black text-[10px] tracking-[0.2em] text-white/40">
                        <th className="px-8 py-6">Descrição</th>
                        <th className="px-8 py-6">Data</th>
                        <th className="px-8 py-6">Valor Gasto</th>
                        <th className="px-8 py-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-white/5 transition-all group">
                          <td className="px-8 py-6 font-bold text-lg text-white/90 group-hover:text-neon-red transition-colors">{e.description}</td>
                          <td className="px-8 py-6 text-white/40 font-black text-xs">{e.date?.toDate().toLocaleDateString('pt-BR')}</td>
                          <td className="px-8 py-6 font-black text-neon-red text-xl tracking-tighter">
                            -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.amount)}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleDeleteExpense(e.id)} 
                              className="bg-white/5 hover:bg-neon-red/20 text-white/20 hover:text-neon-red p-3 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {expenses.length === 0 && (
                    <div className="p-20 text-center">
                      <div className="text-white/10 font-black text-4xl uppercase italic opacity-20">Nenhum Registro de Saída</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
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
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-transparent ${
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
      className={`p-4 rounded-2xl transition-all ${active ? activeClasses[activeColor] : 'text-white/20'}`}
    >
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' }) : icon}
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
    <div className={`p-6 rounded-[1.5rem] border ${colors[color]} backdrop-blur-sm shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-white/5 p-3 rounded-xl">
          {icon}
        </div>
        <div className={`h-2 w-2 rounded-full ${textColors[color]} bg-current shadow-[0_0_8px_currentColor]`}></div>
      </div>
      <div>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className={`text-2xl font-black tracking-tighter ${textColors[color]}`}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
        </p>
      </div>
    </div>
  );
}

function SeriesForm() {
  const [name, setName] = useState('');
  const [val, setVal] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !val) return;
    try {
      await addDoc(collection(db, 'series'), {
        name,
        accessoryValue: parseFloat(val)
      });
      setName('');
      setVal('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'series');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Turma / Série</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-neon-blue outline-none transition-all text-white font-bold"
          placeholder="Ex: 6º ano, 7º ano..."
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Valor Unitário (R$)</label>
        <input 
          type="number" 
          value={val} 
          onChange={e => setVal(e.target.value)}
          className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-neon-blue outline-none transition-all text-white font-bold"
          placeholder="0,00"
        />
      </div>
      <button className="bg-neon-blue hover:bg-neon-blue/90 text-navy-dark font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.2)] active:scale-95">
        <Plus className="w-6 h-6" />
        SALVAR SÉRIE
      </button>
    </form>
  );
}

function SeriesCard({ series, participantsCount, onClick, onDelete }: { series: Series, participantsCount: number, onClick: () => void, onDelete: () => void }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] border border-white/10 hover:border-neon-blue/50 transition-all group relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/5 blur-[40px] group-hover:bg-neon-blue/10 transition-all"></div>
      
      <button 
        onClick={onDelete}
        className="absolute top-6 right-6 text-white/10 hover:text-neon-red p-2 rounded-lg hover:bg-neon-red/10 transition-all z-10"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <div className="bg-neon-blue/10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 border border-neon-blue/20">
        <Users className="w-8 h-8 text-neon-blue" />
      </div>

      <h3 className="text-2xl font-black mb-1 truncate pr-10 text-white tracking-tighter uppercase italic">{series.name}</h3>
      <div className="flex items-center gap-2 text-neon-green text-xs font-black tracking-widest uppercase mb-8">
        <span>{participantsCount} ALUNOS INSCRITOS</span>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-white/5">
        <div>
          <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] mb-1">CUSTO POR ALUNO</p>
          <p className="font-black text-2xl text-neon-blue tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(series.accessoryValue)}</p>
        </div>
        <button 
          onClick={onClick}
          className="bg-white hover:bg-neon-blue text-navy-dark px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95"
        >
          VER ALUNOS
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ParticipantManager({ series, participants }: { series: Series, participants: Participant[] }) {
  const [batchNames, setBatchNames] = useState('');
  const [addingBatch, setAddingBatch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParticipants = participants.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
          paidAmount: 0,
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

  const handleTogglePayment = async (p: Participant) => {
    const newAmount = p.paidAmount >= series.accessoryValue ? 0 : series.accessoryValue;
    try {
      await updateDoc(doc(db, 'participants', p.id), {
        paidAmount: newAmount,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `participants/${p.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('REMOVER ESTE ALUNO DO SISTEMA?')) return;
    try {
      await deleteDoc(doc(db, 'participants', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `participants/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-white/5 backdrop-blur-sm p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 blur-[50px]"></div>
        <h3 className="font-black text-2xl mb-6 flex items-center gap-3 text-neon-green italic uppercase tracking-tighter">
          <UserPlus className="w-8 h-8" />
          INSERIR ALUNOS EM LOTE
        </h3>
        <p className="text-white/40 text-sm mb-6 font-medium">Cole a lista de nomes (um por linha) para processamento instantâneo.</p>
        <textarea 
          value={batchNames}
          onChange={e => setBatchNames(e.target.value)}
          className="w-full h-40 p-6 rounded-2xl bg-navy-dark border border-white/10 focus:border-neon-green outline-none mb-6 font-mono text-sm text-white transition-all placeholder:text-white/10"
          placeholder={"Exemplo:\nJoão Silva\nMaria Oliveira\nPedro Santos..."}
        />
        <button 
          onClick={handleAddBatch}
          disabled={addingBatch || !batchNames.trim()}
          className="bg-neon-green hover:bg-neon-green/90 disabled:bg-white/5 disabled:text-white/20 text-navy-dark font-black py-4 px-10 rounded-2xl transition-all shadow-[0_0_20px_rgba(57,255,20,0.2)] active:scale-95"
        >
          {addingBatch ? 'PROCESSANDO...' : `CADASTRAR ${batchNames.split('\n').filter(n => n.trim()).length} ALUNOS AGORA`}
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h3 className="font-black text-2xl text-white tracking-tighter uppercase italic">LISTA DE ALUNOS</h3>
            <p className="text-neon-green text-[10px] font-black tracking-widest mt-1 uppercase">{participants.length} REGISTROS ENCONTRADOS</p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input 
              type="text" 
              placeholder="PESQUISAR ALUNO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/5 border-none text-sm font-bold outline-none focus:ring-2 focus:ring-neon-blue transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2 border-b border-white/5 uppercase font-black text-[10px] tracking-[0.2em] text-white/40">
                <th className="px-8 py-6">Nome Completo</th>
                <th className="px-8 py-6 text-center">Status de Pagamento</th>
                <th className="px-8 py-6">Valor Atual</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredParticipants.map(p => {
                const isPaid = p.paidAmount >= series.accessoryValue;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-8 py-6 font-bold text-lg text-white/90">{p.name}</td>
                    <td className="px-8 py-6 text-center">
                      <button
                        onClick={() => handleTogglePayment(p)}
                        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                          isPaid 
                          ? 'bg-neon-green text-navy-dark shadow-neon-green/20' 
                          : 'bg-white/5 text-white/40 border border-white/10 hover:border-neon-green hover:text-neon-green'
                        }`}
                      >
                        {isPaid ? '✓ PAGO' : 'QUITAR'}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`font-black text-xl tracking-tighter ${isPaid ? 'text-neon-green' : 'text-neon-red'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.paidAmount)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        className="bg-white/5 hover:bg-neon-red/20 text-white/20 hover:text-neon-red p-3 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredParticipants.length === 0 && (
            <div className="p-20 text-center">
              <div className="text-white/10 font-black text-4xl uppercase italic opacity-20">Nenhum Aluno Encontrado</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpenseForm() {
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !val) return;
    try {
      await addDoc(collection(db, 'expenses'), {
        description: desc,
        amount: parseFloat(val),
        date: serverTimestamp()
      });
      setDesc('');
      setVal('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Descrição da Saída</label>
        <input 
          type="text" 
          value={desc} 
          onChange={e => setDesc(e.target.value)}
          className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-neon-red outline-none transition-all text-white font-bold"
          placeholder="Ex: Tecidos, Pedrarias, Costura..."
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Valor Gasto (R$)</label>
        <input 
          type="number" 
          value={val} 
          onChange={e => setVal(e.target.value)}
          className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-neon-red outline-none transition-all text-white font-bold"
          placeholder="0,00"
        />
      </div>
      <button className="bg-neon-red hover:bg-neon-red/90 text-white font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,0,60,0.2)] active:scale-95">
        <Plus className="w-6 h-6" />
        REGISTRAR GASTO
      </button>
    </form>
  );
}
