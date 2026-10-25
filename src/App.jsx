import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Shield, Coins, Sparkles, Mail, Dices, 
  ArrowLeftRight, PlusCircle, UserCheck, UserPlus, 
  LogIn, Briefcase, CheckCircle, Trash2, Edit3, Settings, UserCog, Type, KeyRound
} from 'lucide-react';

const ADMIN_MASTER_PASSWORD = "200358#";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('player'); 

  const [siteTitle, setSiteTitle] = useState('KALOS LOCKE');
  const [newSiteTitle, setNewSiteTitle] = useState('KALOS LOCKE');

  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Estados para cambiar el Nick
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');

  const [users, setUsers] = useState([]);
  const [cards, setCards] = useState([]);
  const [inventory, setInventory] = useState([]); 
  const [trades, setTrades] = useState([]);
  const [wheelPrizes, setWheelPrizes] = useState([]);

  const [activeTab, setActiveTab] = useState('shop');
  const [spinning, setSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);

  const [editingCardId, setEditingCardId] = useState(null);
  const [newCard, setNewCard] = useState({ title: '', type: 'Pokémon', effect: '', price: 100, stock: 5, imageUrl: '' });

  const [newWheelPrize, setNewWheelPrize] = useState({ name: '', coins: 50 });
  const [newTrade, setNewTrade] = useState({ offeredPokemon: '', level: 50, requestedItem: '' });

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    try {
      const { data: config } = await supabase.from('site_config').select('*').eq('id', 1).maybeSingle();
      if (config && config.title) setSiteTitle(config.title);

      const { data: u } = await supabase.from('users').select('*');
      if (u) setUsers(u);

      const { data: c } = await supabase.from('cards').select('*');
      if (c) setCards(c);

      const { data: inv } = await supabase.from('inventory').select('*');
      if (inv) setInventory(inv);

      const { data: t } = await supabase.from('trades').select('*');
      if (t) setTrades(t);

      const { data: wp } = await supabase.from('wheel_config').select('*');
      if (wp) setWheelPrizes(wp);
    } catch (e) {
      console.error('Error al sincronizar:', e);
    }
  }

  async function handlePlayerAuth(e) {
    e.preventDefault();
    if (!emailInput || !nameInput) return alert("Por favor ingresa tu apodo y correo.");

    const formattedEmail = emailInput.trim().toLowerCase();

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', formattedEmail)
      .maybeSingle();

    if (existingUser) {
      setCurrentUser(existingUser);
      return;
    }

    const newUser = {
      email: formattedEmail,
      name: nameInput.trim(),
      role: 'player',
      status: 'pending',
      coins: 100
    };

    const { data: created, error } = await supabase.from('users').insert([newUser]).select().single();

    if (error) {
      alert("❌ Error al registrarse: " + error.message);
      return;
    }

    setCurrentUser(created || newUser);
    fetchData();
  }

  async function handleAdminAuth(e) {
    e.preventDefault();
    if (!emailInput || !adminPasswordInput) return alert("Ingresa tu correo y clave de Admin.");

    if (adminPasswordInput !== ADMIN_MASTER_PASSWORD) {
      return alert("❌ Contraseña Maestra de Administrador Incorrecta.");
    }

    const formattedEmail = emailInput.trim().toLowerCase();

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', formattedEmail)
      .maybeSingle();

    if (existingUser) {
      const { data: updated, error } = await supabase
        .from('users')
        .update({ role: 'admin', status: 'approved' })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (error) {
        alert("❌ Error al actualizar admin: " + error.message);
        return;
      }
      setCurrentUser(updated || { ...existingUser, role: 'admin', status: 'approved' });
    } else {
      const newAdmin = {
        email: formattedEmail,
        name: nameInput.trim() || 'Ezekiel (Admin)',
        role: 'admin',
        status: 'approved',
        coins: 999
      };

      const { data: created, error } = await supabase.from('users').insert([newAdmin]).select().single();
      if (error) {
        alert("❌ Error al crear admin: " + error.message);
        return;
      }
      setCurrentUser(created || newAdmin);
    }

    fetchData();
    alert("✅ ¡Bienvenido al Panel de Administrador!");
  }

  async function handleUpdateNickname(e) {
    e.preventDefault();
    if (!newNameInput.trim()) return alert("El apodo no puede estar vacío.");

    const updatedName = newNameInput.trim();
    const { error } = await supabase
      .from('users')
      .update({ name: updatedName })
      .eq('id', currentUser.id);

    if (error) {
      alert("❌ Error al actualizar el apodo: " + error.message);
      return;
    }

    setCurrentUser(prev => ({ ...prev, name: updatedName }));
    setIsEditingName(false);
    alert("✨ ¡Tu apodo ha sido actualizado con éxito!");
    fetchData();
  }

  async function handleUpdateSiteTitle(e) {
    e.preventDefault();
    if (!newSiteTitle.trim()) return;

    const formattedTitle = newSiteTitle.trim().toUpperCase();
    await supabase.from('site_config').upsert({ id: 1, title: formattedTitle });
    setSiteTitle(formattedTitle);
    alert(`✨ Título actualizado a: "${formattedTitle}"`);
    fetchData();
  }

  async function handleBuyCard(card) {
    if (currentUser.coins < card.price) return alert("❌ Monedas insuficientes.");
    if (card.stock <= 0) return alert("❌ Carta agotada.");

    const newCoins = currentUser.coins - card.price;
    setCurrentUser({ ...currentUser, coins: newCoins });

    await supabase.from('users').update({ coins: newCoins }).eq('id', currentUser.id);
    await supabase.from('cards').update({ stock: card.stock - 1 }).eq('id', card.id);

    const existingItem = inventory.find(i => i.user_id === currentUser.id && i.card_id === card.id);
    if (existingItem) {
      await supabase.from('inventory').update({ quantity: existingItem.quantity + 1 }).eq('id', existingItem.id);
    } else {
      await supabase.from('inventory').insert([{
        user_id: currentUser.id,
        card_id: card.id,
        card_title: card.title,
        card_type: card.type,
        card_effect: card.effect,
        quantity: 1
      }]);
    }

    alert(`🎉 Compraste "${card.title}".`);
    fetchData();
  }

  async function handleUseCard(item) {
    if (item.quantity <= 1) {
      await supabase.from('inventory').delete().eq('id', item.id);
    } else {
      await supabase.from('inventory').update({ quantity: item.quantity - 1 }).eq('id', item.id);
    }
    alert(`✨ Has usado 1x "${item.card_title}".`);
    fetchData();
  }

  async function approveUser(userId) {
    await supabase.from('users').update({ status: 'approved' }).eq('id', userId);
    fetchData();
  }

  async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'player' : 'admin';
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
    fetchData();
  }

  async function updateUserCoins(userId, amount) {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    const newCoins = Math.max(0, (target.coins || 0) + amount);
    await supabase.from('users').update({ coins: newCoins }).eq('id', userId);

    if (currentUser?.id === userId) {
      setCurrentUser(prev => ({ ...prev, coins: newCoins }));
    }
    fetchData();
  }

  async function handleSaveCard(e) {
    e.preventDefault();
    if (!newCard.title || newCard.price <= 0) return;

    const cardData = {
      title: newCard.title,
      type: newCard.type,
      effect: newCard.effect,
      price: Number(newCard.price),
      stock: Number(newCard.stock),
      image_url: newCard.imageUrl || 'https://via.placeholder.com/150'
    };

    if (editingCardId) {
      await supabase.from('cards').update(cardData).eq('id', editingCardId);
      setEditingCardId(null);
    } else {
      await supabase.from('cards').insert([cardData]);
    }

    setNewCard({ title: '', type: 'Pokémon', effect: '', price: 100, stock: 5, imageUrl: '' });
    setActiveTab('shop');
    fetchData();
  }

  function startEditCard(card) {
    setEditingCardId(card.id);
    setNewCard({
      title: card.title,
      type: card.type,
      effect: card.effect || '',
      price: card.price,
      stock: card.stock,
      imageUrl: card.image_url || ''
    });
    setActiveTab('creator');
  }

  async function handleDeleteCard(cardId) {
    if (confirm("¿Eliminar carta?")) {
      await supabase.from('cards').delete().eq('id', cardId);
      fetchData();
    }
  }

  async function handleAddWheelPrize(e) {
    e.preventDefault();
    if (!newWheelPrize.name) return;

    await supabase.from('wheel_config').insert([{
      name: newWheelPrize.name,
      reward_coins: Number(newWheelPrize.coins)
    }]);

    setNewWheelPrize({ name: '', coins: 50 });
    fetchData();
  }

  async function handleDeleteWheelPrize(id) {
    await supabase.from('wheel_config').delete().eq('id', id);
    fetchData();
  }

  async function handleCreateTrade(e) {
    e.preventDefault();
    if (!newTrade.offeredPokemon) return;

    await supabase.from('trades').insert([{
      user_email: currentUser.email,
      offered_pokemon: newTrade.offeredPokemon,
      level: Number(newTrade.level),
      requested_item: newTrade.requestedItem,
      status: 'open'
    }]);

    setNewTrade({ offeredPokemon: '', level: 50, requestedItem: '' });
    fetchData();
  }

  function spinWheel() {
    if (currentUser.coins < 20 || spinning || wheelPrizes.length === 0) return;
    setSpinning(true);
    setWheelResult(null);
    updateUserCoins(currentUser.id, -20);

    setTimeout(() => {
      const prize = wheelPrizes[Math.floor(Math.random() * wheelPrizes.length)];
      if (prize.reward_coins > 0) updateUserCoins(currentUser.id, prize.reward_coins);
      setWheelResult(prize.name);
      setSpinning(false);
    }, 2000);
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-yellow-400 tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8" /> {siteTitle}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Plataforma Oficial del Torneo</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setAuthView('player')}
              className={`py-3 text-xs font-bold rounded-lg transition flex flex-col items-center justify-center gap-1 ${
                authView === 'player' ? 'bg-yellow-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" /> Entrar Jugador
            </button>
            <button
              onClick={() => setAuthView('admin')}
              className={`py-3 text-xs font-bold rounded-lg transition flex flex-col items-center justify-center gap-1 ${
                authView === 'admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" /> Acceso Admin
            </button>
          </div>

          {authView === 'player' && (
            <form onSubmit={handlePlayerAuth} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase">Apodo / Nombre</label>
                <input 
                  type="text" 
                  required 
                  value={nameInput} 
                  onChange={(e) => setNameInput(e.target.value)} 
                  placeholder="Ej. Red" 
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400 text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase">Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  placeholder="tu-correo@ejemplo.com" 
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400 text-sm" 
                />
              </div>
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg">
                Entrar al Torneo
              </button>
            </form>
          )}

          {authView === 'admin' && (
            <form onSubmit={handleAdminAuth} className="space-y-4 border border-purple-500/40 p-4 rounded-xl bg-purple-950/20">
              <div>
                <label className="text-xs text-purple-300 font-semibold uppercase">Correo de Admin</label>
                <input 
                  type="email" 
                  required 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  placeholder="antimanezekiel@gmail.com" 
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-purple-400 text-sm" 
                />
              </div>
              <div>
                <label className="text-xs text-purple-300 font-semibold uppercase">Clave Maestra (200358#)</label>
                <div className="relative">
                  <input 
                    type="password" 
                    required 
                    value={adminPasswordInput} 
                    onChange={(e) => setAdminPasswordInput(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-purple-400 text-sm" 
                  />
                  <KeyRound className="w-4 h-4 text-purple-400 absolute right-3 top-4" />
                </div>
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg">
                <Shield className="w-4 h-4" /> Entrar como Administrador
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-yellow-500/30 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <Mail className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold">Acceso Pendiente</h2>
          <p className="text-slate-400 text-sm mt-2">El correo <span className="text-yellow-300 font-mono">{currentUser.email}</span> ha sido registrado.</p>
          <p className="text-slate-400 text-xs mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800">Ezekiel debe aprobar tu cuenta desde el Panel Admin.</p>
          <button onClick={() => setCurrentUser(null)} className="mt-6 text-xs text-slate-500 underline hover:text-white">Cerrar sesión</button>
        </div>
      </div>
    );
  }

  const myItems = inventory.filter(i => i.user_id === currentUser.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
          <span className="font-black text-2xl text-yellow-400 tracking-wider">{siteTitle}</span>
          
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-300 font-bold">👤 {currentUser.name}</span>
            <button 
              onClick={() => { setNewNameInput(currentUser.name); setIsEditingName(!isEditingName); }}
              className="text-xs text-yellow-400 hover:underline font-semibold ml-1"
            >
              Cambiar Nick
            </button>
          </div>

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${currentUser.role === 'admin' ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-blue-950 text-blue-300 border-blue-800'}`}>
            Rol: {currentUser.role}
          </span>
        </div>

        <nav className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          <button onClick={() => setActiveTab('shop')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'shop' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'bg-slate-800 hover:bg-slate-700'}`}>Tienda</button>
          <button onClick={() => setActiveTab('inventory')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeTab === 'inventory' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'bg-slate-800 hover:bg-slate-700'}`}>
            <Briefcase className="w-3.5 h-3.5" /> Mochila ({myItems.length})
          </button>
          <button onClick={() => setActiveTab('wheel')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'wheel' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'bg-slate-800 hover:bg-slate-700'}`}>Ruleta</button>
          <button onClick={() => setActiveTab('trades')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'trades' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'bg-slate-800 hover:bg-slate-700'}`}>Intercambios</button>
          {currentUser.role === 'admin' && (
            <>
              <button onClick={() => { setEditingCardId(null); setNewCard({ title: '', type: 'Pokémon', effect: '', price: 100, stock: 5, imageUrl: '' }); setActiveTab('creator'); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'creator' ? 'bg-yellow-500 text-slate-950 shadow-md' : 'bg-slate-800 hover:bg-slate-700'}`}>+ Carta</button>
              <button onClick={() => setActiveTab('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 hover:bg-slate-700'}`}>Admin</button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 border border-yellow-500/40 px-3 py-1.5 rounded-full shadow-inner">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-yellow-400 text-xs sm:text-sm">{currentUser.coins} Pts</span>
          </div>
          <button onClick={() => setCurrentUser(null)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition font-semibold">Salir</button>
        </div>
      </header>

      {isEditingName && (
        <div className="bg-slate-900 border-b border-yellow-500/30 px-4 sm:px-6 py-3 flex items-center justify-center">
          <form onSubmit={handleUpdateNickname} className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold text-yellow-400">Nuevo Apodo:</span>
            <input 
              type="text" 
              required 
              value={newNameInput} 
              onChange={e => setNewNameInput(e.target.value)} 
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
            />
            <button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition">
              Guardar
            </button>
            <button type="button" onClick={() => setIsEditingName(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition">
              Cancelar
            </button>
          </form>
        </div>
      )}

      <main className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex-1">
        {activeTab === 'shop' && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-slate-200">Tienda de Cartas y Objetos</h2>
            {cards.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay cartas creadas aún.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {cards.map(card => (
                  <div key={card.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-yellow-500/50 transition shadow-lg">
                    {card.image_url && (
                      <div className="h-40 w-full bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800">
                        <img src={card.image_url} alt={card.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase font-bold text-yellow-400 bg-yellow-950/50 px-2.5 py-1 rounded border border-yellow-800">{card.type}</span>
                          <span className="text-xs text-slate-400">Stock: {card.stock}</span>
                        </div>
                        <h3 className="font-bold text-lg sm:text-xl text-white mt-1">{card.title}</h3>
                        <p className="text-xs text-slate-400 mt-2 min-h-[36px]">{card.effect}</p>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                        <span className="font-bold text-base sm:text-lg text-yellow-400">{card.price} Pts</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleBuyCard(card)}
                            disabled={currentUser.coins < card.price || card.stock <= 0} 
                            className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition shadow-md"
                          >
                            Comprar
                          </button>
                          {currentUser.role === 'admin' && (
                            <>
                              <button onClick={() => startEditCard(card)} className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg text-white"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteCard(card.id)} className="bg-red-600 hover:bg-red-500 p-2 rounded-lg text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'inventory' && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-slate-200 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-yellow-400" /> Mi Mochila / Inventario
            </h2>
            {myItems.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center shadow-lg">
                <p className="text-slate-400 text-sm">Aún no has comprado objetos.</p>
                <button onClick={() => setActiveTab('shop')} className="mt-4 bg-yellow-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg shadow-md">Ir a la Tienda</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {myItems.map(item => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-yellow-400 bg-yellow-950/50 px-2 py-0.5 rounded border border-yellow-800">{item.card_type}</span>
                        <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">x{item.quantity}</span>
                      </div>
                      <h3 className="font-bold text-lg sm:text-xl text-white mt-1">{item.card_title}</h3>
                      <p className="text-xs text-slate-400 mt-2 min-h-[36px]">{item.card_effect}</p>
                    </div>
                    <div className="mt-6 border-t border-slate-800 pt-4">
                      <button onClick={() => handleUseCard(item)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1 shadow-md">
                        <CheckCircle className="w-3.5 h-3.5" /> Usar Carta
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'creator' && currentUser.role === 'admin' && (
          <section className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" /> {editingCardId ? 'Editar Carta' : 'Crear Nueva Carta'}
            </h2>
            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Título</label>
                <input type="text" required value={newCard.title} onChange={e => setNewCard({ ...newCard, title: e.target.value })} placeholder="Ej. Caramelo Raro" className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Tipo</label>
                  <select value={newCard.type} onChange={e => setNewCard({ ...newCard, type: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400">
                    <option value="Pokémon">Pokémon</option>
                    <option value="Objeto">Objeto</option>
                    <option value="Estado">Estado</option>
                    <option value="Batalla">Batalla</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Precio (Monedas)</label>
                  <input type="number" required value={newCard.price} onChange={e => setNewCard({ ...newCard, price: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Stock Inicial</label>
                  <input type="number" required value={newCard.stock} onChange={e => setNewCard({ ...newCard, stock: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">URL Imagen</label>
                  <input type="text" value={newCard.imageUrl} onChange={e => setNewCard({ ...newCard, imageUrl: e.target.value })} placeholder="https://..." className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Descripción / Efecto</label>
                <textarea value={newCard.effect} onChange={e => setNewCard({ ...newCard, effect: e.target.value })} placeholder="¿Qué hace esta carta?" className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400 h-24" />
              </div>
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg transition uppercase text-sm shadow-md">
                {editingCardId ? 'Guardar Cambios' : 'Publicar Carta'}
              </button>
            </form>
          </section>
        )}

        {activeTab === 'wheel' && (
          <section className="max-w-md mx-auto text-center bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2 flex items-center justify-center gap-2"><Dices className="w-6 h-6" /> Ruleta Kalos</h2>
            <p className="text-xs text-slate-400 mb-6">Costo por giro: <span className="text-yellow-400 font-bold">20 Monedas</span></p>
            <div className={`w-48 h-48 mx-auto mb-6 rounded-full border-8 border-yellow-500 flex items-center justify-center bg-slate-950 shadow-inner transition-transform duration-1000 ${spinning ? 'animate-spin' : ''}`}>
              <Sparkles className="w-16 h-16 text-yellow-400" />
            </div>
            {wheelResult && (
              <div className="bg-slate-950 border border-yellow-500/50 p-4 rounded-xl mb-6 shadow-md">
                <p className="text-xs text-slate-400">¡Ganaste!</p>
                <p className="text-lg font-bold text-yellow-400 mt-1">{wheelResult}</p>
              </div>
            )}
            <button onClick={spinWheel} disabled={spinning || currentUser.coins < 20} className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold py-3 rounded-lg transition uppercase text-sm shadow-md">
              {spinning ? 'Girando...' : 'Girar Ruleta'}
            </button>
          </section>
        )}

        {activeTab === 'trades' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h3 className="font-bold text-lg mb-4 text-yellow-400 flex items-center gap-2"><ArrowLeftRight className="w-5 h-5" /> Ofrecer Pokémon</h3>
              <form onSubmit={handleCreateTrade} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Pokémon Ofrecido</label>
                  <input type="text" required placeholder="Ej. Lucario" value={newTrade.offeredPokemon} onChange={e => setNewTrade({ ...newTrade, offeredPokemon: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Nivel</label>
                  <input type="number" value={newTrade.level} onChange={e => setNewTrade({ ...newTrade, level: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Pido a cambio</label>
                  <input type="text" required placeholder="Ej. Objeto Revivir" value={newTrade.requestedItem} onChange={e => setNewTrade({ ...newTrade, requestedItem: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                </div>
                <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg transition text-xs uppercase shadow-md">Publicar</button>
              </form>
            </div>

            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h3 className="font-bold text-lg mb-4 text-slate-200">Ofertas Publicadas</h3>
              {trades.length === 0 ? (
                <p className="text-slate-500 text-xs py-8 text-center">No hay intercambios activos.</p>
              ) : (
                <div className="space-y-3">
                  {trades.map(trade => (
                    <div key={trade.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-500">{trade.user_email}</span>
                        <p className="font-bold text-yellow-400 text-base">{trade.offered_pokemon} <span className="text-xs text-slate-400">(Nv. {trade.level})</span></p>
                        <p className="text-xs text-slate-300 mt-1">Busca: <span className="text-slate-100 font-semibold">{trade.requested_item}</span></p>
                      </div>
                      <button className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-lg font-bold transition shadow-sm">Aceptar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <div className="space-y-8">
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Type className="w-6 h-6" /> Título de la Plataforma en Tiempo Real
              </h2>
              <form onSubmit={handleUpdateSiteTitle} className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  required 
                  placeholder="Ej. KALOS LOCKE / ULTRALOCKE" 
                  value={newSiteTitle} 
                  onChange={e => setNewSiteTitle(e.target.value)} 
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" 
                />
                <button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-6 py-3 rounded-lg text-xs uppercase shadow-md">
                  Guardar Nombre
                </button>
              </form>
            </section>

            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2"><Shield className="w-6 h-6" /> Gestión de Jugadores y Admins</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(u => (
                  <div key={u.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-bold text-sm text-white">{u.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.status === 'approved' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                          {u.status === 'approved' ? 'Aprobado' : 'Pendiente'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${u.role === 'admin' ? 'bg-purple-950 text-purple-300' : 'bg-slate-800 text-slate-300'}`}>
                          {u.role}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">{u.coins || 0} Pts</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {u.status === 'pending' && (
                        <button onClick={() => approveUser(u.id)} className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-sm">
                          <UserCheck className="w-3.5 h-3.5" /> Aprobar
                        </button>
                      )}
                      {u.email !== 'antimanezekiel@gmail.com' && (
                        <button onClick={() => toggleUserRole(u.id, u.role)} className="bg-purple-700 hover:bg-purple-600 text-xs px-2 py-1 rounded font-bold flex items-center justify-center gap-1 text-white shadow-sm">
                          <UserCog className="w-3.5 h-3.5" /> {u.role === 'admin' ? 'Quitar' : 'Hacer Admin'}
                        </button>
                      )}
                      <div className="flex gap-1">
                        <button onClick={() => updateUserCoins(u.id, 50)} className="bg-yellow-600 hover:bg-yellow-500 text-xs px-2 py-1 rounded font-bold shadow-sm">+50</button>
                        <button onClick={() => updateUserCoins(u.id, -50)} className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded font-bold shadow-sm">-50</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2"><Settings className="w-6 h-6" /> Premios de la Ruleta</h2>
              <form onSubmit={handleAddWheelPrize} className="flex flex-col sm:flex-row gap-4 mb-6">
                <input type="text" required placeholder="Premio (Ej. Carta Rara)" value={newWheelPrize.name} onChange={e => setNewWheelPrize({ ...newWheelPrize, name: e.target.value })} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                <input type="number" required placeholder="Monedas" value={newWheelPrize.coins} onChange={e => setNewWheelPrize({ ...newWheelPrize, coins: e.target.value })} className="w-full sm:w-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-400" />
                <button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-6 py-3 rounded-lg text-xs uppercase shadow-md">Agregar</button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wheelPrizes.map(p => (
                  <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-bold text-sm text-white">{p.name}</p>
                      <p className="text-xs text-yellow-400 mt-1">Premio: {p.reward_coins} Pts</p>
                    </div>
                    <button onClick={() => handleDeleteWheelPrize(p.id)} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg shadow-sm"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
