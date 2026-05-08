/* ============================================================
   units.js — Unit conversion helpers
   ============================================================ */

const Units = (() => {

  function getSystem() {
    return Store.getProfile().units || 'metric';
  }

  function isImperial() {
    return getSystem() === 'imperial';
  }

  // ─── Distance ─────────────────────────────────────────────
  // Stored as miles always (matches programme data)

  function displayDistance(miles) {
    if (!miles && miles !== 0) return '—';
    if (isImperial()) return `${miles} mi`;
    return `${(miles * 1.60934).toFixed(1)} km`;
  }

  function distanceUnit() {
    return isImperial() ? 'mi' : 'km';
  }

  function speedUnit() {
    return isImperial() ? 'mph' : 'km/h';
  }

  // ─── Weight ───────────────────────────────────────────────
  // Stored as kg

  function kgToLbs(kg) { return Math.round(kg * 2.20462 * 10) / 10; }
  function lbsToKg(lbs) { return Math.round(lbs / 2.20462 * 10) / 10; }

  function displayWeight(kg) {
    if (!kg && kg !== 0) return '—';
    if (isImperial()) return `${kgToLbs(parseFloat(kg))} lbs`;
    return `${kg} kg`;
  }

  function weightUnit() { return isImperial() ? 'lbs' : 'kg'; }

  function weightToStorage(val) {
    if (!val) return '';
    return isImperial() ? String(lbsToKg(parseFloat(val))) : String(val);
  }

  function weightFromStorage(storedKg) {
    if (!storedKg) return '';
    if (isImperial()) return String(kgToLbs(parseFloat(storedKg)));
    return String(storedKg);
  }

  // ─── Height ───────────────────────────────────────────────
  // Stored as cm

  function cmToFtIn(cm) {
    const totalIn = cm / 2.54;
    const ft      = Math.floor(totalIn / 12);
    const inch    = Math.round(totalIn % 12);
    return { ft, inch };
  }

  function ftInToCm(ft, inch) {
    return Math.round(((parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0)) * 2.54);
  }

  function heightFromStorage(storedCm) {
    if (!storedCm) return { primary: '', secondary: '' };
    if (isImperial()) {
      const { ft, inch } = cmToFtIn(parseFloat(storedCm));
      return { primary: String(ft), secondary: String(inch) };
    }
    return { primary: String(storedCm), secondary: '' };
  }

  function heightToStorage(primary, secondary) {
    if (!primary) return '';
    if (isImperial()) return String(ftInToCm(primary, secondary || 0));
    return String(primary);
  }

  return {
    getSystem,
    isImperial,
    displayDistance,
    distanceUnit,
    speedUnit,
    displayWeight,
    weightUnit,
    weightToStorage,
    weightFromStorage,
    heightFromStorage,
    heightToStorage,
  };

})();