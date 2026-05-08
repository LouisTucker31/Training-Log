/* ============================================================
   data.js — All hardcoded training plan data
   ============================================================ */

const TrainingData = (() => {

  // ─── Hypertrophy Workouts ─────────────────────────────────

  const WORKOUTS = {
    push: {
      label: 'Chest & Shoulders',
      exercises: [
        { name: 'Incline Smith Machine',      sets: { green: '5-6', amber: '4-5', red: '3-5' } },
        { name: 'Machine Chest Fly',          sets: { green: '5-6', amber: '4-5', red: '3-5' } },
        { name: 'Dumbbell Lateral Raise',     sets: { green: '4-5', amber: '4-5', red: '3-4' } },
        { name: 'Machine Lateral Raise',      sets: { green: '4-5', amber: '3-4', red: '3-4' } },
        { name: 'Reverse Pec Dec',            sets: { green: '4-5', amber: '3-4', red: '2-3' } },
      ]
    },
    legs: {
      label: 'Quads & Hamstrings',
      exercises: [
        { name: 'Machine Leg Extension',      sets: { green: '4-5', amber: '3-4', red: '2-3' } },
        { name: 'Plate Loaded Leg Press',     sets: { green: '4-5', amber: '3-4', red: '2-3' } },
        { name: 'Lying Hamstring Curl',       sets: { green: '4-5', amber: '3-4', red: '2-3' } },
        { name: 'Seated Calf Raise',          sets: { green: '5-6', amber: '4-5', red: '3-4' } },
        { name: 'Hanging Knee Raises',        sets: { green: '5-6', amber: '4-5', red: '3-4' } },
      ]
    },
    pull: {
      label: 'Back & Arms',
      exercises: [
        { name: 'Lat Grip Pull Down',         sets: { green: '4-5', amber: '4-5', red: '3-4' } },
        { name: 'Machine Low Row',            sets: { green: '4-5', amber: '3-4', red: '3-4' } },
        { name: 'Cable Pull Over',            sets: { green: '4-5', amber: '3-4', red: '2-3' } },
        { name: 'Alternating Dumbbell Curl',  sets: { green: '4-5', amber: '3-4', red: '2-3' } },
        { name: 'Cable Tricep Pushdown',      sets: { green: '4-5', amber: '3-4', red: '2-3' } },
      ]
    }
  };

  // ─── 18-Week Schedule ─────────────────────────────────────
  // Each week: array of 7 days [day1..day7]
  // Day types: push | legs | pull | bjj | golf | cycle | rest
  // Special flags: raceWeek, holidayWeek, golfTourWeek

  const WEEK_FLAGS = {
    4:  'golfTour',
    7:  'holiday',
    8:  'holiday',
    18: 'race',
  };

  // Cycle distances per week (Day 7) — index 0 = week 1
  const CYCLE_DISTANCES = [
    25, 30, 35, 40, 45, 50,
    0, 0,                   // W7-8 holiday
    30, 70, 35, 80, 40, 90, 45, 100,
    50, 400                 // W17-18
  ];

  // Golf focus per week (Day 4)
  const GOLF_FOCUS = [
    'Range', 'Range', 'Range', 'Golf Tour',
    'Range', 'Range',
    null, null,             // W7-8 holiday
    'Range', 'Range', 'Range', 'Range',
    'Range', 'Range', 'Range', 'Range',
    'Range', 'Race Week'
  ];

  // BJJ duration per week (Days 2 & 3) — null = rest
  const BJJ_DURATION = [
    60, 60, 60, null,       // W4 golf tour = no BJJ
    60, 60,
    null, null,             // W7-8 holiday
    60, 60, 60, 60, 60, 60, 60, 60,
    60, null                // W18 race week
  ];

  // ─── Get week info ────────────────────────────────────────

  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function getWeekNumber(programmeStart, maxWeeks) {
    if (!programmeStart) return null;
    const start    = parseLocalDate(programmeStart);
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    const week     = Math.floor(diffDays / 7) + 1;
    const limit    = maxWeeks || 18;
    return week > 0 && week <= limit ? week : null;
  }

  function getDayOfWeek(programmeStart) {
    if (!programmeStart) return null;
    const start    = parseLocalDate(programmeStart);
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    return (diffDays % 7) + 1;
  }

  // ─── Get today's session ──────────────────────────────────

  function getTodaySession(programmeStart, ragScore) {
    const week = getWeekNumber(programmeStart);
    const day  = getDayOfWeek(programmeStart);

    if (!week || !day) return { type: 'none' };

    const flag = WEEK_FLAGS[week];

    // Holiday weeks — all rest
    if (flag === 'holiday') return { type: 'rest', label: 'Rest Day', note: 'Holiday week — enjoy the break.' };

    // Race week — all race
    if (flag === 'race') return { type: 'race', label: 'Race Week', note: 'Fri–Sun cycling event. ~130 miles/day.' };

    // Golf Tour week (week 4) — special structure
    if (flag === 'golfTour') return getGolfTourDay(day, ragScore);

    // Normal week
    return getNormalDay(day, week, ragScore);
  }

  function getNormalDay(day, week, ragScore) {
    const idx = week - 1;

    switch (day) {
      case 1: return getHypertrophySession('push', ragScore);
      case 2: return getBJJSession(BJJ_DURATION[idx]);
      case 3: return getBJJSession(BJJ_DURATION[idx]);
      case 4: return getGolfSession(GOLF_FOCUS[idx]);
      case 5: return getHypertrophySession('legs', ragScore);
      case 6: return getHypertrophySession('pull', ragScore);
      case 7: return getCycleSession(CYCLE_DISTANCES[idx]);
      default: return { type: 'rest', label: 'Rest Day' };
    }
  }

  function getGolfTourDay(day, ragScore) {
    // Mon=push, Tue-Fri=golf tour, Sat=legs, Sun=pull+cycle
    switch (day) {
      case 1: return getHypertrophySession('push', ragScore);
      case 2:
      case 3:
      case 4:
      case 5: return { type: 'golf', label: 'Golf Tour', note: 'Tournament round — Tue to Fri.' };
      case 6: return getHypertrophySession('legs', ragScore);
      case 7: return getHypertrophySession('pull', ragScore);
      default: return { type: 'rest', label: 'Rest Day' };
    }
  }

  function getHypertrophySession(type, ragScore) {
    const volume = ragScore ? ragScore.toLowerCase() : 'green';
    const workout = WORKOUTS[type];
    return {
      type:      'hypertrophy',
      subtype:   type,
      label:     workout.label,
      volume,
      exercises: workout.exercises.map(e => ({
        name: e.name,
        sets: e.sets[volume],
      })),
    };
  }

  function getBJJSession(duration) {
    if (!duration) return { type: 'rest', label: 'Rest Day' };
    return { type: 'bjj', label: 'Brazilian Jiu-Jitsu', duration, note: `${duration} min session` };
  }

  function getGolfSession(focus) {
    if (!focus) return { type: 'rest', label: 'Rest Day' };
    return { type: 'golf', label: 'Golf Training', focus, note: focus };
  }

  function getCycleSession(distance) {
    if (!distance) return { type: 'rest', label: 'Rest Day' };
    return { type: 'cycle', label: 'Outdoor Cycle', distance, note: `${distance} mile ride` };
  }

  // ─── Get session for any date ─────────────────────────────

  function getSessionForDate(dateStr, programmeStart, ragScore, programme, programmeLengthWeeks) {
    if (!programmeStart) return { type: 'none' };

    // Smart programme — check store for custom workouts, otherwise rest
    if (programme === 'smart') {
      const start    = parseLocalDate(programmeStart);
      const target   = parseLocalDate(dateStr);
      const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { type: 'none' };
      const week  = Math.floor(diffDays / 7) + 1;
      const limit = programmeLengthWeeks || 52;
      if (week > limit) return { type: 'none' };
      if (typeof Store !== 'undefined') {
        const smart = Store.getSmartWorkoutForDate(dateStr);
        if (smart) return smartWorkoutToSession(smart);
      }
      return { type: 'rest', label: 'Rest Day' };
    }

    const start    = parseLocalDate(programmeStart);
    const target   = parseLocalDate(dateStr);
    const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { type: 'none' };
    const week = Math.floor(diffDays / 7) + 1;
    const day  = (diffDays % 7) + 1;
    if (week > 18) return { type: 'none' };

    const flag = WEEK_FLAGS[week];

    if (flag === 'holiday') return { type: 'rest', label: 'Rest Day', note: 'Holiday week' };
    if (flag === 'race')    return { type: 'race',  label: 'Race Week' };
    if (flag === 'golfTour') return getGolfTourDay(day, ragScore);
    return getNormalDay(day, week, ragScore);
  }

  // ─── Smart workout → session object ──────────────────────

  function smartWorkoutToSession(w) {
    const base = { smart: true, smartId: w.id, name: w.name, tag: w.tag || '', subtitle: w.subtitle || '', recurrence: w.recurrence, recurrenceEveryDays: w.recurrenceEveryDays };
    switch (w.sessionType) {
      case 'gym':     return { ...base, type: 'smart-gym',    label: w.name || 'Gym', details: w.details || {} };
      case 'sports':  return { ...base, type: 'smart-sports', label: w.name || 'Sports', details: w.details || {} };
      case 'cardio':  return { ...base, type: 'smart-cardio', label: w.name || 'Cardio', details: w.details || {} };
      case 'other':   return { ...base, type: 'smart-other',  label: w.name || 'Other', details: w.details || {} };
      default:        return { ...base, type: 'rest', label: 'Rest Day' };
    }
  }

  // ─── Public ───────────────────────────────────────────────

  return {
    WORKOUTS,
    WEEK_FLAGS,
    CYCLE_DISTANCES,
    GOLF_FOCUS,
    BJJ_DURATION,
    getWeekNumber,
    getDayOfWeek,
    getTodaySession,
    getSessionForDate,
    getHypertrophySession,
  };

})();