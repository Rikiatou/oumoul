# Oumoul App — Full Audit & Score

**Date:** 2026-02-17  
**Current Score: 68/100**

---

## What's Working Well (strengths)

| Area | Score | Notes |
|------|-------|-------|
| Auth flow (login, register, verify, forgot password) | 9/10 | Solid, auto-persists session via SecureStore |
| GPS auto-detection (prayer, qibla, hijri) | 9/10 | Works everywhere, cached, auto-refresh |
| Prayer times calculation | 8/10 | Full method/madhab config, offline cache |
| Quran reader | 8/10 | Arabic + translation, font size, bookmarks, last-read, tafsir inline, audio |
| Dhikr module | 7/10 | Categories, count, favorites, history, haptics |
| Ramadan tracker | 7/10 | Day tracking, fasting log, cycle tracking, makeup plan |
| Hijri calendar | 7/10 | Month nav, events, notification scheduling |
| Qibla compass | 6/10 | Shows direction, but static needle (no real compass) |
| Notifications | 7/10 | Adhan x5, Suhoor, Iftar, Dhikr morning/evening |
| Navigation & UX | 7/10 | Clean tabs, pull-to-refresh, skeleton loading |

---

## ISSUES FOUND — Text, Colors, Arabic Display

### 1. Arabic Text Styling (HIGH PRIORITY)

**Quran screen (`imane-quran.tsx`)**
- `arabicText` style: `color: '#1A1A1A'` (near-black) — **OK but could be richer**
- `fontFamily: undefined` — **NO Arabic font specified!** Falls back to system default
- `fontWeight: '400'` — too thin for Arabic script with diacritics
- `lineHeight: arabic * 1.8` — good spacing
- Bismillah: `fontSize: 26, color: accent (green)` — **good**
- **MISSING:** No dedicated Arabic font (e.g., Amiri, Scheherazade, KFGQPC Uthmanic)
- **MISSING:** Arabic text color should be distinct from translation (currently both dark)

**Dhikr screen (`dhikr.tsx`)**
- `arabicText` style: `color: '#1A1A1A', fontSize: 20, lineHeight: 34`
- `fontFamily: undefined` — **same issue, no Arabic font**
- In read mode bumps to `fontSize: 24, lineHeight: 40` — better but still no proper font
- `translitText`: italic, `color: rgba(26,26,26,0.55)` — OK but low contrast
- `translationText`: `color: rgba(26,26,26,0.55)` — **too similar to transliteration**

### 2. Color Hierarchy Issues

**Dashboard (`dashboard.tsx`)**
- `ds_c.bg: '#FAF5EF'` (warm cream) — nice
- `ds_c.text: '#1A1A1A'` — good contrast
- `ds_c.textSoft: 'rgba(26,26,26,0.55)'` — **borderline low contrast** on cream bg
- `ds_c.muted: 'rgba(26,26,26,0.35)'` — **fails WCAG AA** on cream background
- `hijri` label: `fontSize: 12, color: muted (0.35 opacity)` — **too faint**

**Quran (`imane-quran.tsx`)**
- `q_c.textSoft: 'rgba(26,26,26,0.6)'` — used for translation text — **OK but could be darker**
- `q_c.muted: 'rgba(26,26,26,0.35)'` — used for surah meta, cardinal labels — **too faint**

**Dhikr (`dhikr.tsx`)**
- `dk_c.textSoft: 'rgba(26,26,26,0.55)'` — transliteration AND translation same color — **no visual hierarchy**
- Source text: `fontSize: 11, color: muted` — barely visible

**Tafsir (`tafsir.tsx`)**
- `resultText`: `fontSize: 16, lineHeight: 26, color: '#1A1A1A'` — **good**
- But no Arabic verse shown alongside tafsir — **missing context**

### 3. Font Size Issues

- Hijri date on dashboard: `fontSize: 12` — too small for important info
- Prayer times in list: readable but no visual weight difference between prayer name and time
- Dhikr source text: `fontSize: 11` — barely readable
- Surah meta in Quran list: `fontSize: 12, color: muted` — hard to read

---

## MISSING FEATURES (what would get us to 100)

### Content & Data (would add +12 points)
- [ ] **No Arabic font loaded** — biggest visual gap. Need Amiri or Uthmanic Hafs font
- [ ] **Tafsir doesn't show the Arabic verse** alongside the commentary
- [ ] **No Dua of the Day** on home screen — easy win for engagement
- [ ] **No Ayah of the Day** on home screen
- [ ] **Dhikr content is API-dependent** — no offline fallback for the actual duas/adhkar text

### UX & Polish (would add +8 points)
- [ ] **Qibla has no real compass** — just a static needle at calculated angle. Muslim Pro uses device magnetometer for live compass
- [ ] **No countdown timer** to next prayer on home screen (just shows time)
- [ ] **No prayer time comparison** (today vs yesterday, sunrise/sunset)
- [ ] **No dark mode** support
- [ ] **No app language switcher** in settings (only at registration)

### Notifications & Engagement (would add +5 points)
- [ ] **No Jumu'ah (Friday) reminder** — very common in Islamic apps
- [ ] **No "last third of night" reminder** for Tahajjud
- [ ] **No weekly progress summary** notification
- [ ] **Notification sounds** — Adhan sound file referenced but may not be bundled

### Accessibility & Standards (would add +4 points)
- [ ] **Muted text fails WCAG AA** contrast ratio on cream backgrounds
- [ ] **No RTL layout support** for Arabic locale users
- [ ] **No accessibility labels** on interactive elements
- [ ] **No error boundaries** on individual sections (one crash takes down whole screen)

### Technical Debt (would add +3 points)
- [ ] Dashboard is 1665 lines — should be split into smaller components
- [ ] Color constants duplicated across every screen (dk_c, q_c, tf_c, etc.)
- [ ] No centralized theme/design tokens
- [ ] Hardcoded Ramadan dates (`2026-02-18`) — should be dynamic from Hijri calendar

---

## PRIORITY FIX LIST (biggest impact, least effort)

1. **Load an Arabic font** (Amiri/Scheherazade) — transforms Quran & Dhikr reading
2. **Fix text contrast** — bump muted from 0.35→0.5, textSoft from 0.55→0.65
3. **Distinct colors for Arabic vs transliteration vs translation** in Dhikr
4. **Add Dua/Ayah of the Day** card on home screen
5. **Add prayer countdown timer** on next prayer card
6. **Add Jumu'ah reminder** notification
7. **Show Arabic verse in Tafsir** result
8. **Centralize color tokens** into one theme file

---

## Score Breakdown

| Category | Current | Potential | Gap |
|----------|---------|-----------|-----|
| Core features | 42/50 | 50/50 | -8 |
| UI/UX polish | 12/20 | 20/20 | -8 |
| Content quality | 6/15 | 15/15 | -9 |
| Accessibility | 3/5 | 5/5 | -2 |
| Technical quality | 5/10 | 10/10 | -5 |
| **TOTAL** | **68/100** | **100/100** | **-32** |
