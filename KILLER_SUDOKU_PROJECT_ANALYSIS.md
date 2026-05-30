# 🎮 Killer Sudoku — Project Analysis

## Overview
**Killer Sudoku** is a full-stack web application built with modern technologies for playing and competing in the puzzle game "Killer Sudoku" (also known as Sumoku). It features user authentication, multiplayer duels, adventure modes, cosmetic skins, and a leaderboard system.

**Tech Stack:**
- **Frontend:** React 18.3 + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Security:** bcryptjs for password hashing
- **Deployment:** Ready for Vercel

---

## 📁 Project Structure

```
killer-sudoku/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── AdventureInventory.jsx
│   │   ├── AdventureItemIcon.jsx
│   │   └── AdventureRewardLoot.jsx
│   ├── lib/                     # Core game logic & utilities
│   │   ├── supabase.js          # Supabase client initialization
│   │   ├── api.js               # API calls (auth, stats, sessions)
│   │   ├── sudoku.js            # Puzzle generation & validation
│   │   ├── sounds.js            # Audio effects management
│   │   ├── adventure_config.js  # Adventure mode configuration
│   │   ├── adventure_items.js   # Loot & inventory system
│   │   └── grid_skins.js        # Cosmetic grid skins
│   ├── store/
│   │   └── AppContext.jsx       # Global state (Redux-like)
│   ├── pages/                   # Screen components
│   │   ├── Onboarding.jsx       # Sign up / Login
│   │   ├── Hub.jsx              # Main menu with difficulty selection
│   │   ├── GameScreen.jsx       # Core gameplay screen
│   │   ├── ResultScreen.jsx     # Post-game stats & rewards
│   │   ├── DuelScreen.jsx       # Multiplayer duel mode
│   │   ├── AdventureMode.jsx    # Campaign-style gameplay
│   │   ├── Shop.jsx             # In-game purchases
│   │   ├── Settings.jsx         # User preferences
│   │   ├── Tutorial.jsx         # Onboarding tutorial
│   │   └── TutorialPrompt.jsx   # Skip/Start tutorial dialog
│   ├── App.jsx                  # Main router component
│   └── main.jsx                 # React entry point
├── dist/                        # Build output (Vite)
├── index.html                   # HTML template
├── vite.config.js               # Vite bundler configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS for Tailwind
├── Caddyfile                    # Web server config (optional)
├── package.json                 # Dependencies & scripts
└── package-lock.json
```

---

## 🎮 Key Features

### 1. **Authentication & User Management**
- User registration with username & password
- Password hashing with bcryptjs (10 salt rounds)
- User profiles with photo URLs
- Theme preferences (dark/light mode)
- Pro subscription status

### 2. **Game Modes**

#### Classic Modes
- **Easy:** Unlimited attempts, 35 pre-filled cells, 3×3 cage groups
- **Medium:** Unlimited attempts, 25 pre-filled cells
- **Hard:** Limited attempts (1 for free users, 5 for Pro), larger cage sizes
- **Daily Challenge:** Same puzzle for all players each day (Medium difficulty, seed-based generation)

#### Special Modes
- **Adventure Mode:** Campaign with collectible items, loot rewards, and progression
- **Duel Mode:** Real-time or turn-based multiplayer competition
- **Shop System:** Purchase cosmetics and game enhancements

### 3. **Puzzle Generation Engine** (`sudoku.js`)
- Generates valid 9×9 Killer Sudoku puzzles
- **Solution generation:** Backtracking algorithm with shuffled number selection
- **Cage generation:** Random grouping of cells with sum calculations
- **Seeded randomization:** Ensures deterministic puzzle generation for daily challenges
- **Difficulty scaling:** Different cage sizes and pre-fill counts per difficulty
- **Quick test mode:** Can generate nearly-complete puzzles for testing

### 4. **Game Session Management**
- Tracks player input in real-time
- Auto-saves every 30 seconds
- Records game stats:
  - Errors made
  - Hints used
  - Time spent
  - Win/loss status
- Leaderboard integration

