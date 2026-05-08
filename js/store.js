/* ============================================================
   store.js — localStorage read/write layer
   ============================================================ */

const Store = (() => {

  const KEYS = {
    CHECK_INS:    'tl_checkins',
    PROFILE:      'tl_profile',
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
  };

})();