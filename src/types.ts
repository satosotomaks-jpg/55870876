export type Category = 'finance' | 'fitness' | 'calm' | 'learning' | 'creativity';

export interface Goal {
  id: string;
  title: string;
  category: Category;
  startDate: string;
  endDate: string;
  startMetrics: Record<string, number>;
  currentMetrics: Record<string, number>;
  targetMetrics: Record<string, number>;
  progress: number;
  notes: string[];
}

export interface Quest {
  id: string;
  title: string;
  category: string;
  description: string;
  reward: number;
  xpReward: number;
  completed: boolean;
  icon: string;
}

export interface Note {
  id: string;
  text: string;
  date: string;
  goalId?: string;
  metrics?: Record<string, number>;
}

export interface Avatar {
  skin: string;
  background: string;
  purchasedSkins: string[];
  purchasedBackgrounds: string[];
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'skin' | 'background';
  price: number;
  icon: string;
  description: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  condition: string;
}

export interface UserState {
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  streak: number;
  lastActiveDate: string;
  avatar: Avatar;
  goals: Goal[];
  notes: Note[];
  completedQuestsToday: string[];
  questsDate: string;
  achievements: Achievement[];
  theme: 'dark' | 'light' | 'colorful';
  appBackground: string;
  notifications: boolean;
}

export const CATEGORIES: Record<Category, { name: string; icon: string; color: string }> = {
  finance: { name: 'Финансы', icon: '💰', color: '#feca57' },
  fitness: { name: 'Тренировки', icon: '💪', color: '#ff6b6b' },
  calm: { name: 'Спокойствие', icon: '🧘', color: '#48dbfb' },
  learning: { name: 'Обучение', icon: '📚', color: '#0abde3' },
  creativity: { name: 'Творчество', icon: '🎨', color: '#f368e0' },
};

export const QUEST_CATEGORIES = [
  { id: 'walks', name: 'Прогулки', icon: '🚶' },
  { id: 'solitude', name: 'Время наедине', icon: '🧠' },
  { id: 'meditation', name: 'Медитация', icon: '🧘' },
  { id: 'detox', name: 'Цифровой детокс', icon: '📵' },
  { id: 'social', name: 'Социальные', icon: '👥' },
  { id: 'learning', name: 'Обучение', icon: '📖' },
  { id: 'creativity', name: 'Творчество', icon: '✏️' },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'skin_warrior', name: 'Воин', type: 'skin', price: 100, icon: '🦸', description: 'Доблестный воин' },
  { id: 'skin_wizard', name: 'Маг', type: 'skin', price: 150, icon: '🧙', description: 'Мудрый маг' },
  { id: 'skin_ninja', name: 'Ниндзя', type: 'skin', price: 200, icon: '🥷', description: 'Скрытный ниндзя' },
  { id: 'skin_robot', name: 'Робот', type: 'skin', price: 250, icon: '🤖', description: 'Технологичный робот' },
  { id: 'skin_alien', name: 'Инопланетянин', type: 'skin', price: 300, icon: '👽', description: 'Из далёкой галактики' },
  { id: 'skin_dragon', name: 'Дракон', type: 'skin', price: 500, icon: '🐉', description: 'Легендарный дракон' },
  { id: 'bg_sunset', name: 'Закат', type: 'background', price: 100, icon: '🌅', description: 'Тёплые тона заката' },
  { id: 'bg_ocean', name: 'Океан', type: 'background', price: 150, icon: '🌊', description: 'Глубины океана' },
  { id: 'bg_forest', name: 'Лес', type: 'background', price: 150, icon: '🌲', description: 'Зелёный лес' },
  { id: 'bg_aurora', name: 'Аврора', type: 'background', price: 200, icon: '🌌', description: 'Северное сияние' },
  { id: 'bg_nebula', name: 'Туманность', type: 'background', price: 300, icon: '✨', description: 'Космическая туманность' },
];

export const DEFAULT_QUESTS: Omit<Quest, 'completed'>[] = [
  { id: 'q1', title: 'Утренняя прогулка 20 мин', category: 'walks', description: 'Пройдитесь на свежем воздухе', reward: 15, xpReward: 10, icon: '🚶' },
  { id: 'q2', title: '10 минут медитации', category: 'meditation', description: 'Сядьте тихо и сосредоточьтесь на дыхании', reward: 20, xpReward: 15, icon: '🧘' },
  { id: 'q3', title: 'Час без телефона', category: 'detox', description: 'Отложите все гаджеты на час', reward: 25, xpReward: 20, icon: '📵' },
  { id: 'q4', title: 'Позвонить другу', category: 'social', description: 'Свяжитесь с близким человеком', reward: 15, xpReward: 10, icon: '📞' },
  { id: 'q5', title: 'Прочитать 10 страниц', category: 'learning', description: 'Прочитайте хотя бы 10 страниц книги', reward: 20, xpReward: 15, icon: '📖' },
  { id: 'q6', title: '15 минут творчества', category: 'creativity', description: 'Рисуйте, пишите или создавайте', reward: 20, xpReward: 15, icon: '✏️' },
  { id: 'q7', title: '10 минут наедине с собой', category: 'solitude', description: 'Побудьте в тишине без отвлечений', reward: 15, xpReward: 10, icon: '🧠' },
  { id: 'q8', title: 'Прогулка 5000 шагов', category: 'walks', description: 'Наберите 5000 шагов за день', reward: 20, xpReward: 15, icon: '👟' },
  { id: 'q9', title: 'Изучить что-то новое', category: 'learning', description: 'Посмотрите обучающее видео или прочитайте статью', reward: 15, xpReward: 10, icon: '🎓' },
  { id: 'q10', title: 'Вечерняя медитация', category: 'meditation', description: 'Завершите день спокойной медитацией', reward: 20, xpReward: 15, icon: '🌙' },
  { id: 'q11', title: 'Социальное взаимодействие', category: 'social', description: 'Поговорите с кем-то лично', reward: 15, xpReward: 10, icon: '💬' },
  { id: 'q12', title: 'Творческий проект', category: 'creativity', description: 'Поработайте над своим проектом 30 мин', reward: 30, xpReward: 25, icon: '🎨' },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'Первый шаг', description: 'Выполните первый квест', icon: '🏆', unlocked: false, condition: 'first_quest' },
  { id: 'a2', title: 'Неделя силы', description: 'Серия 7 дней подряд', icon: '🔥', unlocked: false, condition: 'streak_7' },
  { id: 'a3', title: 'Месяц дисциплины', description: 'Серия 30 дней подряд', icon: '💎', unlocked: false, condition: 'streak_30' },
  { id: 'a4', title: 'Целеустремлённый', description: 'Создайте первую цель', icon: '🎯', unlocked: false, condition: 'first_goal' },
  { id: 'a5', title: 'Коллекционер', description: 'Купите 3 скина', icon: '👗', unlocked: false, condition: 'skins_3' },
  { id: 'a6', title: 'Богач', description: 'Накопите 500 монет', icon: '💰', unlocked: false, condition: 'coins_500' },
  { id: 'a7', title: 'Мастер квестов', description: 'Выполните 50 квестов', icon: '⚔️', unlocked: false, condition: 'quests_50' },
  { id: 'a8', title: 'Уровень 10', description: 'Достигните 10 уровня', icon: '⭐', unlocked: false, condition: 'level_10' },
];
