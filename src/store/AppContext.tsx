import { v4 as uuidv4 } from 'uuid';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Todo' | 'InProgress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  deadline?: number | null;
  estimatedTime?: number | null;
  tags?: string[];
  reminderTime?: number | null;
  createdAt: number;
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'Daily' | 'Weekly';
  streak: number;
  completedDates: string[]; // array of ISO dates (YYYY-MM-DD)
  createdAt: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  progress: number;
  targetDate?: number | null;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface AppContextState {
  user: any;
  loading: boolean;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  notes: Note[];
  focusTimeMinutes: number; // For pomodoro analytics
  activeTask: Task | null;
  setActiveTask: (task: Task | null) => void;
  language: 'en' | 'vi';
  setLanguage: (lang: 'en' | 'vi') => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  login: () => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'streak' | 'completedDates'>) => Promise<void>;
  checkInHabit: (id: string, dateStr: string) => Promise<void>;
  removeHabitCheckIn: (id: string, dateStr: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateGoalProgress: (id: string, progress: number) => Promise<void>;
  addFocusTime: (minutes: number) => Promise<void>;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

const defaultState: AppContextState = {
  user: null,
  loading: true,
  tasks: [],
  habits: [],
  goals: [],
  notes: [],
  focusTimeMinutes: 0,
  activeTask: null,
  setActiveTask: () => {},
  language: 'en',
  setLanguage: () => {},
  theme: 'dark',
  setTheme: () => {},
  login: async () => {},
  loginAsGuest: () => {},
  logout: async () => {},
  addTask: async () => {},
  updateTask: async () => {},
  deleteTask: async () => {},
  addHabit: async () => {},
  checkInHabit: async () => {},
  removeHabitCheckIn: async () => {},
  deleteHabit: async () => {},
  addGoal: async () => {},
  deleteGoal: async () => {},
  updateGoalProgress: async () => {},
  addFocusTime: async () => {},
  addNote: async () => {},
  updateNote: async () => {},
  deleteNote: async () => {},
};

export const AppContext = createContext<AppContextState>(defaultState);

const getPastDateStr = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const getDefaultTasks = (): Task[] => [];

const getDefaultHabits = (): Habit[] => [];

const getDefaultGoals = (): Goal[] => [];

const getDefaultNotes = (): Note[] => [];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [focusTimeMinutes, setFocusTimeMinutes] = useState<number>(0);
  const [activeTask, setActiveTaskState] = useState<Task | null>(() => {
    const saved = localStorage.getItem('timeflow_active_task');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const setActiveTask = (task: Task | null) => {
    setActiveTaskState(task);
    if (task) {
      localStorage.setItem('timeflow_active_task', JSON.stringify(task));
    } else {
      localStorage.removeItem('timeflow_active_task');
    }
  };
  
  const [language, setLanguageState] = useState<'en'|'vi'>(() => (localStorage.getItem('timeflow_language') as 'en'|'vi') || 'en');

  const setLanguage = (lang: 'en'|'vi') => {
    localStorage.setItem('timeflow_language', lang);
    setLanguageState(lang);
  };

  const [theme, setThemeState] = useState<'dark'|'light'>(() => (localStorage.getItem('timeflow_theme') as 'dark'|'light') || 'dark');

  const setTheme = (t: 'dark'|'light') => {
    localStorage.setItem('timeflow_theme', t);
    setThemeState(t);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const loginAsGuest = () => {
    const guestObj = {
      uid: 'guest-user',
      displayName: 'Trần Việt Anh',
      email: 'demo.user@timeflow.vn',
      photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=timeflow-demo'
    };
    localStorage.setItem('timeflow_guest_user', JSON.stringify(guestObj));
    setUser(guestObj);
  };

  const logout = async () => {
    if (user?.uid === 'guest-user') {
      localStorage.removeItem('timeflow_guest_user');
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      const savedGuest = localStorage.getItem('timeflow_guest_user');
      if (savedGuest) {
        setUser(JSON.parse(savedGuest));
        setLoading(false);
      } else if (u) {
        setUser(u);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Clear any existing dummy/historic notes, habits, tasks, goals to start completely fresh
    const isWiped = localStorage.getItem('timeflow_fresh_v3');
    if (!isWiped) {
      localStorage.removeItem('timeflow_guest_tasks');
      localStorage.removeItem('timeflow_guest_habits');
      localStorage.removeItem('timeflow_guest_goals');
      localStorage.removeItem('timeflow_guest_notes');
      localStorage.removeItem('timeflow_guest_focustime');
      localStorage.setItem('timeflow_fresh_v3', 'true');
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setHabits([]);
      setGoals([]);
      setNotes([]);
      setFocusTimeMinutes(0);
      return;
    }

    if (user.uid === 'guest-user') {
      const isGuestWiped = localStorage.getItem('timeflow_guest_wipe_v10');
      if (!isGuestWiped) {
        localStorage.setItem('timeflow_guest_tasks', JSON.stringify([]));
        localStorage.setItem('timeflow_guest_habits', JSON.stringify([]));
        localStorage.setItem('timeflow_guest_goals', JSON.stringify([]));
        localStorage.setItem('timeflow_guest_notes', JSON.stringify([]));
        localStorage.setItem('timeflow_guest_focustime', '0');
        localStorage.setItem('timeflow_guest_wipe_v10', 'true');
      }

      const localTasks = localStorage.getItem('timeflow_guest_tasks');
      const localHabits = localStorage.getItem('timeflow_guest_habits');
      const localGoals = localStorage.getItem('timeflow_guest_goals');
      const localNotes = localStorage.getItem('timeflow_guest_notes');
      const localFocus = localStorage.getItem('timeflow_guest_focustime');

      if (localTasks) {
        const parsed = JSON.parse(localTasks).filter((t: any) => !t.id.startsWith('seed-'));
        setTasks(parsed);
        localStorage.setItem('timeflow_guest_tasks', JSON.stringify(parsed));
      } else {
        setTasks([]);
        localStorage.setItem('timeflow_guest_tasks', JSON.stringify([]));
      }

      if (localHabits) {
        const parsed = JSON.parse(localHabits).filter((h: any) => !h.id.startsWith('seed-'));
        setHabits(parsed);
        localStorage.setItem('timeflow_guest_habits', JSON.stringify(parsed));
      } else {
        setHabits([]);
        localStorage.setItem('timeflow_guest_habits', JSON.stringify([]));
      }

      if (localGoals) {
        const parsed = JSON.parse(localGoals).filter((g: any) => !g.id.startsWith('seed-'));
        setGoals(parsed);
        localStorage.setItem('timeflow_guest_goals', JSON.stringify(parsed));
      } else {
        setGoals([]);
        localStorage.setItem('timeflow_guest_goals', JSON.stringify([]));
      }

      if (localNotes) {
        const parsed = JSON.parse(localNotes).filter((n: any) => !n.id.startsWith('seed-'));
        setNotes(parsed);
        localStorage.setItem('timeflow_guest_notes', JSON.stringify(parsed));
      } else {
        setNotes([]);
        localStorage.setItem('timeflow_guest_notes', JSON.stringify([]));
      }

      if (localFocus) {
        setFocusTimeMinutes(Number(localFocus) === 145 ? 0 : Number(localFocus));
        localStorage.setItem('timeflow_guest_focustime', Number(localFocus) === 145 ? '0' : localFocus);
      } else {
        setFocusTimeMinutes(0);
        localStorage.setItem('timeflow_guest_focustime', '0');
      }

      return;
    }

    const unsubs: Array<() => void> = [];
    const isWipedAll = localStorage.getItem(`timeflow_complete_wipe_v10_${user.uid}`);

    unsubs.push(
      onSnapshot(collection(db, `users/${user.uid}/tasks`), (snapshot) => {
        if (!isWipedAll && !snapshot.empty) {
          snapshot.docs.forEach(async (d) => {
            try { await deleteDoc(doc(db, `users/${user.uid}/tasks`, d.id)); } catch (err) {}
          });
        }
        if (snapshot.empty || !isWipedAll) {
          setTasks([]);
        } else {
          setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/tasks`))
    );

    unsubs.push(
      onSnapshot(collection(db, `users/${user.uid}/habits`), (snapshot) => {
        if (!isWipedAll && !snapshot.empty) {
          snapshot.docs.forEach(async (d) => {
            try { await deleteDoc(doc(db, `users/${user.uid}/habits`, d.id)); } catch (err) {}
          });
        }
        if (snapshot.empty || !isWipedAll) {
          setHabits([]);
        } else {
          setHabits(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Habit)));
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/habits`))
    );

    unsubs.push(
      onSnapshot(collection(db, `users/${user.uid}/goals`), (snapshot) => {
        if (!isWipedAll && !snapshot.empty) {
          snapshot.docs.forEach(async (d) => {
            try { await deleteDoc(doc(db, `users/${user.uid}/goals`, d.id)); } catch (err) {}
          });
        }
        if (snapshot.empty || !isWipedAll) {
          setGoals([]);
        } else {
          setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/goals`))
    );

    unsubs.push(
      onSnapshot(collection(db, `users/${user.uid}/notes`), (snapshot) => {
        if (!isWipedAll && !snapshot.empty) {
          snapshot.docs.forEach(async (d) => {
            try { await deleteDoc(doc(db, `users/${user.uid}/notes`, d.id)); } catch (err) {}
          });
        }
        if (snapshot.empty || !isWipedAll) {
          setNotes([]);
        } else {
          setNotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Note)));
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/notes`))
    );

    unsubs.push(
      onSnapshot(doc(db, `users/${user.uid}/analytics/main`), (snapshot) => {
        if (!isWipedAll) {
          setDoc(doc(db, `users/${user.uid}/analytics/main`), { focusTimeMinutes: 0 }, { merge: true }).catch(() => {});
          setFocusTimeMinutes(0);
        } else {
          if (snapshot.exists()) {
            setFocusTimeMinutes(snapshot.data().focusTimeMinutes || 0);
          } else {
            setDoc(doc(db, `users/${user.uid}/analytics/main`), { focusTimeMinutes: 0 }, { merge: true });
            setFocusTimeMinutes(0);
          }
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/analytics/main`))
    );

    if (!isWipedAll) {
      localStorage.setItem(`timeflow_complete_wipe_v10_${user.uid}`, 'true');
    }

    return () => unsubs.forEach(fn => fn());
  }, [user]);

  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    const id = uuidv4();
    const newTask = {
      ...task,
      id,
      createdAt: Date.now()
    };
    if (!user) {
      setTasks(prev => [...prev, newTask]);
      return;
    }
    if (user.uid === 'guest-user') {
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      localStorage.setItem('timeflow_guest_tasks', JSON.stringify(updatedTasks));
      return;
    }
    try {
      await setDoc(doc(db, `users/${user.uid}/tasks`, id), newTask);
    } catch(err) { handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/tasks/${id}`); }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return;
    }
    if (user.uid === 'guest-user') {
      const updatedTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
      setTasks(updatedTasks);
      localStorage.setItem('timeflow_guest_tasks', JSON.stringify(updatedTasks));
      return;
    }
    try {
      await updateDoc(doc(db, `users/${user.uid}/tasks`, id), updates);
    } catch(err) { handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/tasks/${id}`); }
  };

  const deleteTask = async (id: string) => {
    if (!user) {
      setTasks(prev => prev.filter(t => t.id !== id));
      return;
    }
    if (user.uid === 'guest-user') {
      const updatedTasks = tasks.filter(t => t.id !== id);
      setTasks(updatedTasks);
      localStorage.setItem('timeflow_guest_tasks', JSON.stringify(updatedTasks));
      return;
    }
    try {
      await deleteDoc(doc(db, `users/${user.uid}/tasks`, id));
    } catch(err) { handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/tasks/${id}`); }
  };

  const addHabit = async (habit: Omit<Habit, 'id' | 'createdAt' | 'streak' | 'completedDates'>) => {
    const id = uuidv4();
    const newHabit = {
      ...habit,
      id,
      streak: 0,
      completedDates: [],
      createdAt: Date.now()
    };
    if (!user) {
      setHabits(prev => [...prev, newHabit]);
      return;
    }
    if (user.uid === 'guest-user') {
      const updated = [...habits, newHabit];
      setHabits(updated);
      localStorage.setItem('timeflow_guest_habits', JSON.stringify(updated));
      return;
    }
    try {
      await setDoc(doc(db, `users/${user.uid}/habits`, id), newHabit);
    } catch(err) { handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/habits/${id}`); }
  };

  const deleteHabit = async (id: string) => {
    if (!user) {
      setHabits(prev => prev.filter(h => h.id !== id));
      return;
    }
    if (user.uid === 'guest-user') {
      const updated = habits.filter(h => h.id !== id);
      setHabits(updated);
      localStorage.setItem('timeflow_guest_habits', JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, `users/${user.uid}/habits`, id));
    } catch(err) { handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/habits/${id}`); }
  };

  const calculateStreak = (dates: string[]) => {
    if (!dates.length) return 0;
    const sorted = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let currentStreak = 1;
    let checkDate = new Date(sorted[0]);
    checkDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = Math.abs(today.getTime() - checkDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays > 1) return 0;

    for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i-1]);
        const currDate = new Date(sorted[i]);
        const diff = Math.abs(prevDate.getTime() - currDate.getTime());
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days === 1) {
            currentStreak++;
        } else {
            break;
        }
    }
    return currentStreak;
  };

  const checkInHabit = async (id: string, dateStr: string) => {
    const h = habits.find(h => h.id === id);
    if (!h) return;
    const newDates = [...new Set([...h.completedDates, dateStr])];
    const newStreak = calculateStreak(newDates);
    
    if (!user) {
      setHabits(prev => prev.map(habit => habit.id === id ? { ...habit, completedDates: newDates, streak: newStreak } : habit));
      return;
    }
    if (user.uid === 'guest-user') {
      const updated = habits.map(habit => habit.id === id ? { ...habit, completedDates: newDates, streak: newStreak } : habit);
      setHabits(updated);
      localStorage.setItem('timeflow_guest_habits', JSON.stringify(updated));
      return;
    }
    
    try {
      await updateDoc(doc(db, `users/${user.uid}/habits`, id), {
        completedDates: newDates,
        streak: newStreak
      });
    } catch(err) { handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/habits/${id}`); }
  };

  const removeHabitCheckIn = async (id: string, dateStr: string) => {
    const h = habits.find(h => h.id === id);
    if (!h) return;
    const newDates = h.completedDates.filter(d => d !== dateStr);
    const newStreak = calculateStreak(newDates);
    
    if (!user) {
      setHabits(prev => prev.map(habit => habit.id === id ? { ...habit, completedDates: newDates, streak: newStreak } : habit));
      return;
    }
    if (user.uid === 'guest-user') {
      const updated = habits.map(habit => habit.id === id ? { ...habit, completedDates: newDates, streak: newStreak } : habit);
      setHabits(updated);
      localStorage.setItem('timeflow_guest_habits', JSON.stringify(updated));
      return;
    }
    
    try {
      await updateDoc(doc(db, `users/${user.uid}/habits`, id), {
        completedDates: newDates,
        streak: newStreak
      });
    } catch(err) { handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/habits/${id}`); }
  };

  const addGoal = async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const id = uuidv4();
    const newGoal = {
      ...goal,
      id,
      createdAt: Date.now()
    };
    if (!user) return;
    if (user.uid === 'guest-user') {
      const updated = [...goals, newGoal];
      setGoals(updated);
      localStorage.setItem('timeflow_guest_goals', JSON.stringify(updated));
      return;
    }
    try {
      await setDoc(doc(db, `users/${user.uid}/goals`, id), newGoal);
    } catch(err) { handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/goals/${id}`); }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    if (user.uid === 'guest-user') {
      const updated = goals.filter(g => g.id !== id);
      setGoals(updated);
      localStorage.setItem('timeflow_guest_goals', JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
    } catch(err) { handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/goals/${id}`); }
  };

  const updateGoalProgress = async (id: string, progress: number) => {
    if (!user) return;
    if (user.uid === 'guest-user') {
      const updated = goals.map(g => g.id === id ? { ...g, progress } : g);
      setGoals(updated);
      localStorage.setItem('timeflow_guest_goals', JSON.stringify(updated));
      return;
    }
    try {
      await updateDoc(doc(db, `users/${user.uid}/goals`, id), { progress });
    } catch(err) { handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/goals/${id}`); }
  };

  const addFocusTime = async (minutes: number) => {
    if (!user) return;
    const newFocusTime = focusTimeMinutes + minutes;
    if (user.uid === 'guest-user') {
      setFocusTimeMinutes(newFocusTime);
      localStorage.setItem('timeflow_guest_focustime', String(newFocusTime));
      return;
    }
    try {
      await setDoc(doc(db, `users/${user.uid}/analytics/main`), {
        focusTimeMinutes: newFocusTime
      }, { merge: true });
    } catch(err) { handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/analytics/main`); }
  };
  
  const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const id = uuidv4();
    const newNote = {
      ...note,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (user.uid === 'guest-user') {
      const updated = [...notes, newNote];
      setNotes(updated);
      localStorage.setItem('timeflow_guest_notes', JSON.stringify(updated));
      return;
    }
    try {
      await setDoc(doc(db, `users/${user.uid}/notes`, id), newNote);
    } catch(err) { handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/notes/${id}`); }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;
    if (user.uid === 'guest-user') {
      const updated = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n);
      setNotes(updated);
      localStorage.setItem('timeflow_guest_notes', JSON.stringify(updated));
      return;
    }
    try {
      await updateDoc(doc(db, `users/${user.uid}/notes`, id), {
        ...updates,
        updatedAt: Date.now()
      });
    } catch(err) { handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/notes/${id}`); }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    if (user.uid === 'guest-user') {
      const updated = notes.filter(n => n.id !== id);
      setNotes(updated);
      localStorage.setItem('timeflow_guest_notes', JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, `users/${user.uid}/notes`, id));
    } catch(err) { handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/notes/${id}`); }
  };

  return (
    <AppContext.Provider value={{
      user, loading,
      tasks, habits, goals, notes, focusTimeMinutes, activeTask, setActiveTask, language, setLanguage, theme, setTheme,
      login, loginAsGuest, logout,
      addTask, updateTask, deleteTask,
      addHabit, checkInHabit, removeHabitCheckIn, deleteHabit,
      addGoal, deleteGoal, updateGoalProgress,
      addFocusTime,
      addNote, updateNote, deleteNote
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
