import { useState, useEffect, useCallback } from 'react';
import { UserState, Goal, Note, Category, CATEGORIES, QUEST_CATEGORIES, DEFAULT_QUESTS, SHOP_ITEMS, Quest } from './types';
import { loadState, saveState, addXP, addCoins, updateStreak, checkAchievements, getDaysRemaining, calculateProgress } from './store';

type Screen = 'home' | 'goals' | 'quests' | 'shop' | 'notes' | 'profile';

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🎮' });
  }
}

export default function App() {
  const [state, setState] = useState<UserState>(loadState);
  const [screen, setScreen] = useState<Screen>('home');
  const [toast, setToast] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);

  // Save state on every change
  useEffect(() => {
    saveState(state);
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state]);

  // Update streak on load
  useEffect(() => {
    const updated = updateStreak(state);
    if (updated.streak !== state.streak || updated.lastActiveDate !== state.lastActiveDate) {
      setState(updated);
    }
    // Request notification permission
    requestNotificationPermission();
    
    // Check if user missed a day
    const lastActive = state.lastActiveDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastActive !== yesterday && lastActive !== new Date().toISOString().split('T')[0]) {
      if (state.streak > 0) {
        setTimeout(() => showToast('😢 Серия прервалась! Не пропускай дни!'), 1000);
      }
    }
    
    // Schedule daily reminder
    if (state.notifications) {
      const now = new Date();
      const reminderTime = new Date();
      reminderTime.setHours(20, 0, 0, 0);
      if (reminderTime > now) {
        const timeout = reminderTime.getTime() - now.getTime();
        setTimeout(() => {
          sendNotification('Life RPG 🎮', 'Не забудь выполнить квесты сегодня! 🔥');
        }, timeout);
      }
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateState = useCallback((updater: (prev: UserState) => UserState) => {
    setState(prev => {
      const newState = updater(prev);
      return checkAchievements(newState);
    });
  }, []);

  // Goal management
  const addGoal = (goal: Goal) => {
    updateState(prev => ({ ...prev, goals: [...prev.goals, goal] }));
    showToast('🎯 Цель создана!');
  };

  const updateGoalProgress = (goalId: string, metrics: Record<string, number>) => {
    updateState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id !== goalId) return g;
        const progress = calculateProgress(
          Object.values(metrics)[0] || 0,
          Object.values(g.targetMetrics)[0] || 100,
          Object.values(g.startMetrics)[0] || 0
        );
        return { ...g, currentMetrics: metrics, progress };
      }),
    }));
  };

  const deleteGoal = (goalId: string) => {
    updateState(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== goalId) }));
    showToast('🗑️ Цель удалена');
  };

  // Quest management
  const completeQuest = (quest: Quest) => {
    if (state.completedQuestsToday.includes(quest.id)) return;
    updateState(prev => {
      let newState = { ...prev, completedQuestsToday: [...prev.completedQuestsToday, quest.id] };
      newState = addCoins(newState, quest.reward);
      newState = addXP(newState, quest.xpReward);
      
      // Bonus: update goals progress slightly for related category quests
      const categoryMap: Record<string, Category> = {
        learning: 'learning',
        creativity: 'creativity',
        meditation: 'calm',
        walks: 'fitness',
        solitude: 'calm',
      };
      const goalCat = categoryMap[quest.category];
      if (goalCat) {
        newState = {
          ...newState,
          goals: newState.goals.map(g => {
            if (g.category !== goalCat) return g;
            const newProgress = Math.min(100, g.progress + 2);
            return { ...g, progress: newProgress };
          }),
        };
      }
      
      return newState;
    });
    showToast(`+${quest.reward} 🪙 +${quest.xpReward} XP`);
    
    // Check for level up
    const newXP = state.xp + quest.xpReward;
    if (newXP >= state.xpToNext) {
      setTimeout(() => showToast(`🎉 Уровень ${state.level + 1}! Поздравляем!`), 500);
    }
  };

  // Note management
  const addNote = (note: Note) => {
    updateState(prev => ({ ...prev, notes: [note, ...prev.notes] }));
    showToast('📝 Заметка добавлена');
  };

  // Shop
  const buyItem = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (state.coins < item.price) {
      showToast('❌ Недостаточно монет!');
      return;
    }
    updateState(prev => {
      let newState = { ...prev, coins: prev.coins - item.price };
      if (item.type === 'skin') {
        newState.avatar = { ...prev.avatar, purchasedSkins: [...prev.avatar.purchasedSkins, item.icon] };
      } else {
        const bgMap: Record<string, string> = { bg_sunset: 'sunset', bg_ocean: 'ocean', bg_forest: 'forest', bg_aurora: 'aurora', bg_nebula: 'nebula' };
        newState.avatar = { ...prev.avatar, purchasedBackgrounds: [...prev.avatar.purchasedBackgrounds, bgMap[item.id] || item.id] };
      }
      return newState;
    });
    showToast(`✨ Куплено: ${item.name}!`);
  };

  const setAppBackground = (bg: string) => {
    updateState(prev => ({ ...prev, appBackground: bg }));
  };

  const setAvatarSkin = (skin: string) => {
    updateState(prev => ({ ...prev, avatar: { ...prev.avatar, skin } }));
  };

  const setTheme = (theme: 'dark' | 'light' | 'colorful') => {
    updateState(prev => ({ ...prev, theme }));
  };

  // Render
  return (
    <div className={`app-bg app-bg-${state.appBackground}`} style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Toast */}
      {toast && (
        <div className="notification-toast">
          <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>{toast}</p>
        </div>
      )}

      {/* Header */}
      <header style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar-container" style={{ width: '44px', height: '44px', fontSize: '22px', cursor: 'pointer' }} onClick={() => setScreen('profile')}>
            {state.avatar.skin}
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Lv.{state.level}</span> Герой
            </p>
            <div className="progress-bar progress-glow" style={{ width: '80px', height: '5px', marginTop: '4px' }}>
              <div className="progress-bar-fill" style={{ width: `${(state.xp / state.xpToNext) * 100}%` }} />
            </div>
            <p style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>{state.xp}/{state.xpToNext} XP</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {state.streak > 0 && <span className="streak-badge streak-fire">🔥 {state.streak}</span>}
          <span className="coin-badge" style={{ transition: 'transform 0.2s ease' }}>🪙 {state.coins}</span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '0 16px', animation: 'fadeIn 0.3s ease' }} key={screen}>
        {screen === 'home' && <HomeScreen state={state} setScreen={setScreen} />}
        {screen === 'goals' && (
          <GoalsScreen
            state={state}
            addGoal={addGoal}
            updateGoalProgress={updateGoalProgress}
            deleteGoal={deleteGoal}
            showModal={showGoalModal}
            setShowModal={setShowGoalModal}
          />
        )}
        {screen === 'quests' && <QuestsScreen state={state} completeQuest={completeQuest} />}
        {screen === 'shop' && (
          <ShopScreen
            state={state}
            buyItem={buyItem}
            setAppBackground={setAppBackground}
            setAvatarSkin={setAvatarSkin}
            showAvatarEditor={showAvatarEditor}
            setShowAvatarEditor={setShowAvatarEditor}
          />
        )}
        {screen === 'notes' && (
          <NotesScreen
            state={state}
            addNote={addNote}
            showModal={showNoteModal}
            setShowModal={setShowNoteModal}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            state={state}
            setTheme={setTheme}
            setAppBackground={setAppBackground}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid rgba(124, 58, 237, 0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 12px',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        {[
          { id: 'home' as Screen, icon: '🏠', label: 'Главная' },
          { id: 'goals' as Screen, icon: '🎯', label: 'Цели' },
          { id: 'quests' as Screen, icon: '⚔️', label: 'Квесты' },
          { id: 'shop' as Screen, icon: '🛒', label: 'Магазин' },
          { id: 'notes' as Screen, icon: '📝', label: 'Дневник' },
        ].map(item => (
          <div
            key={item.id}
            className={`nav-item ${screen === item.id ? 'active' : ''}`}
            onClick={() => setScreen(item.id)}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}

// ===== HOME SCREEN =====
function HomeScreen({ state, setScreen }: { state: UserState; setScreen: (s: Screen) => void }) {
  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const questsCompleted = state.completedQuestsToday.length;
  const totalQuests = DEFAULT_QUESTS.length;

  // Generate streak calendar (last 7 days)
  const streakDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    const dateStr = date.toISOString().split('T')[0];
    const isActive = dateStr === state.lastActiveDate || 
      (i === 6 && dateStr === new Date().toISOString().split('T')[0]);
    return { date: dateStr, active: isActive, day: date.getDate() };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Welcome with animated avatar */}
      <div className="card" style={{ background: 'var(--gradient-1)', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.1 }}>⚔️</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="animate-float" style={{ fontSize: '48px' }}>{state.avatar.skin}</div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '2px', textTransform: 'capitalize' }}>{today}</p>
            <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Привет, Герой!</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
              {state.streak > 0 ? `🔥 Серия: ${state.streak} дней!` : '🌟 Начни свою серию!'}
            </p>
          </div>
        </div>
        
        {/* Streak Calendar */}
        {state.streak > 0 && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '8px' }}>Последние 7 дней</p>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
              {streakDays.map((d, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    background: d.active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)',
                    border: d.active ? '2px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {d.active ? '✓' : d.day}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '24px' }}>⚔️</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{questsCompleted}/{totalQuests}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Квесты</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '24px' }}>🎯</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{state.goals.length}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Цели</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '24px' }}>⭐</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>Ур. {state.level}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Прогресс</p>
        </div>
      </div>

      {/* XP Progress */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Опыт до уровня {state.level + 1}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{state.xp}/{state.xpToNext} XP</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${(state.xp / state.xpToNext) * 100}%` }} />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="card hover-lift" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setScreen('quests')}>
          <p style={{ fontSize: '28px', marginBottom: '6px' }}>⚔️</p>
          <p style={{ fontSize: '13px', fontWeight: 600 }}>Квесты</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{totalQuests - questsCompleted} осталось</p>
          {questsCompleted === totalQuests && totalQuests > 0 && (
            <p style={{ fontSize: '10px', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>✅ Все выполнены!</p>
          )}
        </div>
        <div className="card hover-lift" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setScreen('goals')}>
          <p style={{ fontSize: '28px', marginBottom: '6px' }}>🎯</p>
          <p style={{ fontSize: '13px', fontWeight: 600 }}>Цели</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{state.goals.length} активных</p>
        </div>
      </div>

      {/* Quick Quest - Next uncompleted */}
      {questsCompleted < totalQuests && (
        <div className="card" style={{ background: 'rgba(124,58,237,0.05)', border: '1px dashed rgba(124,58,237,0.3)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>💡 Следующий квест:</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>
                {DEFAULT_QUESTS.find(q => !state.completedQuestsToday.includes(q.id))?.icon}
              </span>
              <p style={{ fontSize: '13px', fontWeight: 500 }}>
                {DEFAULT_QUESTS.find(q => !state.completedQuestsToday.includes(q.id))?.title}
              </p>
            </div>
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setScreen('quests')}>
              Начать →
            </button>
          </div>
        </div>
      )}

      {/* Active Goals Preview */}
      {state.goals.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px', padding: '0 4px' }}>Активные цели</h3>
          {state.goals.slice(0, 3).map(goal => (
            <div className="card" key={goal.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{CATEGORIES[goal.category].icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{goal.title}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getDaysRemaining(goal.endDate)} дн.</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${goal.progress}%` }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>{goal.progress}%</p>
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      {state.achievements.some(a => a.unlocked) && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px', padding: '0 4px' }}>Достижения</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {state.achievements.filter(a => a.unlocked).map(a => (
              <div key={a.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{a.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== GOALS SCREEN =====
function GoalsScreen({ state, addGoal, updateGoalProgress, deleteGoal, showModal, setShowModal }: {
  state: UserState;
  addGoal: (g: Goal) => void;
  updateGoalProgress: (id: string, m: Record<string, number>) => void;
  deleteGoal: (id: string) => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const filteredGoals = selectedCategory === 'all'
    ? state.goals
    : state.goals.filter(g => g.category === selectedCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>🎯 Мои цели</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '8px 16px', fontSize: '13px' }}>
          + Новая
        </button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }} className="scrollbar-hide">
        <button
          className={`tab-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Все
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            className={`tab-btn ${selectedCategory === key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(key as Category)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Пока нет целей. Создайте первую!</p>
        </div>
      ) : (
        filteredGoals.map(goal => (
          <div key={goal.id} className="card" style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>{CATEGORIES[goal.category].icon}</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{goal.title}</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Осталось: {getDaysRemaining(goal.endDate)} дней • Дедлайн: {new Date(goal.endDate).toLocaleDateString('ru-RU')}
                </p>
                <div className="progress-bar" style={{ marginBottom: '4px' }}>
                  <div className="progress-bar-fill" style={{ width: `${goal.progress}%` }} />
                </div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>{goal.progress}%</p>
              </div>
              <button
                onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
              >
                {selectedGoal === goal.id ? '▼' : '▶'}
              </button>
            </div>

            {/* Expanded Goal Details */}
            {selectedGoal === goal.id && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(124,58,237,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {Object.entries(goal.currentMetrics).map(([key, val]) => (
                    <div key={key} style={{ fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{key}: </span>
                      <span style={{ fontWeight: 600 }}>{val}</span>
                      <span style={{ color: 'var(--text-secondary)' }}> / {goal.targetMetrics[key]}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                    onClick={() => {
                      const key = Object.keys(goal.currentMetrics)[0];
                      const newVal = prompt(`Обновите "${key}":`, String(goal.currentMetrics[key]));
                      if (newVal !== null) {
                        updateGoalProgress(goal.id, { ...goal.currentMetrics, [key]: Number(newVal) });
                      }
                    }}
                  >
                    📊 Обновить
                  </button>
                  <button
                    onClick={() => { if (confirm('Удалить цель?')) deleteGoal(goal.id); }}
                    style={{ padding: '8px 12px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px', cursor: 'pointer', color: '#ff6b6b', fontSize: '12px' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Goal Modal */}
      {showModal && <GoalModal onClose={() => setShowModal(false)} onAdd={addGoal} />}
    </div>
  );
}

// ===== GOAL MODAL =====
function GoalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (g: Goal) => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('finance');
  const [endDate, setEndDate] = useState('');
  const [metricName, setMetricName] = useState('');
  const [startValue, setStartValue] = useState('');
  const [targetValue, setTargetValue] = useState('');

  const metricPresets: Record<Category, { name: string; unit: string }[]> = {
    finance: [{ name: 'Доход', unit: '₽' }, { name: 'Накопления', unit: '₽' }],
    fitness: [{ name: 'Вес', unit: 'кг' }, { name: 'Подтягивания', unit: 'раз' }],
    calm: [{ name: 'Уровень стресса', unit: '/10' }, { name: 'Часы сна', unit: 'ч' }],
    learning: [{ name: 'Прочитано книг', unit: 'шт' }, { name: 'Пройдено курсов', unit: 'шт' }],
    creativity: [{ name: 'Работ создано', unit: 'шт' }, { name: 'Часы практики', unit: 'ч' }],
  };

  const handleSubmit = () => {
    if (!title || !endDate) return;
    const mKey = metricName || metricPresets[category][0].name;
    const sVal = Number(startValue) || 0;
    const tVal = Number(targetValue) || 100;

    const goal: Goal = {
      id: Date.now().toString(),
      title,
      category,
      startDate: new Date().toISOString().split('T')[0],
      endDate,
      startMetrics: { [mKey]: sVal },
      currentMetrics: { [mKey]: sVal },
      targetMetrics: { [mKey]: tVal },
      progress: 0,
      notes: [],
    };
    onAdd(goal);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🎯 Новая цель</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Название</label>
            <input className="input-field" placeholder="Например: Накопить 100000₽" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Категория</label>
            <select className="input-field" value={category} onChange={e => setCategory(e.target.value as Category)}>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Дата завершения</label>
            <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <div style={{ padding: '12px', background: 'rgba(124,58,237,0.05)', borderRadius: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>📊 Стартовый замер</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input className="input-field" placeholder="Метрика (напр. Вес)" value={metricName} onChange={e => setMetricName(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input className="input-field" placeholder="Старт" type="number" value={startValue} onChange={e => setStartValue(e.target.value)} />
                <input className="input-field" placeholder="Цель" type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
              {metricPresets[category].map(p => (
                <button key={p.name} onClick={() => { setMetricName(p.name); }} style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={handleSubmit} style={{ width: '100%', marginTop: '8px' }}>
            Создать цель ✨
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== QUESTS SCREEN =====
function QuestsScreen({ state, completeQuest }: { state: UserState; completeQuest: (q: Quest) => void }) {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const quests = DEFAULT_QUESTS.map(q => ({
    ...q,
    completed: state.completedQuestsToday.includes(q.id),
  }));

  const filtered = selectedCat === 'all' ? quests : quests.filter(q => q.category === selectedCat);
  const completed = quests.filter(q => q.completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>⚔️ Квесты</h2>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{completed}/{quests.length} выполнено</span>
      </div>

      {/* Progress */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>Прогресс дня</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{Math.round((completed / quests.length) * 100)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${(completed / quests.length) * 100}%` }} />
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }} className="scrollbar-hide">
        <button className={`tab-btn ${selectedCat === 'all' ? 'active' : ''}`} onClick={() => setSelectedCat('all')}>Все</button>
        {QUEST_CATEGORIES.map(cat => (
          <button key={cat.id} className={`tab-btn ${selectedCat === cat.id ? 'active' : ''}`} onClick={() => setSelectedCat(cat.id)}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Quest List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((quest, index) => (
          <div
            key={quest.id}
            className={`quest-item ${quest.completed ? 'completed' : ''} card-entrance`}
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => !quest.completed && completeQuest(quest)}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              background: quest.completed ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)',
              flexShrink: 0,
            }}>
              {quest.completed ? '✅' : quest.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{quest.title}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quest.description}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: '#feca57', fontWeight: 600 }}>+{quest.reward} 🪙</span>
                <span style={{ fontSize: '10px', color: '#4facfe', fontWeight: 600 }}>+{quest.xpReward} XP</span>
              </div>
            </div>
            {!quest.completed && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '2px solid rgba(124,58,237,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}>
                <span style={{ fontSize: '10px', color: 'var(--accent)' }}>→</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== SHOP SCREEN =====
function ShopScreen({ state, buyItem, setAppBackground, setAvatarSkin, showAvatarEditor, setShowAvatarEditor }: {
  state: UserState;
  buyItem: (id: string) => void;
  setAppBackground: (bg: string) => void;
  setAvatarSkin: (skin: string) => void;
  showAvatarEditor: boolean;
  setShowAvatarEditor: (v: boolean) => void;
}) {
  const [tab, setTab] = useState<'skins' | 'backgrounds'>('skins');

  const allSkins = ['🧑', '👩', '👨', '🧑‍🦱', '🦸', '🧙', '🥷', '🤖', '👽', '🐉'];
  const allBackgrounds = ['black', 'white', 'purple', 'sunset', 'ocean', 'forest', 'aurora', 'nebula'];
  const bgNames: Record<string, string> = { black: '🖤 Чёрный', white: '🤍 Белый', purple: '💜 Фиолетовый', sunset: '🌅 Закат', ocean: '🌊 Океан', forest: '🌲 Лес', aurora: '🌌 Аврора', nebula: '✨ Туманность' };
  const bgPrices: Record<string, number> = { black: 0, white: 0, purple: 0, sunset: 100, ocean: 150, forest: 150, aurora: 200, nebula: 300 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>🛒 Магазин</h2>
        <span className="coin-badge">🪙 {state.coins}</span>
      </div>

      {/* Avatar Preview */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="avatar-container" style={{ margin: '0 auto 12px', width: '90px', height: '90px', fontSize: '45px' }}>
          {state.avatar.skin}
        </div>
        <button className="btn-primary" onClick={() => setShowAvatarEditor(!showAvatarEditor)} style={{ padding: '8px 20px', fontSize: '13px' }}>
          ✏️ Редактор аватара
        </button>
      </div>

      {/* Avatar Editor */}
      {showAvatarEditor && (
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Выберите аватар</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allSkins.map(skin => {
              const owned = state.avatar.purchasedSkins.includes(skin);
              const selected = state.avatar.skin === skin;
              return (
                <div
                  key={skin}
                  className={`skin-option ${selected ? 'selected' : ''} ${!owned ? 'locked' : ''}`}
                  onClick={() => owned && setAvatarSkin(skin)}
                >
                  {skin}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className={`tab-btn ${tab === 'skins' ? 'active' : ''}`} onClick={() => setTab('skins')}>👤 Скины</button>
        <button className={`tab-btn ${tab === 'backgrounds' ? 'active' : ''}`} onClick={() => setTab('backgrounds')}>🎨 Фоны</button>
      </div>

      {/* Shop Items */}
      {tab === 'skins' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {SHOP_ITEMS.filter(i => i.type === 'skin').map((item, index) => {
            const owned = state.avatar.purchasedSkins.includes(item.icon);
            const canAfford = state.coins >= item.price;
            return (
              <div key={item.id} className="card hover-lift" style={{ textAlign: 'center', padding: '16px 12px', animationDelay: `${index * 0.05}s` }}>
                <div style={{
                  fontSize: '36px',
                  marginBottom: '8px',
                  filter: !owned && !canAfford ? 'grayscale(0.5)' : 'none',
                  transition: 'transform 0.2s ease',
                }}>
                  {item.icon}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{item.description}</p>
                {owned ? (
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>✓ Куплено</span>
                ) : (
                  <button
                    className="btn-primary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      width: '100%',
                      opacity: canAfford ? 1 : 0.5,
                    }}
                    onClick={() => buyItem(item.id)}
                    disabled={!canAfford}
                  >
                    🪙 {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'backgrounds' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {allBackgrounds.map(bg => {
            const owned = state.avatar.purchasedBackgrounds.includes(bg);
            const active = state.appBackground === bg;
            const price = bgPrices[bg];
            const shopItem = SHOP_ITEMS.find(i => i.id === `bg_${bg}`);

            return (
              <div key={bg} className="card" style={{ textAlign: 'center', padding: '16px 12px', border: active ? '2px solid var(--accent)' : '1px solid rgba(124,58,237,0.1)' }}>
                <div style={{ width: '100%', height: '40px', borderRadius: '8px', marginBottom: '8px' }} className={`app-bg-${bg}`} />
                <p style={{ fontSize: '12px', fontWeight: 600 }}>{bgNames[bg]}</p>
                {active ? (
                  <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>✓ Активен</span>
                ) : owned ? (
                  <button onClick={() => setAppBackground(bg)} style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '8px', cursor: 'pointer', color: 'var(--accent)', width: '100%', marginTop: '6px' }}>
                    Применить
                  </button>
                ) : (
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', width: '100%', marginTop: '6px' }} onClick={() => buyItem(shopItem?.id || '')}>
                    🪙 {price}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== NOTES SCREEN =====
function NotesScreen({ state, addNote, showModal, setShowModal }: {
  state: UserState;
  addNote: (n: Note) => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>📝 Дневник</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '8px 16px', fontSize: '13px' }}>
          + Запись
        </button>
      </div>

      {state.notes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📝</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Записей пока нет. Добавьте первую!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Group notes by date */}
          {(() => {
            const grouped: Record<string, Note[]> = {};
            state.notes.forEach(note => {
              const dateKey = new Date(note.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
              if (!grouped[dateKey]) grouped[dateKey] = [];
              grouped[dateKey].push(note);
            });
            
            return Object.entries(grouped).map(([dateKey, notes]) => (
              <div key={dateKey}>
                <div style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{dateKey}</p>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(124,58,237,0.1)' }} />
                </div>
                {notes.map((note, idx) => (
                  <div key={note.id} className="card card-entrance" style={{ marginBottom: '8px', marginLeft: '16px', borderLeft: '2px solid var(--accent)', animationDelay: `${idx * 0.05}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {new Date(note.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {note.goalId && (
                        <span style={{ fontSize: '10px', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: '6px', color: 'var(--accent)', fontWeight: 500 }}>
                          🎯 {state.goals.find(g => g.id === note.goalId)?.title || 'Цель'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>{note.text}</p>
                    {note.metrics && Object.keys(note.metrics).length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {Object.entries(note.metrics).map(([k, v]) => (
                          <span key={k} style={{ fontSize: '11px', background: 'rgba(124,58,237,0.08)', padding: '3px 10px', borderRadius: '8px', fontWeight: 500 }}>
                            📊 {k}: <strong>{v}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      )}

      {showModal && <NoteModal goals={state.goals} onClose={() => setShowModal(false)} onAdd={addNote} />}
    </div>
  );
}

// ===== NOTE MODAL =====
function NoteModal({ goals, onClose, onAdd }: { goals: Goal[]; onClose: () => void; onAdd: (n: Note) => void }) {
  const [text, setText] = useState('');
  const [goalId, setGoalId] = useState<string>('');
  const [metricKey, setMetricKey] = useState('');
  const [metricVal, setMetricVal] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      text,
      date: new Date().toISOString(),
      goalId: goalId || undefined,
      metrics: metricKey && metricVal ? { [metricKey]: Number(metricVal) } : undefined,
    };
    onAdd(note);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📝 Новая запись</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            className="input-field"
            placeholder="Ваши мысли, результаты, наблюдения..."
            rows={4}
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ resize: 'vertical' }}
          />
          {goals.length > 0 && (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Привязать к цели (опционально)</label>
              <select className="input-field" value={goalId} onChange={e => setGoalId(e.target.value)}>
                <option value="">Без привязки</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{CATEGORIES[g.category].icon} {g.title}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ padding: '12px', background: 'rgba(124,58,237,0.05)', borderRadius: '12px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>📊 Замер (опционально)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input className="input-field" placeholder="Параметр" value={metricKey} onChange={e => setMetricKey(e.target.value)} />
              <input className="input-field" placeholder="Значение" type="number" value={metricVal} onChange={e => setMetricVal(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" onClick={handleSubmit} style={{ width: '100%' }}>
            Сохранить ✨
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== PROFILE SCREEN =====
function ProfileScreen({ state, setTheme, setAppBackground }: {
  state: UserState;
  setTheme: (t: 'dark' | 'light' | 'colorful') => void;
  setAppBackground: (bg: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700 }}>👤 Профиль</h2>

      {/* Character Card */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="avatar-container" style={{ margin: '0 auto 12px', width: '100px', height: '100px', fontSize: '50px' }}>
          {state.avatar.skin}
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Уровень {state.level}</h3>
        <div className="progress-bar" style={{ margin: '8px auto', maxWidth: '200px' }}>
          <div className="progress-bar-fill" style={{ width: `${(state.xp / state.xpToNext) * 100}%` }} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{state.xp}/{state.xpToNext} XP</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div className="card hover-lift" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '22px' }}>🔥</p>
          <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{state.streak}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Дней подряд</p>
        </div>
        <div className="card hover-lift" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '22px' }}>🪙</p>
          <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{state.coins}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Монет</p>
        </div>
        <div className="card hover-lift" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '22px' }}>📝</p>
          <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{state.notes.length}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Записей</p>
        </div>
      </div>

      {/* Level Progress Card */}
      <div className="card" style={{ background: 'var(--gradient-3)', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>Уровень {state.level}</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>→ Уровень {state.level + 1}</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'rgba(255,255,255,0.8)', borderRadius: '4px', width: `${(state.xp / state.xpToNext) * 100}%`, transition: 'width 0.5s ease' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '6px', textAlign: 'center' }}>
          {state.xp} / {state.xpToNext} XP
        </p>
      </div>

      {/* Theme */}
      <div className="card">
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🎨 Тема оформления</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['dark', 'light', 'colorful'] as const).map(t => (
            <button
              key={t}
              className={`tab-btn ${state.theme === t ? 'active' : ''}`}
              onClick={() => setTheme(t)}
              style={{ flex: 1 }}
            >
              {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '🌈'} {t === 'dark' ? 'Тёмная' : t === 'light' ? 'Светлая' : 'Цветная'}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600 }}>🏆 Достижения</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {state.achievements.filter(a => a.unlocked).length}/{state.achievements.length}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {state.achievements.map(a => (
            <div key={a.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              background: a.unlocked ? 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.02) 100%)' : 'rgba(124,58,237,0.02)',
              borderRadius: '10px',
              opacity: a.unlocked ? 1 : 0.5,
              border: a.unlocked ? '1px solid rgba(124,58,237,0.15)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                background: a.unlocked ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.05)',
              }}>
                {a.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>{a.title}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.description}</p>
              </div>
              {a.unlocked && (
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Background Selection */}
      <div className="card">
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🖼️ Фон приложения</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {['black', 'white', 'purple', 'sunset', 'ocean', 'forest', 'aurora', 'nebula'].map(bg => {
            const owned = state.avatar.purchasedBackgrounds.includes(bg);
            if (!owned) return null;
            return (
              <div
                key={bg}
                onClick={() => setAppBackground(bg)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: state.appBackground === bg ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                className={`app-bg-${bg}`}
              />
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <div className="card" style={{ textAlign: 'center' }}>
        <button
          onClick={() => {
            if (confirm('Вы уверены? Все данные будут удалены!')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          style={{ padding: '10px 20px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '12px', cursor: 'pointer', color: '#ff6b6b', fontSize: '13px', fontWeight: 500 }}
        >
          🗑️ Сбросить все данные
        </button>
      </div>
    </div>
  );
}