### 5. **Cosmetics System**
- Grid skins (visual themes)
- Custom fonts per skin
- Inventory management
- Unlockable cosmetics through adventure mode

### 6. **Sound Effects**
- Click sounds for UI interactions
- Success/failure audio
- Background music (optional)

---

## 🏗️ Architecture Patterns

### State Management (AppContext)
```javascript
// Global state structure
{
  user: { id, username, photo_url, theme, is_pro, bytes, inventory, ... },
  screen: 'hub' | 'game' | 'result' | 'settings' | 'duel' | 'adventure' | ...,
  game: { sessionId, puzzle, difficulty, isDaily },
  theme: 'dark' | 'light'
}

// Available actions
login(), logout(), startGame(), endGame(), setScreen(), setTheme(), updateUser()
```

### Puzzle Data Structure
```javascript
{
  solution: [[1,2,3,...],[...]], // Correct grid
  cages: [
    { 
      id: 0,
      cells: [[0,0], [0,1], [1,0]], // Cells in cage
      sum: 6                        // Sum constraint
    },
    ...
  ],
  cageMap: { "0,0": 0, "0,1": 0, ... }, // Cell → cage ID mapping
  prefilled: [[1,null,...],[...]],      // Starting position
  difficulty: 'easy' | 'medium' | 'hard'
}
```

### Game Session on Board
```javascript
[
  [
    { 
      value: 5,              // Player's input (null if empty)
      draft: Set(1,2,3),     // Draft mode annotations
      isError: false         // Validation error flag
    },
    ...
  ],
  ...
]
```

---

## 🔌 API Endpoints (Supabase)

### Tables
- **users** → Authentication & profile data
- **game_sessions** → Game history
- **user_stats** → Win/loss stats per difficulty
- **duel_sessions** → Multiplayer duel records
- **adventure_progress** → Campaign progression
- **leaderboards** → Global rankings
- **cosmetics** → Available skins & items

### Key Functions

#### Authentication
```javascript
registerUser(username, password, photoUrl)  // Create account
loginUser(username, password)               // Login
updateUserTheme(userId, theme)              // Save theme
updateUserPhoto(userId, photoUrl)           // Update profile
```

#### Game Sessions
```javascript
createGameSession(userId, difficulty, sudokuData)
updateGameSession(sessionId, updates)       // Auto-save
finishGameSession(sessionId, stats)         // Record result
getUserStats(userId)                        // Fetch stats
```

#### Progression
```javascript
getDailyChallengeStatus(userId)
hasCompletedDailyChallenge(userId)
getHardAttemptsToday(userId)
incrementHardAttempts(userId)
getUserBytes(userId)                        // Virtual currency
```

#### Duels & Adventure
```javascript
createDuelChallenge(challengerId, opponentId)
recordDuelResult(duelId, winnerId)
addInventoryItem(userId, itemId, rarity)
earnAdventureReward(userId, reward)
```

---

## 🎨 Styling & Theming

