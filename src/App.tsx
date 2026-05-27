/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import Layout from './components/Layout';
import UpdateNotification from './components/UpdateNotification';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Pomodoro = lazy(() => import('./pages/Pomodoro'));
const Habits = lazy(() => import('./pages/Habits'));
const Stats = lazy(() => import('./pages/Stats'));

function PageFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="pomodoro" element={<Pomodoro />} />
              <Route path="habits" element={<Habits />} />
              <Route path="more" element={<Stats />} />
            </Route>
          </Routes>
        </Suspense>
        
        {/* Dynamic Service Worker Update Notification Banner */}
        <UpdateNotification />
      </BrowserRouter>
    </AppProvider>
  );
}
