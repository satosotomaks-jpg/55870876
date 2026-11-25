import { UserState, ACHIEVEMENTS } from './types';

const STORAGE_KEY = 'life_rpg_data';

export const getDefaultState = (): UserState => ({
  level: 1,
  xp: 0,
  xpToNext: 100,
  coins: 50,
  streak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  avatar: {
    skin: '🧑',
    background: 'black',
    purchasedSkins: ['🧑', '👩', '👨', '🧑‍🦱'],
    purchasedBackgrounds: ['black', 'white', 'purple'],
  },
  goals: [],
  notes: [],
  completedQuestsToday: [],
  questsDate: new Date().toISOString().split('T')[0],
  achievements: ACHIEVEMENTS.map(a => ({ ...a })),
  theme: 'dark',
  appBackground: 'black',
  notifications: true,
});

export const loadState = (): UserState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if it's a new day, reset quests
      const today = new Date().toISOString().split('T')[0];
      if (parsed.questsDate !== today) {
        parsed.completedQuestsToday = [];
        parsed.questsDate = today;
      }
      // Update streak
      const lastActive = parsed.lastActiveDate;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastActive !== today && lastActive !== yesterday) {
        parsed.streak = 0;
      }
      return { ...getDefaultState(), ...parsed };
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return getDefaultState();
};

export const saveState = (state: UserState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state:', e);
  }
};

export const calculateXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.2, level - 1));
};

export const addXP = (state: UserState, amount: number): UserState => {
  let newXP = state.xp + amount;
  let newLevel = state.level;
  let newXPToNext = state.xpToNext;

  while (newXP >= newXPToNext) {
    newXP -= newXPToNext;
    newLevel++;
    newXPToNext = calculateXPForLevel(newLevel);
  }

  return {
    ...state,
    xp: newXP,
    level: newLevel,
    xpToNext: newXPToNext,
  };
};

export const addCoins = (state: UserState, amount: number): UserState => {
  return {
    ...state,
    coins: state.coins + amount,
  };
};

export const updateStreak = (state: UserState): UserState => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (state.lastActiveDate === today) return state;

  let newStreak = state.streak;
  if (state.lastActiveDate === yesterday) {
    newStreak++;
  } else if (state.lastActiveDate !== today) {
    newStreak = 1;
  }

  return {
    ...state,
    streak: newStreak,
    lastActiveDate: today,
  };
};

export const checkAchievements = (state: UserState): UserState => {
  const newAchievements = state.achievements.map(a => {
    if (a.unlocked) return a;
    
    let unlocked = false;
    switch (a.condition) {
      case 'first_quest':
        unlocked = state.completedQuestsToday.length > 0;
        break;
      case 'streak_7':
        unlocked = state.streak >= 7;
        break;
      case 'streak_30':
        unlocked = state.streak >= 30;
        break;
      case 'first_goal':
        unlocked = state.goals.length > 0;
        break;
      case 'skins_3':
        unlocked = state.avatar.purchasedSkins.length >= 7; // 4 default + 3 purchased
        break;
      case 'coins_500':
        unlocked = state.coins >= 500;
        break;
      case 'level_10':
        unlocked = state.level >= 10;
        break;
    }
    
    return { ...a, unlocked };
  });

  return { ...state, achievements: newAchievements };
};

export const getDaysRemaining = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const calculateProgress = (current: number, target: number, start: number): number => {
  if (target === start) return 100;
  const progress = ((current - start) / (target - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
};