### Tailwind Configuration
- **Dark mode:** Class-based (`darkMode: 'class'`)
- **Custom colors:**
  - `ink` → Grayscale palette (0-900)
  - `acid` → Lime green (#c8ff00) — accent color
  - `danger` → Red (#ff3b30)
  - `warn` → Orange (#ff9f0a)
- **Custom fonts:**
  - `font-display` → Bebas Neue (titles)
  - `font-body` → DM Sans (body)
  - `font-mono` → JetBrains Mono (numbers)

### Animations
- `fade-in` → Smooth entrance effect (0.4s)

---

## 🎮 Game Controls

| Action | Control |
|--------|---------|
| Select cell | Click/Tap |
| Enter number | 1-9 keys or number buttons |
| Delete entry | Backspace / Delete key |
| Toggle draft mode | `D` key |
| Hint | Hint button (reveals one cell) |
| Surrender | Give up button |

---

## 📱 Screens/Routes

| Screen | Path | Purpose |
|--------|------|---------|
| Loading | `loading` | Initial app load |
| Onboarding | `onboarding` | Sign up / Login |
| Tutorial Prompt | `tutorial-prompt` | Skip/Start tutorial for new users |
| Tutorial | `tutorial` | Game mechanics explanation |
| Hub | `hub` | Main menu with difficulty selection |
| Game | `game` | Active puzzle gameplay |
| Result | `result` | Post-game statistics & rewards |
| Settings | `settings` | User preferences |
| Duel | `duel` | Multiplayer competition |
| Adventure | `adventure` | Campaign mode |
| Shop | `shop` | Cosmetics & upgrades |

---

## 🚀 Setup & Deployment

### Local Development
```bash
# 1. Clone and install
npm install

# 2. Create .env file
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# 3. Setup Supabase schema
# → Go to Supabase SQL Editor
# → Run supabase_schema.sql

# 4. Start dev server
npm run dev
# Open http://localhost:5173
```

### Production Build
```bash
npm run build          # Creates /dist
npm run preview        # Test production build locally
```

### Vercel Deployment
1. Push to GitHub
2. Import repository on vercel.com
3. Add environment variables in project settings
4. Deploy (automatic on every push)

### Environment Variables
```
VITE_SUPABASE_URL       (Supabase project URL)
VITE_SUPABASE_ANON_KEY  (Supabase anon key)
```

---

## 💾 Data Persistence

### Client-Side
- **localStorage:** `ks_user` → Cached user object for offline access
- **SessionStorage:** Not used (state managed via AppContext)

### Server-Side
- All game sessions, stats, leaderboards stored in Supabase PostgreSQL
- Real-time sync with server every 30 seconds during gameplay
- Graceful fallback if Supabase is unreachable (temp session IDs)

---

## 🔐 Security Features

1. **Password Hashing:** bcryptjs with 10 salt rounds
2. **Client-Side Validation:** Input constraints before submission
3. **Server-Side Validation:** Supabase RLS (Row-Level Security) policies
4. **Cheating Prevention:**
   - Server-side puzzle solution validation
   - Player input stored server-side for audit
   - Time limits on hard mode

---

## 📊 Performance Optimizations

1. **Memoization:** React.useMemo for puzzle data transformations
2. **Component Memoization:** memo() for GameScreen subcomponents
3. **Vite:** Fast ES module bundling & HMR
4. **Tailwind:** Purged CSS (only used classes included)
5. **Lazy Loading:** Pages loaded on-demand via router

---

## 🐛 Known Issues & Notes

1. **Quick Test Mode Enabled:** `QUICK_TEST_PUZZLES = false` in `sudoku.js` (set to true during development for quick testing)
2. **Graceful Degradation:** If Supabase fails, game still playable with temporary session IDs
3. **Daily Challenge Logic:** Seed-based generation ensures consistency across users
4. **Adventure Mode:** Still in development with loot system

---

## 📈 Future Enhancement Ideas

1. **Offline Play:** Service Worker + IndexedDB for offline functionality
2. **Social Features:** Friend challenges, custom lobby
3. **AI Hint System:** Suggest next best move
4. **Accessibility:** Keyboard-only play, screen reader support
5. **Mobile App:** React Native version
6. **Analytics:** Tracking player progression & difficulty distribution
7. **Replay System:** View solution step-by-step
8. **Elo Rating:** Competitive ranked mode

---

## 📞 Key Dependencies

- **react@18.3.1** — UI framework
- **@supabase/supabase-js@2.45.0** — Backend client
- **bcryptjs@2.4.3** — Password hashing
- **vite@5.4.8** — Build tool
- **tailwindcss@3.4.13** — Utility CSS
- **@vitejs/plugin-react@4.3.1** — Vite React plugin

---

## 💡 Development Tips

- Use `npm run dev` for hot-reload during development
- Check browser console for Supabase errors
- Use Supabase dashboard to inspect database directly
- Test daily puzzle consistency with different browser sessions
- Profile with React DevTools for performance issues

---

**Last Updated:** May 30, 2026  
**Project Version:** 0.1.0  
**Status:** Active Development
