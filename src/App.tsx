/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Pomodoro from './pages/Pomodoro';
import Habits from './pages/Habits';
import Stats from './pages/Stats';
import UpdateNotification from './components/UpdateNotification';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="pomodoro" element={<Pomodoro />} />
            <Route path="habits" element={<Habits />} />
            <Route path="more" element={<Stats />} />
          </Route>
        </Routes>
        
        {/* Dynamic Service Worker Update Notification Banner */}
        <UpdateNotification />
      </BrowserRouter>
    </AppProvider>
  );
}
