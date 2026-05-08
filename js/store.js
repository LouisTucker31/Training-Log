/* ============================================================
   store.js — localStorage read/write layer
   ============================================================ */

const Store = (() => {

  const KEYS = {
    CHECK_INS:      'tl_checkins',
    PROFILE:        'tl_profile',
    SMART_WORKOUTS: 'tl_smart_workouts',
  };

  // ─── Helpers ─────────────────────────────────────────────

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  }

  // ─── Profile ─────────────────────────────────────────────

  function getProfile() {
    return read(KEYS.PROFILE) || {
      name:           '',
      rhrBaseline:    null,
      programmeStart: null,
      programmeDates: {},
      avatar:         '🏋️',
      age:            '',
      gender:         '',
      height:         '',
      weight:         '',
      goal:           '',
      bjjBelt:        '',
      bjjStripes:     '',
      golfHandicap:   '',
      units:          'metric',
    };
  }

  function saveProfile(data) {
    return write(KEYS.PROFILE, data);
  }

  // ─── Check-ins ────────────────────────────────────────────

  function getAllCheckIns() {
    return read(KEYS.CHECK_INS) || {};
  }

  function getCheckIn(dateKey) {
    const all = getAllCheckIns();
    return all[dateKey] || null;
  }

  function getTodayCheckIn() {
    return getCheckIn(todayKey());
  }

  function saveCheckIn(data) {
    const all  = getAllCheckIns();
    all[todayKey()] = { ...data, date: todayKey() };
    return write(KEYS.CHECK_INS, all);
  }

  function deleteCheckIn(dateKey) {
    const all = getAllCheckIns();
    delete all[dateKey];
    return write(KEYS.CHECK_INS, all);
  }

  function clearAllData() {
    try {
      localStorage.removeItem(KEYS.CHECK_INS);
      localStorage.removeItem(KEYS.PROFILE);
      return true;
    } catch { return false; }
  }

  // ─── Smart Workouts ───────────────────────────────────────
  // Each workout: { id, name, sessionType, startDate, recurrence,
  //   recurrenceEveryDays, details: {...} }
  // recurrence: 'none' | 'weekly' | 'custom'

  function getAllSmartWorkouts() {
    return read(KEYS.SMART_WORKOUTS) || [];
  }

  function saveSmartWorkout(workout) {
    const all = getAllSmartWorkouts();
    const idx = all.findIndex(w => w.id === workout.id);
    if (idx >= 0) all[idx] = workout;
    else all.push(workout);
    return write(KEYS.SMART_WORKOUTS, all);
  }

  function deleteSmartWorkout(id, mode) {
    // mode: 'this' | 'forward' | 'all'
    // For 'this': add the date to an exceptions list on the workout
    // For 'forward': set an endDate on the workout
    // For 'all': remove entirely
    const all = getAllSmartWorkouts();
    const idx = all.findIndex(w => w.id === id);
    if (idx < 0) return false;
    if (mode === 'all') {
      all.splice(idx, 1);
    } else if (mode === 'forward') {
      const today = todayKey();
      all[idx].endDate = today;
    } else {
      const today = todayKey();
      all[idx].exceptions = all[idx].exceptions || [];
      if (!all[idx].exceptions.includes(today)) all[idx].exceptions.push(today);
    }
    return write(KEYS.SMART_WORKOUTS, all);
  }

  function deleteSmartWorkoutOnDate(id, dateStr, mode) {
    const all = getAllSmartWorkouts();
    const idx = all.findIndex(w => w.id === id);
    if (idx < 0) return false;
    if (mode === 'all') {
      all.splice(idx, 1);
    } else if (mode === 'forward') {
      all[idx].endDate = dateStr;
    } else {
      all[idx].exceptions = all[idx].exceptions || [];
      if (!all[idx].exceptions.includes(dateStr)) all[idx].exceptions.push(dateStr);
    }
    return write(KEYS.SMART_WORKOUTS, all);
  }

  function getSmartWorkoutForDate(dateStr) {
    const all = getAllSmartWorkouts();
    for (const w of all) {
      if (!w.startDate) continue;
      if (dateStr < w.startDate) continue;
      if (w.endDate && dateStr >= w.endDate) continue;
      if (w.exceptions && w.exceptions.includes(dateStr)) continue;
      if (w.recurrence === 'none') {
        if (w.startDate === dateStr) return w;
      } else if (w.recurrence === 'weekly') {
        const start = new Date(w.startDate + 'T00:00:00');
        const target = new Date(dateStr + 'T00:00:00');
        const diff = Math.round((target - start) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff % 7 === 0) return w;
      } else if (w.recurrence === 'custom') {
        const days = parseInt(w.recurrenceEveryDays) || 1;
        const start = new Date(w.startDate + 'T00:00:00');
        const target = new Date(dateStr + 'T00:00:00');
        const diff = Math.round((target - start) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff % days === 0) return w;
      }
    }
    return null;
  }

  // ─── Trend data (last N days) ─────────────────────────────

  function getRecentCheckIns(days = 30) {
    const all    = getAllCheckIns();
    const result = [];
    const today  = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push(all[key] || null);
    }

    return result;
  }

  // ─── Public ───────────────────────────────────────────────

  return {
    todayKey,
    getProfile,
    saveProfile,
    getAllCheckIns,
    getCheckIn,
    getTodayCheckIn,
    saveCheckIn,
    deleteCheckIn,
    getRecentCheckIns,
    clearAllData,
    getAllSmartWorkouts,
    saveSmartWorkout,
    deleteSmartWorkout,
    deleteSmartWorkoutOnDate,
    getSmartWorkoutForDate,
  };

})();