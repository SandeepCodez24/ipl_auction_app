# IPL Auction & Team Rating System - Comprehensive Implementation Plan

## 1. Project Overview & Technology Stack

### Core Technologies
- **Frontend**:
  - React 18+ (Vite 5.x for lightning-fast HMR)
  - TailwindCSS 3.x with JIT compiler
  - Framer Motion for animations
  - React Query for state management and caching
  - Socket.io-client for WebSocket communication
  - Zustand for lightweight global state
  - React Hook Form for form management

- **Backend**:
  - Flask 3.x (Python 3.11+)
  - Flask-SocketIO with eventlet/gevent for async
  - PyMongo with motor (async driver)
  - Redis for session management and caching
  - Celery for background tasks
  - JWT for authentication

- **Database**:
  - MongoDB 7.x (Primary data store)
  - Redis 7.x (Caching, pub/sub, session store)

- **Infrastructure**:
  - Docker & Docker Compose for containerization
  - Nginx as reverse proxy
  - PM2 for process management
  - AWS S3/Cloudinary for player images

### Design Philosophy
- **Glassmorphism UI**: Frosted glass effects with backdrop blur
- **Dark Mode First**: High contrast with neon accents (#00F5FF, #FF00FF, #FFD700)
- **Micro-interactions**: Haptic feedback, smooth transitions
- **Responsive**: Mobile-first approach (320px to 4K)

---

## 2. Complete Architecture & Data Flow

### System Architecture Diagram
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   React Client  │◄───────►│   Nginx Proxy    │◄───────►│  Flask Server   │
│   (Port 5173)   │  HTTP   │   (Port 80/443)  │  uWSGI  │   (Port 5000)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                                                          │
         │ WebSocket (Socket.IO)                                   │
         └──────────────────────────────────────────────────────────┘
                                                                    │
                    ┌───────────────────────────────────────────────┼─────────┐
                    │                                               │         │
              ┌─────▼──────┐                              ┌────────▼──────┐  │
              │  MongoDB    │                              │     Redis     │  │
              │  (Port 27017)│                              │  (Port 6379)  │  │
              └─────────────┘                              └───────────────┘  │
                                                                              │
                                                                    ┌─────────▼──────┐
                                                                    │  Celery Worker │
                                                                    │  (Background)  │
                                                                    └────────────────┘
```

### Data Flow Sequence
1. **User Authentication**: JWT token issued → Stored in httpOnly cookie
2. **Room Creation**: REST API → MongoDB write → Redis cache invalidation
3. **Auction Start**: WebSocket `start_auction` → Server validates → Broadcast to room
4. **Bid Placement**: Client emits `place_bid` → Server validates (budget, timing) → Updates state → Broadcasts `new_bid` to all clients
5. **Player Sold**: Timer expires → Server calculates winner → Updates Teams & Room → Emits `player_sold` → Loads next player

---

## 3. Database Schema Design

### MongoDB Collections

#### 3.1 Players Collection
```javascript
{
  _id: ObjectId("..."),
  player_id: "PLR_001", // Unique identifier
  name: "Virat Kohli",
  country: "India",
  role: "Batsman", // Batsman, Bowler, All-Rounder, Wicket-Keeper
  batting_style: "Right-Hand Bat",
  bowling_style: "Right-Arm Medium", // null if pure batsman

  // Auction Details
  base_price: 20000000, // ₹2 Crore in paise
  sold_price: null, // Updated when sold
  status: "available", // available, sold, unsold, withdrawn

  // Career Statistics (Last 3 years IPL)
  stats: {
    batting: {
      matches: 45,
      innings: 44,
      runs: 1853,
      average: 48.76,
      strike_rate: 138.45,
      hundreds: 5,
      fifties: 12,
      highest_score: 113,
      balls_faced: 1337,
      fours: 178,
      sixes: 67
    },
    bowling: {
      matches: 45,
      innings: 12,
      wickets: 8,
      economy: 8.45,
      average: 34.5,
      strike_rate: 24.5,
      best_figures: "2/18",
      overs: 48.3,
      maidens: 0,
      runs_conceded: 410,
      four_wicket_hauls: 0,
      five_wicket_hauls: 0
    },
    fielding: {
      catches: 23,
      run_outs: 5,
      stumpings: 0
    }
  },

  // Advanced Metrics
  advanced_metrics: {
    impact_rating: 8.7, // Out of 10
    consistency_score: 85, // 0-100
    pressure_index: 7.8, // Performance in high-stakes matches
    injury_risk: "Low", // Low, Medium, High
    form_trend: "Improving", // Improving, Stable, Declining
    power_play_strike_rate: 145.3,
    death_overs_economy: 9.2,
    overseas_player: false
  },

  // Media
  image_url: "https://cdn.example.com/players/virat_kohli.jpg",
  thumbnail_url: "https://cdn.example.com/players/thumbs/virat_kohli.jpg",

  // Metadata
  created_at: ISODate("2024-01-15T10:00:00Z"),
  updated_at: ISODate("2024-01-20T15:30:00Z")
}
```

#### 3.2 Users Collection
```javascript
{
  _id: ObjectId("..."),
  user_id: "USR_12345",
  username: "cricketfan_99",
  email: "user@example.com",
  password_hash: "$2b$12$...", // bcrypt hashed

  profile: {
    display_name: "Cricket Fan",
    avatar_url: "https://cdn.example.com/avatars/default.png",
    favorite_team: "Mumbai Indians",
    join_date: ISODate("2024-01-10T08:00:00Z")
  },

  // User Stats
  stats: {
    auctions_participated: 15,
    auctions_won: 3,
    total_spent: 1500000000, // Total across all auctions
    best_team_rating: 92.5,
    average_team_rating: 78.3
  },

  // Preferences
  preferences: {
    notifications_enabled: true,
    sound_effects: true,
    auto_bid_increment: 500000, // ₹5 Lakh
    theme: "dark" // dark, light, auto
  },

  // Authentication
  refresh_token: "...",
  last_login: ISODate("2024-02-05T12:00:00Z"),
  is_active: true,
  is_verified: true,

  created_at: ISODate("2024-01-10T08:00:00Z"),
  updated_at: ISODate("2024-02-05T12:00:00Z")
}
```

#### 3.3 Auction Rooms Collection
```javascript
{
  _id: ObjectId("..."),
  room_id: "ROOM_ABC123",
  room_name: "IPL 2025 Mega Auction",
  room_code: "ABC123", // 6-digit join code

  // Room Configuration
  config: {
    max_teams: 10,
    purse_amount: 10000000000, // ₹100 Crore per team
    min_squad_size: 18,
    max_squad_size: 25,
    max_overseas: 8,
    min_overseas: 0,
    max_retention: 6,
    auction_type: "standard", // standard, accelerated, mini

    // Bidding Rules
    bid_increment: 500000, // ₹5 Lakh minimum increment
    timer_duration: 60, // seconds per player
    timer_warning: 10, // seconds before alarm
    auto_extend: true, // Extend timer on last-second bids
    extension_duration: 15, // Additional seconds

    // Advanced Rules
    right_to_match: false, // RTM cards
    rtm_cards_per_team: 0,
    silent_auction_rounds: 0
  },

  // Room State
  status: "active", // waiting, active, paused, completed, abandoned
  current_phase: "auction", // lobby, auction, review, completed

  // Auction Progress
  auction_state: {
    current_player_id: "PLR_042",
    current_player_index: 41, // 0-indexed
    total_players: 200,
    players_sold: 35,
    players_unsold: 6,

    // Current Bidding
    current_bid: 15000000, // ₹1.5 Crore
    current_bidder_team_id: "TEAM_003",
    bid_history: [
      {
        team_id: "TEAM_001",
        team_name: "Mumbai Mavericks",
        amount: 10000000,
        timestamp: ISODate("2024-02-05T14:30:15Z")
      },
      {
        team_id: "TEAM_003",
        team_name: "Chennai Challengers",
        amount: 15000000,
        timestamp: ISODate("2024-02-05T14:30:22Z")
      }
    ],

    // Timer
    timer_started_at: ISODate("2024-02-05T14:30:10Z"),
    timer_ends_at: ISODate("2024-02-05T14:31:10Z"),
    timer_paused: false,
    extensions_used: 1
  },

  // Participants
  teams: [
    {
      team_id: "TEAM_001",
      team_name: "Mumbai Mavericks",
      owner_user_id: "USR_12345",
      owner_username: "cricketfan_99",
      logo_url: "https://cdn.example.com/logos/team_001.png",
      primary_color: "#004BA0",
      secondary_color: "#FFD700",

      // Budget Management
      initial_purse: 10000000000,
      remaining_purse: 7250000000,
      spent_amount: 2750000000,

      // Squad
      squad: [
        {
          player_id: "PLR_001",
          player_name: "Virat Kohli",
          role: "Batsman",
          bought_for: 200000000,
          is_retained: false,
          is_overseas: false,
          acquired_at: ISODate("2024-02-05T14:15:00Z")
        }
        // ... more players
      ],

      // Squad Composition
      composition: {
        total_players: 13,
        batsmen: 5,
        bowlers: 4,
        all_rounders: 3,
        wicket_keepers: 1,
        overseas_players: 3
      },

      // Real-time Metrics
      team_rating: 82.5,
      balance_score: 78.0,
      is_active: true,
      last_bid_at: ISODate("2024-02-05T14:30:22Z")
    }
    // ... more teams
  ],

  // Player Pool
  player_pool: ["PLR_001", "PLR_002", ...], // All available player IDs
  sold_players: ["PLR_001", "PLR_015", ...],
  unsold_players: ["PLR_078", "PLR_142", ...],
  remaining_players: ["PLR_042", "PLR_043", ...], // Queue

  // Room Settings
  host_user_id: "USR_12345",
  co_hosts: ["USR_67890"],
  is_public: true,
  password_protected: false,
  password_hash: null,

  // Timestamps
  created_at: ISODate("2024-02-05T13:00:00Z"),
  started_at: ISODate("2024-02-05T14:00:00Z"),
  completed_at: null,
  last_activity: ISODate("2024-02-05T14:30:22Z")
}
```

#### 3.4 Completed Auctions (History)
```javascript
{
  _id: ObjectId("..."),
  room_id: "ROOM_ABC123",
  snapshot_taken_at: ISODate("2024-02-05T16:00:00Z"),

  // Full snapshot of final state
  final_teams: [...], // Complete team data
  auction_summary: {
    total_players_sold: 180,
    total_players_unsold: 20,
    total_money_spent: 90000000000,
    average_price_per_player: 500000000,
    highest_sale: {
      player_id: "PLR_001",
      player_name: "Virat Kohli",
      sold_to: "TEAM_001",
      amount: 200000000
    },
    lowest_sale: {
      player_id: "PLR_189",
      player_name: "Unknown Player",
      sold_to: "TEAM_008",
      amount: 2000000
    }
  },

  winning_team: {
    team_id: "TEAM_003",
    team_name: "Chennai Challengers",
    final_rating: 94.5
  },

  // Full audit log
  complete_bid_log: [...] // All bids in chronological order
}
```

---

## 4. API Endpoints - Complete Specification

### 4.1 Authentication APIs

#### `POST /api/auth/register`
**Request Body:**
```json
{
  "username": "cricketfan_99",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "display_name": "Cricket Fan"
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "user_id": "USR_12345",
    "username": "cricketfan_99",
    "email": "user@example.com"
  }
}
```

#### `POST /api/auth/login`
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "user_id": "USR_12345",
    "username": "cricketfan_99",
    "display_name": "Cricket Fan",
    "avatar_url": "..."
  }
}
```

#### `POST /api/auth/refresh`
**Headers:** `Authorization: Bearer {refresh_token}`
**Response (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGc..."
}
```

#### `POST /api/auth/logout`
**Headers:** `Authorization: Bearer {access_token}`
**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 4.2 Player APIs

#### `GET /api/players`
**Query Parameters:**
- `role`: Batsman, Bowler, All-Rounder, Wicket-Keeper
- `country`: India, Australia, England, etc.
- `min_price`: Minimum base price (in paise)
- `max_price`: Maximum base price
- `status`: available, sold, unsold
- `overseas`: true/false
- `sort_by`: name, base_price, rating
- `order`: asc, desc
- `page`: 1
- `limit`: 50

**Response (200):**
```json
{
  "success": true,
  "data": {
    "players": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_count": 500,
      "per_page": 50
    }
  }
}
```

#### `GET /api/players/:player_id`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "player": {...} // Full player object
  }
}
```

#### `GET /api/players/search`
**Query Parameters:**
- `q`: Search query (name, country)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "count": 15
  }
}
```

### 4.3 Room Management APIs

#### `POST /api/rooms/create`
**Request Body:**
```json
{
  "room_name": "IPL 2025 Mega Auction",
  "config": {
    "max_teams": 10,
    "purse_amount": 10000000000,
    "timer_duration": 60,
    "auction_type": "standard"
    // ... other config options
  },
  "is_public": true,
  "password": "optional_password"
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "room_id": "ROOM_ABC123",
    "room_code": "ABC123",
    "room": {...}
  }
}
```

#### `GET /api/rooms`
**Query Parameters:**
- `status`: waiting, active, completed
- `is_public`: true/false
- `page`: 1
- `limit`: 20

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rooms": [...],
    "pagination": {...}
  }
}
```

#### `GET /api/rooms/:room_id`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "room": {...} // Full room object
  }
}
```

#### `POST /api/rooms/:room_id/join`
**Request Body:**
```json
{
  "team_name": "Mumbai Mavericks",
  "password": "optional_if_protected"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Joined room successfully",
  "data": {
    "team_id": "TEAM_001",
    "team": {...}
  }
}
```

#### `POST /api/rooms/:room_id/leave`
**Response (200):**
```json
{
  "success": true,
  "message": "Left room successfully"
}
```

#### `DELETE /api/rooms/:room_id`
**Only host can delete**
**Response (200):**
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

### 4.4 Team Management APIs

#### `GET /api/teams/:team_id`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "team": {...} // Full team object with squad
  }
}
```

#### `PUT /api/teams/:team_id`
**Request Body:**
```json
{
  "team_name": "New Team Name",
  "logo_url": "...",
  "primary_color": "#FF0000"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "team": {...}
  }
}
```

#### `GET /api/teams/:team_id/rating`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "overall_rating": 87.5,
    "breakdown": {
      "batting_strength": 90.2,
      "bowling_strength": 85.8,
      "all_rounder_balance": 88.5,
      "fielding_quality": 84.0,
      "experience": 86.5,
      "consistency": 89.0
    },
    "strengths": ["Strong batting lineup", "Balanced attack"],
    "weaknesses": ["Weak death bowling", "Lack of overseas pacers"],
    "recommendations": [...]
  }
}
```

### 4.5 Analytics APIs

#### `GET /api/analytics/auction/:room_id`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "spending_trends": [...],
    "role_wise_spending": {...},
    "price_distribution": [...],
    "team_comparisons": [...]
  }
}
```

#### `GET /api/analytics/player/:player_id`
**Response (200):**
```json
{
  "success": true,
  "data": {
    "historical_prices": [...],
    "performance_trends": [...],
    "comparison_with_peers": [...]
  }
}
```

---

## 5. WebSocket Events - Complete Specification

### 5.1 Connection Events

#### Client → Server
```javascript
// Connect to server
socket = io('http://localhost:5000', {
  auth: {
    token: 'jwt_token_here'
  }
});

// Join a specific auction room
socket.emit('join_room', {
  room_id: 'ROOM_ABC123',
  team_id: 'TEAM_001'
});

// Leave room
socket.emit('leave_room', {
  room_id: 'ROOM_ABC123'
});
```

#### Server → Client
```javascript
// Connection successful
socket.on('connected', (data) => {
  console.log(data); // { user_id: '...', timestamp: '...' }
});

// Joined room successfully
socket.on('room_joined', (data) => {
  console.log(data); // { room: {...}, team: {...} }
});

// User left room
socket.on('user_left', (data) => {
  console.log(data); // { user_id: '...', team_id: '...', timestamp: '...' }
});
```

### 5.2 Auction Control Events

#### Client → Server (Host Only)
```javascript
// Start the auction
socket.emit('start_auction', {
  room_id: 'ROOM_ABC123'
});

// Pause auction
socket.emit('pause_auction', {
  room_id: 'ROOM_ABC123',
  reason: 'Technical issue'
});

// Resume auction
socket.emit('resume_auction', {
  room_id: 'ROOM_ABC123'
});

// Skip current player (mark as unsold)
socket.emit('mark_unsold', {
  room_id: 'ROOM_ABC123',
  player_id: 'PLR_042'
});

// End auction
socket.emit('end_auction', {
  room_id: 'ROOM_ABC123'
});
```

#### Server → All Clients in Room
```javascript
// Auction started
socket.on('auction_started', (data) => {
  console.log(data);
  // {
  //   room_id: '...',
  //   first_player: {...},
  //   timestamp: '...'
  // }
});

// Auction paused
socket.on('auction_paused', (data) => {
  console.log(data); // { reason: '...', timestamp: '...' }
});

// Auction resumed
socket.on('auction_resumed', (data) => {
  console.log(data); // { timestamp: '...' }
});

// Auction ended
socket.on('auction_ended', (data) => {
  console.log(data);
  // {
  //   final_standings: [...],
  //   auction_summary: {...},
  //   timestamp: '...'
  // }
});
```

### 5.3 Bidding Events

#### Client → Server
```javascript
// Place a bid
socket.emit('place_bid', {
  room_id: 'ROOM_ABC123',
  team_id: 'TEAM_001',
  amount: 15000000, // ₹1.5 Crore
  player_id: 'PLR_042'
});

// Use RTM (Right to Match) card
socket.emit('use_rtm', {
  room_id: 'ROOM_ABC123',
  team_id: 'TEAM_001',
  player_id: 'PLR_042'
});

// Withdraw from bidding
socket.emit('withdraw_bid', {
  room_id: 'ROOM_ABC123',
  team_id: 'TEAM_001'
});
```

#### Server → All Clients in Room
```javascript
// New bid placed
socket.on('new_bid', (data) => {
  console.log(data);
  // {
  //   team_id: 'TEAM_001',
  //   team_name: 'Mumbai Mavericks',
  //   amount: 15000000,
  //   player_id: 'PLR_042',
  //   timestamp: '...',
  //   timer_extended: false
  // }
});

// Bid rejected (validation failed)
socket.on('bid_rejected', (data) => {
  console.log(data);
  // {
  //   team_id: 'TEAM_001',
  //   reason: 'Insufficient funds',
  //   timestamp: '...'
  // }
});

// RTM used
socket.on('rtm_used', (data) => {
  console.log(data);
  // {
  //   team_id: 'TEAM_001',
  //   player_id: 'PLR_042',
  //   matched_amount: 15000000,
  //   timestamp: '...'
  // }
});
```

### 5.4 Player Transition Events

#### Server → All Clients in Room
```javascript
// Player sold
socket.on('player_sold', (data) => {
  console.log(data);
  // {
  //   player_id: 'PLR_042',
  //   player: {...},
  //   sold_to_team_id: 'TEAM_001',
  //   sold_to_team_name: 'Mumbai Mavericks',
  //   final_price: 15000000,
  //   total_bids: 8,
  //   timestamp: '...'
  // }
});

// Player unsold
socket.on('player_unsold', (data) => {
  console.log(data);
  // {
  //   player_id: 'PLR_042',
  //   player: {...},
  //   base_price: 2000000,
  //   timestamp: '...'
  // }
});

// Next player loaded
socket.on('next_player', (data) => {
  console.log(data);
  // {
  //   player: {...}, // Full player details
  //   player_index: 42,
  //   remaining_players: 158,
  //   timer_duration: 60,
  //   timestamp: '...'
  // }
});
```

### 5.5 Timer Events

#### Server → All Clients in Room
```javascript
// Timer tick (every second)
socket.on('timer_tick', (data) => {
  console.log(data);
  // {
  //   remaining_seconds: 45,
  //   timer_ends_at: '...',
  //   is_warning: false // true when < 10 seconds
  // }
});

// Timer warning (at 10 seconds)
socket.on('timer_warning', (data) => {
  console.log(data);
  // {
  //   remaining_seconds: 10,
  //   message: 'Last 10 seconds!'
  // }
});

// Timer extended
socket.on('timer_extended', (data) => {
  console.log(data);
  // {
  //   extension_duration: 15,
  //   new_end_time: '...',
  //   reason: 'Bid placed in last 5 seconds'
  // }
});

// Timer expired
socket.on('timer_expired', (data) => {
  console.log(data);
  // {
  //   player_id: 'PLR_042',
  //   final_bidder: 'TEAM_001' || null,
  //   timestamp: '...'
  // }
});
```

### 5.6 Room State Events

#### Server → All Clients in Room
```javascript
// Room state updated (purse changes, squad updates)
socket.on('room_state_update', (data) => {
  console.log(data);
  // {
  //   teams: [...], // Updated team data with new purses
  //   timestamp: '...'
  // }
});

// Team budget alert
socket.on('budget_alert', (data) => {
  console.log(data);
  // {
  //   team_id: 'TEAM_001',
  //   remaining_purse: 500000000,
  //   alert_type: 'low_funds', // low_funds, squad_limit_near
  //   message: 'Only ₹5 Crore remaining!'
  // }
});

// Squad constraint violation
socket.on('constraint_violation', (data) => {
  console.log(data);
  // {
  //   team_id: 'TEAM_001',
  //   violation_type: 'max_overseas_exceeded',
  //   message: 'Cannot bid - 8 overseas players already acquired',
  //   timestamp: '...'
  // }
});
```

### 5.7 Chat Events

#### Client → Server
```javascript
// Send chat message
socket.emit('send_message', {
  room_id: 'ROOM_ABC123',
  message: 'Great buy!',
  type: 'text' // text, emoji, sticker
});
```

#### Server → All Clients in Room
```javascript
// New chat message
socket.on('new_message', (data) => {
  console.log(data);
  // {
  //   user_id: 'USR_12345',
  //   username: 'cricketfan_99',
  //   message: 'Great buy!',
  //   type: 'text',
  //   timestamp: '...'
  // }
});
```

---

## 6. Auction State Machine - Detailed Logic

### 6.1 State Definitions
```python
class AuctionState(Enum):
    IDLE = "idle"                    # Room created, no auction started
    WAITING = "waiting"              # Waiting for more teams to join
    READY = "ready"                  # Minimum teams joined, ready to start
    ACTIVE = "active"                # Auction in progress
    PLAYER_BIDDING = "player_bidding" # Accepting bids for current player
    PLAYER_COUNTDOWN = "player_countdown" # Final countdown, no new bids
    PLAYER_SOLD = "player_sold"      # Player sold, processing
    PLAYER_UNSOLD = "player_unsold"  # Player unsold, processing
    PAUSED = "paused"                # Auction paused by host
    COMPLETED = "completed"          # All players auctioned
    ABANDONED = "abandoned"          # Room closed/abandoned
```

### 6.2 State Transitions & Rules

```python
class AuctionEngine:
    def __init__(self, room_id):
        self.room_id = room_id
        self.state = AuctionState.IDLE
        self.current_player = None
        self.bid_history = []
        self.timer = None

    def start_auction(self):
        """Initiate auction - can only start from READY state"""
        if self.state != AuctionState.READY:
            raise InvalidStateTransition("Cannot start from current state")

        if len(self.room.teams) < self.room.config.min_teams:
            raise InsufficientTeams("Need at least 2 teams")

        # Load first player
        self.load_next_player()
        self.state = AuctionState.ACTIVE
        self.broadcast_event('auction_started')

    def load_next_player(self):
        """Load next player from queue"""
        if not self.room.remaining_players:
            self.complete_auction()
            return

        player_id = self.room.remaining_players.pop(0)
        self.current_player = Player.get(player_id)
        self.bid_history = []

        # Reset timer
        self.start_timer()

        # Broadcast
        self.state = AuctionState.PLAYER_BIDDING
        self.broadcast_event('next_player', {
            'player': self.current_player.to_dict(),
            'remaining': len(self.room.remaining_players)
        })

    def place_bid(self, team_id, amount):
        """Process bid - most critical function"""

        # Validation Layer 1: State Check
        if self.state not in [AuctionState.PLAYER_BIDDING, AuctionState.PLAYER_COUNTDOWN]:
            return {'success': False, 'error': 'Bidding not active'}

        team = self.room.get_team(team_id)

        # Validation Layer 2: Team Eligibility
        if not team.is_active:
            return {'success': False, 'error': 'Team not active'}

        # Validation Layer 3: Budget Check
        if amount > team.remaining_purse:
            self.broadcast_event('bid_rejected', {
                'team_id': team_id,
                'reason': 'Insufficient funds',
                'required': amount,
                'available': team.remaining_purse
            })
            return {'success': False, 'error': 'Insufficient budget'}

        # Validation Layer 4: Minimum Increment
        current_bid = self.get_current_bid_amount()
        min_increment = self.room.config.bid_increment

        if amount < current_bid + min_increment:
            return {'success': False, 'error': f'Minimum increment ₹{min_increment/100000} Lakh'}

        # Validation Layer 5: Squad Constraints
        constraint_check = self.check_squad_constraints(team, self.current_player)
        if not constraint_check['valid']:
            self.broadcast_event('constraint_violation', {
                'team_id': team_id,
                'violation': constraint_check['reason']
            })
            return {'success': False, 'error': constraint_check['reason']}

        # Validation Layer 6: Same Team Consecutive Bid Prevention
        if self.bid_history and self.bid_history[-1]['team_id'] == team_id:
            return {'success': False, 'error': 'Cannot bid consecutively'}

        # All validations passed - Record bid
        bid_entry = {
            'team_id': team_id,
            'team_name': team.team_name,
            'amount': amount,
            'timestamp': datetime.utcnow()
        }
        self.bid_history.append(bid_entry)

        # Update room state
        self.room.auction_state.current_bid = amount
        self.room.auction_state.current_bidder_team_id = team_id
        self.room.save()

        # Timer logic: Extend if bid in last 5 seconds
        remaining = self.get_timer_remaining()
        if remaining <= 5 and self.room.config.auto_extend:
            self.extend_timer()
            bid_entry['timer_extended'] = True

        # Broadcast to all
        self.broadcast_event('new_bid', bid_entry)

        return {'success': True, 'bid': bid_entry}

    def timer_expired(self):
        """Handle timer expiration"""
        if not self.bid_history:
            # No bids - player unsold
            self.mark_player_unsold()
        else:
            # Sell to highest bidder
            winning_bid = self.bid_history[-1]
            self.sell_player(winning_bid['team_id'], winning_bid['amount'])

    def sell_player(self, team_id, amount):
        """Execute player sale"""
        self.state = AuctionState.PLAYER_SOLD

        team = self.room.get_team(team_id)

        # Update team
        team.squad.append({
            'player_id': self.current_player.player_id,
            'player_name': self.current_player.name,
            'role': self.current_player.role,
            'bought_for': amount,
            'acquired_at': datetime.utcnow()
        })
        team.remaining_purse -= amount
        team.spent_amount += amount
        team.save()

        # Update player
        self.current_player.sold_price = amount
        self.current_player.status = 'sold'
        self.current_player.save()

        # Update room
        self.room.sold_players.append(self.current_player.player_id)
        self.room.auction_state.players_sold += 1
        self.room.save()

        # Broadcast
        self.broadcast_event('player_sold', {
            'player': self.current_player.to_dict(),
            'sold_to_team_id': team_id,
            'sold_to_team_name': team.team_name,
            'final_price': amount,
            'total_bids': len(self.bid_history)
        })

        # Recalculate team rating in background
        celery_app.send_task('calculate_team_rating', args=[team_id])

        # Load next player after 3 seconds
        time.sleep(3)
        self.load_next_player()

    def mark_player_unsold(self):
        """Mark player as unsold"""
        self.state = AuctionState.PLAYER_UNSOLD

        # Update player
        self.current_player.status = 'unsold'
        self.current_player.save()

        # Update room
        self.room.unsold_players.append(self.current_player.player_id)
        self.room.auction_state.players_unsold += 1
        self.room.save()

        # Broadcast
        self.broadcast_event('player_unsold', {
            'player': self.current_player.to_dict(),
            'base_price': self.current_player.base_price
        })

        # Load next
        time.sleep(2)
        self.load_next_player()

    def check_squad_constraints(self, team, player):
        """Validate if team can acquire this player"""
        # Check max squad size
        if len(team.squad) >= self.room.config.max_squad_size:
            return {'valid': False, 'reason': 'Squad full (25 players)'}

        # Check overseas limit
        if player.advanced_metrics.overseas_player:
            overseas_count = sum(1 for p in team.squad if p.get('is_overseas'))
            if overseas_count >= self.room.config.max_overseas:
                return {'valid': False, 'reason': f'Max {self.room.config.max_overseas} overseas players allowed'}

        # Check minimum purse for remaining slots
        remaining_slots = self.room.config.min_squad_size - len(team.squad)
        if remaining_slots > 0:
            min_required = remaining_slots * self.current_player.base_price
            if team.remaining_purse - player.base_price < min_required:
                return {'valid': False, 'reason': 'Insufficient budget for minimum squad'}

        return {'valid': True}

    def complete_auction(self):
        """Finalize auction"""
        self.state = AuctionState.COMPLETED

        # Calculate final rankings
        rankings = self.calculate_final_rankings()

        # Save to history
        self.save_auction_history(rankings)

        # Broadcast
        self.broadcast_event('auction_ended', {
            'final_standings': rankings,
            'auction_summary': self.generate_summary()
        })
```

---

## 7. Team Rating System - Advanced Algorithm

### 7.1 Rating Components (Total = 100 points)

```python
class TeamRatingEngine:
    def __init__(self):
        # Weightages
        self.weights = {
            'batting_strength': 0.25,      # 25%
            'bowling_strength': 0.25,      # 25%
            'all_rounder_balance': 0.15,   # 15%
            'fielding_quality': 0.10,      # 10%
            'experience': 0.10,            # 10%
            'consistency': 0.10,           # 10%
            'depth': 0.05                  # 5%
        }

    def calculate_rating(self, team):
        """Main rating calculation"""
        scores = {}

        # 1. Batting Strength (25 points)
        scores['batting_strength'] = self.calculate_batting_strength(team)

        # 2. Bowling Strength (25 points)
        scores['bowling_strength'] = self.calculate_bowling_strength(team)

        # 3. All-Rounder Balance (15 points)
        scores['all_rounder_balance'] = self.calculate_allrounder_balance(team)

        # 4. Fielding Quality (10 points)
        scores['fielding_quality'] = self.calculate_fielding_quality(team)

        # 5. Experience (10 points)
        scores['experience'] = self.calculate_experience(team)

        # 6. Consistency (10 points)
        scores['consistency'] = self.calculate_consistency(team)

        # 7. Squad Depth (5 points)
        scores['depth'] = self.calculate_squad_depth(team)

        # Weighted total
        overall = sum(scores[key] * self.weights[key] * 100 for key in scores)

        return {
            'overall_rating': round(overall, 2),
            'breakdown': {k: round(v, 2) for k, v in scores.items()},
            'strengths': self.identify_strengths(scores),
            'weaknesses': self.identify_weaknesses(scores),
            'recommendations': self.generate_recommendations(team, scores)
        }

    def calculate_batting_strength(self, team):
        """Calculate batting prowess (0-1 scale)"""
        batsmen = [p for p in team.squad if p['role'] in ['Batsman', 'Wicket-Keeper']]

        if not batsmen:
            return 0.0

        # Metrics to consider
        total_runs = sum(p['stats']['batting']['runs'] for p in batsmen)
        avg_strike_rate = np.mean([p['stats']['batting']['strike_rate'] for p in batsmen])
        avg_average = np.mean([p['stats']['batting']['average'] for p in batsmen])

        # Normalize
        runs_score = min(total_runs / 5000, 1.0)  # 5000 runs = max
        sr_score = min(avg_strike_rate / 150, 1.0)  # 150 SR = max
        avg_score = min(avg_average / 50, 1.0)  # 50 avg = max

        # Weighted combination
        batting_score = (
            runs_score * 0.4 +
            sr_score * 0.35 +
            avg_score * 0.25
        )

        # Bonus for top-order depth
        top_order_batsmen = [p for p in batsmen if p['stats']['batting']['average'] > 35]
        if len(top_order_batsmen) >= 4:
            batting_score *= 1.1  # 10% bonus

        return min(batting_score, 1.0)

    def calculate_bowling_strength(self, team):
        """Calculate bowling prowess (0-1 scale)"""
        bowlers = [p for p in team.squad if p['role'] in ['Bowler', 'All-Rounder']]

        if not bowlers:
            return 0.0

        total_wickets = sum(p['stats']['bowling']['wickets'] for p in bowlers)
        avg_economy = np.mean([p['stats']['bowling']['economy'] for p in bowlers])
        avg_strike_rate = np.mean([p['stats']['bowling']['strike_rate'] for p in bowlers])

        # Normalize (lower is better for economy/SR)
        wickets_score = min(total_wickets / 200, 1.0)  # 200 wickets = max
        economy_score = max((10 - avg_economy) / 2, 0.0)  # 8 economy = 1.0
        sr_score = max((30 - avg_strike_rate) / 10, 0.0)  # 20 SR = 1.0

        bowling_score = (
            wickets_score * 0.4 +
            economy_score * 0.35 +
            sr_score * 0.25
        )

        # Bonus for variety (pace + spin balance)
        pace_bowlers = [p for p in bowlers if 'Fast' in p['bowling_style'] or 'Medium' in p['bowling_style']]
        spin_bowlers = [p for p in bowlers if 'Spin' in p['bowling_style']]

        if len(pace_bowlers) >= 3 and len(spin_bowlers) >= 2:
            bowling_score *= 1.1  # 10% bonus for balance

        return min(bowling_score, 1.0)

    def calculate_allrounder_balance(self, team):
        """Evaluate all-rounder quality (0-1 scale)"""
        all_rounders = [p for p in team.squad if p['role'] == 'All-Rounder']

        if not all_rounders:
            return 0.3  # Penalty for no all-rounders

        # Quality check: Both bat avg > 25 and bowl economy < 9
        quality_allrounders = [
            p for p in all_rounders
            if p['stats']['batting']['average'] > 25 and
               p['stats']['bowling']['economy'] < 9
        ]

        score = len(quality_allrounders) / 3  # 3 quality all-rounders = 1.0

        return min(score, 1.0)

    def calculate_fielding_quality(self, team):
        """Assess fielding standards (0-1 scale)"""
        total_catches = sum(p['stats']['fielding']['catches'] for p in team.squad)
        total_run_outs = sum(p['stats']['fielding']['run_outs'] for p in team.squad)

        catches_score = min(total_catches / 150, 1.0)  # 150 catches = max
        runouts_score = min(total_run_outs / 30, 1.0)  # 30 run-outs = max

        return catches_score * 0.7 + runouts_score * 0.3

    def calculate_experience(self, team):
        """Measure experience level (0-1 scale)"""
        total_matches = sum(p['stats']['batting']['matches'] for p in team.squad)

        # Average matches per player
        avg_matches = total_matches / len(team.squad)

        # Normalize (50 matches = max experience)
        exp_score = min(avg_matches / 50, 1.0)

        # Bonus for senior players (100+ matches)
        veterans = [p for p in team.squad if p['stats']['batting']['matches'] > 100]
        if len(veterans) >= 3:
            exp_score *= 1.15  # 15% bonus

        return min(exp_score, 1.0)

    def calculate_consistency(self, team):
        """Evaluate performance consistency (0-1 scale)"""
        consistency_scores = [
            p['advanced_metrics']['consistency_score'] / 100
            for p in team.squad
        ]

        return np.mean(consistency_scores)

    def calculate_squad_depth(self, team):
        """Assess bench strength (0-1 scale)"""
        squad_size = len(team.squad)

        # Ideal: 22-25 players
        if squad_size < 18:
            return 0.3  # Insufficient squad
        elif squad_size < 20:
            return 0.6
        elif squad_size <= 25:
            return 1.0
        else:
            return 0.8  # Too large, management issues

    def identify_strengths(self, scores):
        """Identify top 3 strengths"""
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        strengths = []

        for metric, score in sorted_scores[:3]:
            if score > 0.8:
                strengths.append(self.get_strength_message(metric, score))

        return strengths

    def identify_weaknesses(self, scores):
        """Identify bottom 3 weaknesses"""
        sorted_scores = sorted(scores.items(), key=lambda x: x[1])
        weaknesses = []

        for metric, score in sorted_scores[:3]:
            if score < 0.6:
                weaknesses.append(self.get_weakness_message(metric, score))

        return weaknesses

    def generate_recommendations(self, team, scores):
        """AI-powered recommendations"""
        recommendations = []

        # Batting recommendations
        if scores['batting_strength'] < 0.6:
            recommendations.append({
                'category': 'Batting',
                'priority': 'High',
                'suggestion': 'Need strong top-order batsmen with avg > 35',
                'target_roles': ['Batsman', 'Wicket-Keeper']
            })

        # Bowling recommendations
        if scores['bowling_strength'] < 0.6:
            pace_bowlers = [p for p in team.squad if 'Fast' in p.get('bowling_style', '')]
            if len(pace_bowlers) < 3:
                recommendations.append({
                    'category': 'Bowling',
                    'priority': 'High',
                    'suggestion': 'Add at least 2 quality pace bowlers',
                    'target_roles': ['Bowler']
                })

        # Balance recommendations
        if scores['all_rounder_balance'] < 0.5:
            recommendations.append({
                'category': 'Balance',
                'priority': 'Medium',
                'suggestion': 'Acquire 2-3 genuine all-rounders',
                'target_roles': ['All-Rounder']
            })

        return recommendations
```

---

## 8. Performance Optimization Strategies

### 8.1 Backend Optimizations

#### Database Indexing
```javascript
// MongoDB Indexes for fast queries
db.players.createIndex({ "player_id": 1 }, { unique: true });
db.players.createIndex({ "role": 1, "status": 1 });
db.players.createIndex({ "base_price": 1 });
db.players.createIndex({ "country": 1 });
db.players.createIndex({ "name": "text" });  // Text search
db.players.createIndex({ "advanced_metrics.overseas_player": 1 });

db.users.createIndex({ "user_id": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 });

db.rooms.createIndex({ "room_id": 1 }, { unique: true });
db.rooms.createIndex({ "room_code": 1 });
db.rooms.createIndex({ "status": 1, "is_public": 1 });
db.rooms.createIndex({ "host_user_id": 1 });
db.rooms.createIndex({ "created_at": -1 });

// Compound indexes for complex queries
db.rooms.createIndex({ "status": 1, "is_public": 1, "created_at": -1 });
db.players.createIndex({ "role": 1, "country": 1, "status": 1 });
```

#### Redis Caching Strategy
```python
class CacheManager:
    # Cache TTLs
    PLAYER_DATA_TTL = 3600  # 1 hour
    ROOM_STATE_TTL = 60     # 1 minute
    USER_SESSION_TTL = 86400  # 24 hours
    LEADERBOARD_TTL = 300   # 5 minutes

    @staticmethod
    def get_player(player_id):
        """Get player with caching"""
        cache_key = f"player:{player_id}"

        # Try cache first
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

        # Cache miss - fetch from DB
        player = Player.objects.get(player_id=player_id)

        # Store in cache
        redis_client.setex(
            cache_key,
            CacheManager.PLAYER_DATA_TTL,
            json.dumps(player.to_dict())
        )

        return player.to_dict()

    @staticmethod
    def invalidate_room(room_id):
        """Invalidate room cache after state change"""
        redis_client.delete(f"room:{room_id}")

    @staticmethod
    def cache_leaderboard(room_id, data):
        """Cache leaderboard data"""
        redis_client.setex(
            f"leaderboard:{room_id}",
            CacheManager.LEADERBOARD_TTL,
            json.dumps(data)
        )
```

#### Query Optimization
```python
# Bad: N+1 query problem
for player_id in room.sold_players:
    player = Player.objects.get(player_id=player_id)  # DB hit each time
    # process player...

# Good: Batch query
player_ids = room.sold_players
players = Player.objects.filter(player_id__in=player_ids)  # Single DB hit
player_dict = {p.player_id: p for p in players}

for player_id in room.sold_players:
    player = player_dict[player_id]
    # process player...
```

#### Connection Pooling
```python
# MongoDB Connection Pool
client = MongoClient(
    MONGO_URI,
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=30000,
    waitQueueTimeoutMS=5000
)

# Redis Connection Pool
redis_pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=50,
    decode_responses=True
)
redis_client = redis.Redis(connection_pool=redis_pool)
```

#### Async Operations with Celery
```python
# celery_tasks.py
from celery import Celery

celery_app = Celery('ipl_auction', broker='redis://localhost:6379/1')

@celery_app.task
def calculate_team_rating(team_id):
    """Background task for rating calculation"""
    team = Team.objects.get(team_id=team_id)
    engine = TeamRatingEngine()
    rating = engine.calculate_rating(team)

    # Update team
    team.team_rating = rating['overall_rating']
    team.save()

    return rating

@celery_app.task
def send_email_notification(user_id, subject, body):
    """Background email sending"""
    user = User.objects.get(user_id=user_id)
    # Send email logic...

@celery_app.task
def generate_auction_report(room_id):
    """Generate PDF report after auction"""
    room = Room.objects.get(room_id=room_id)
    # Generate PDF logic...
    return report_path
```

### 8.2 Frontend Optimizations

#### React Query for Data Fetching
```javascript
// hooks/useAuctionRoom.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useAuctionRoom = (roomId) => {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.getRoom(roomId),
    staleTime: 30000, // Consider fresh for 30s
    cacheTime: 300000, // Keep in cache for 5min
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
  });
};

export const usePlaceBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, teamId, amount }) =>
      api.placeBid(roomId, teamId, amount),
    onSuccess: (data, variables) => {
      // Optimistically update cache
      queryClient.setQueryData(['room', variables.roomId], (old) => ({
        ...old,
        auction_state: {
          ...old.auction_state,
          current_bid: variables.amount,
          current_bidder_team_id: variables.teamId
        }
      }));
    }
  });
};
```

#### Virtual Scrolling for Large Lists
```javascript
// components/PlayerList.jsx
import { FixedSizeList as List } from 'react-window';

const PlayerList = ({ players }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      {players[index].name}
    </div>
  );

  return (
    <List
      height={600}
      itemCount={players.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

#### Code Splitting & Lazy Loading
```javascript
// App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load routes
const Lobby = lazy(() => import('./pages/Lobby'));
const AuctionRoom = lazy(() => import('./pages/AuctionRoom'));
const SquadBuilder = lazy(() => import('./pages/SquadBuilder'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:id" element={<AuctionRoom />} />
          <Route path="/squad" element={<SquadBuilder />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

#### Memoization
```javascript
// components/TeamCard.jsx
import { memo, useMemo } from 'react';

const TeamCard = memo(({ team, players }) => {
  // Expensive calculation cached
  const teamStats = useMemo(() => {
    return calculateTeamStatistics(team, players);
  }, [team.team_id, players.length]);

  return (
    <div>
      <h3>{team.team_name}</h3>
      <p>Rating: {teamStats.rating}</p>
      <p>Budget: ₹{teamStats.remainingBudget}</p>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.team.team_id === nextProps.team.team_id &&
    prevProps.team.remaining_purse === nextProps.team.remaining_purse &&
    prevProps.players.length === nextProps.players.length
  );
});
```

#### WebSocket Optimization
```javascript
// hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import debounce from 'lodash.debounce';

export const useSocket = (roomId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize connection
    socketRef.current = io(SOCKET_URL, {
      auth: { token: getAuthToken() },
      transports: ['websocket'], // Force WebSocket
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Join room
    socketRef.current.emit('join_room', { room_id: roomId });

    // Cleanup
    return () => {
      socketRef.current.emit('leave_room', { room_id: roomId });
      socketRef.current.disconnect();
    };
  }, [roomId]);

  // Debounce rapid events
  const debouncedEmit = useCallback(
    debounce((event, data) => {
      socketRef.current?.emit(event, data);
    }, 300),
    []
  );

  return { socket: socketRef.current, debouncedEmit };
};
```

#### Image Optimization
```javascript
// components/PlayerImage.jsx
const PlayerImage = ({ src, alt, size = 'medium' }) => {
  const sizes = {
    small: { w: 100, h: 100 },
    medium: { w: 300, h: 300 },
    large: { w: 600, h: 600 }
  };

  // Use Cloudinary transformations for optimized images
  const optimizedSrc = `${src}?w=${sizes[size].w}&h=${sizes[size].h}&q=auto&f=auto`;

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      loading="lazy" // Native lazy loading
      decoding="async"
      className="player-image"
    />
  );
};
```

### 8.3 Network Optimizations

#### HTTP/2 & Compression
```python
# Flask app configuration
from flask_compress import Compress

app = Flask(__name__)
Compress(app)  # Enable gzip compression

app.config['COMPRESS_MIMETYPES'] = [
    'text/html',
    'text/css',
    'text/xml',
    'application/json',
    'application/javascript'
]
app.config['COMPRESS_LEVEL'] = 6  # Compression level 1-9
app.config['COMPRESS_MIN_SIZE'] = 500  # Minimum bytes to compress
```

#### CDN for Static Assets
```nginx
# Nginx configuration
server {
    listen 80;
    server_name ipl-auction.com;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    # API requests
    location /api/ {
        proxy_pass http://flask_app:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://flask_app:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 9. IPL Auction Rules & Constraints

### 9.1 Official IPL Auction Rules (2025)

#### Squad Composition Rules
```python
AUCTION_RULES = {
    # Squad Size
    'min_squad_size': 18,
    'max_squad_size': 25,
    'ideal_squad_size': 22,

    # Budget
    'total_purse': 10000000000,  # ₹100 Crore per team
    'min_purse_remaining': 0,  # Can spend entire purse

    # Overseas Players
    'max_overseas_total': 8,  # Maximum 8 foreign players in squad
    'max_overseas_playing_xi': 4,  # Maximum 4 in playing XI

    # Retention & RTM
    'max_retentions': 6,  # Before auction
    'max_rtm_cards': 0,  # Right to Match cards (varies by season)

    # Role Distribution (Recommended, not enforced)
    'recommended': {
        'batsmen': {'min': 5, 'max': 8},
        'bowlers': {'min': 5, 'max': 8},
        'all_rounders': {'min': 2, 'max': 4},
        'wicket_keepers': {'min': 1, 'max': 3}
    },

    # Bidding Rules
    'min_bid_increment': 500000,  # ₹5 Lakh
    'base_price_tiers': [
        2000000,    # ₹20 Lakh
        4000000,    # ₹40 Lakh
        7500000,    # ₹75 Lakh
        10000000,   # ₹1 Crore
        15000000,   # ₹1.5 Crore
        20000000,   # ₹2 Crore
    ],

    # Timer Settings
    'timer_per_player': 60,  # 60 seconds default
    'timer_warning_threshold': 10,  # Warning at 10s
    'timer_extension_on_bid': 15,  # +15s if bid in last 5s
    'max_timer_extensions': 3,  # Maximum 3 extensions

    # Auction Types
    'auction_types': {
        'standard': {
            'timer': 60,
            'set_breaks': True,
            'accelerated_rounds': False
        },
        'accelerated': {
            'timer': 30,
            'set_breaks': False,
            'accelerated_rounds': True
        },
        'mini': {  # For replacement players mid-season
            'timer': 45,
            'player_pool_size': 50,
            'set_breaks': False
        }
    }
}
```

#### Validation Functions
```python
class AuctionRuleValidator:
    @staticmethod
    def validate_squad_size(team, player_to_add=None):
        """Check squad size constraints"""
        current_size = len(team.squad)

        if player_to_add and current_size >= AUCTION_RULES['max_squad_size']:
            return {
                'valid': False,
                'error': f"Squad full. Maximum {AUCTION_RULES['max_squad_size']} players allowed."
            }

        return {'valid': True}

    @staticmethod
    def validate_overseas_limit(team, player):
        """Check overseas player limit"""
        if not player.advanced_metrics.overseas_player:
            return {'valid': True}

        overseas_count = sum(
            1 for p in team.squad
            if p.get('is_overseas', False)
        )

        if overseas_count >= AUCTION_RULES['max_overseas_total']:
            return {
                'valid': False,
                'error': f"Maximum {AUCTION_RULES['max_overseas_total']} overseas players allowed. Current: {overseas_count}"
            }

        return {'valid': True}

    @staticmethod
    def validate_minimum_spend_for_squad(team, bid_amount):
        """Ensure team can complete minimum squad after this bid"""
        remaining_after_bid = team.remaining_purse - bid_amount
        current_squad_size = len(team.squad)
        slots_remaining = AUCTION_RULES['min_squad_size'] - current_squad_size - 1

        if slots_remaining <= 0:
            return {'valid': True}  # Already met minimum

        # Assume each remaining slot needs at least base price (₹20 Lakh)
        min_required = slots_remaining * AUCTION_RULES['base_price_tiers'][0]

        if remaining_after_bid < min_required:
            return {
                'valid': False,
                'error': f"Need at least ₹{min_required/10000000:.2f} Cr remaining to fill minimum squad"
            }

        return {'valid': True}

    @staticmethod
    def validate_bid_increment(current_bid, new_bid):
        """Check minimum bid increment"""
        min_increment = AUCTION_RULES['min_bid_increment']

        if new_bid < current_bid + min_increment:
            return {
                'valid': False,
                'error': f"Minimum increment ₹{min_increment/100000} Lakh required"
            }

        return {'valid': True}

    @staticmethod
    def validate_budget(team, bid_amount):
        """Check if team has sufficient budget"""
        if bid_amount > team.remaining_purse:
            return {
                'valid': False,
                'error': f"Insufficient funds. Available: ₹{team.remaining_purse/10000000:.2f} Cr"
            }

        return {'valid': True}

    @staticmethod
    def validate_all_constraints(team, player, bid_amount, current_bid):
        """Run all validations"""
        validations = [
            AuctionRuleValidator.validate_squad_size(team, player),
            AuctionRuleValidator.validate_overseas_limit(team, player),
            AuctionRuleValidator.validate_minimum_spend_for_squad(team, bid_amount),
            AuctionRuleValidator.validate_bid_increment(current_bid, bid_amount),
            AuctionRuleValidator.validate_budget(team, bid_amount)
        ]

        # Return first failure
        for validation in validations:
            if not validation['valid']:
                return validation

        return {'valid': True}
```

---

## 10. Enhanced Features & User Experience

### 10.1 Quick Bid Buttons
```javascript
// components/BidControls.jsx
const BidControls = ({ currentBid, onBid, remainingPurse }) => {
  const quickIncrements = [
    { label: '+10L', value: 1000000 },
    { label: '+25L', value: 2500000 },
    { label: '+50L', value: 5000000 },
    { label: '+1Cr', value: 10000000 },
    { label: '+2Cr', value: 20000000 },
  ];

  const [customAmount, setCustomAmount] = useState('');

  const handleQuickBid = (increment) => {
    const newBid = currentBid + increment;
    if (newBid <= remainingPurse) {
      onBid(newBid);
    } else {
      toast.error('Insufficient purse!');
    }
  };

  const handleCustomBid = () => {
    const amount = parseFloat(customAmount) * 10000000; // Convert Cr to paise
    if (amount > currentBid && amount <= remainingPurse) {
      onBid(Math.round(amount));
      setCustomAmount('');
    }
  };

  return (
    <div>
      <div>
        {quickIncrements.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => handleQuickBid(value)}
            disabled={currentBid + value > remainingPurse}
            className="quick-bid-btn"
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        <input
          type="number"
          step="0.05"
          placeholder="Enter amount (Cr)"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
        />
        <button onClick={handleCustomBid}>Custom Bid</button>
      </div>
    </div>
  );
};
```

### 10.2 Real-time Leaderboard
```javascript
// components/Leaderboard.jsx
const Leaderboard = ({ teams }) => {
  // Sort by team rating (or purse remaining, or squad size)
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.team_rating - a.team_rating);
  }, [teams]);

  return (
    <div>
      <h2>Team Standings</h2>
      <ul>
        {sortedTeams.map((team, index) => (
          <li key={team.team_id}>
            <div>#{index + 1}</div>
            <div>
              <div>{team.team_name}</div>
              <div>
                Rating: {team.team_rating.toFixed(1)}
                Squad: {team.squad.length}/25
                Purse: ₹{(team.remaining_purse / 10000000).toFixed(1)}Cr
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### 10.3 Live Activity Feed
```javascript
// components/ActivityFeed.jsx
const ActivityFeed = ({ roomId }) => {
  const [activities, setActivities] = useState([]);
  const { socket } = useSocket(roomId);

  useEffect(() => {
    if (!socket) return;

    // Listen to all activity events
    const eventHandlers = {
      'new_bid': (data) => addActivity('bid', data),
      'player_sold': (data) => addActivity('sold', data),
      'player_unsold': (data) => addActivity('unsold', data),
      'user_joined': (data) => addActivity('join', data),
      'user_left': (data) => addActivity('leave', data),
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.keys(eventHandlers).forEach(event => {
        socket.off(event);
      });
    };
  }, [socket]);

  const addActivity = (type, data) => {
    const activity = {
      id: Date.now(),
      type,
      data,
      timestamp: new Date()
    };

    setActivities(prev => [activity, ...prev].slice(0, 50)); // Keep last 50
  };

  const getActivityMessage = (activity) => {
    switch (activity.type) {
      case 'bid':
        return `${activity.data.team_name} bid ₹${(activity.data.amount / 10000000).toFixed(2)}Cr`;
      case 'sold':
        return `${activity.data.player.name} SOLD to ${activity.data.sold_to_team_name} for ₹${(activity.data.final_price / 10000000).toFixed(2)}Cr!`;
      case 'unsold':
        return `${activity.data.player.name} went UNSOLD`;
      case 'join':
        return `${activity.data.username} joined the auction`;
      case 'leave':
        return `${activity.data.username} left`;
      default:
        return '';
    }
  };

  return (
    <div>
      <h2>Live Activity</h2>
      <ul>
        {activities.map(activity => (
          <li key={activity.id}>
            <span>{format(activity.timestamp, 'HH:mm:ss')}</span>
            <span>{getActivityMessage(activity)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### 10.4 Sound Effects System
```javascript
// utils/sounds.js
class SoundManager {
  constructor() {
    this.sounds = {
      bid: new Audio('/sounds/bid.mp3'),
      sold: new Audio('/sounds/gavel.mp3'),
      unsold: new Audio('/sounds/unsold.mp3'),
      warning: new Audio('/sounds/timer_warning.mp3'),
      tick: new Audio('/sounds/tick.mp3'),
      success: new Audio('/sounds/success.mp3'),
      error: new Audio('/sounds/error.mp3'),
    };

    this.enabled = true;
    this.volume = 0.5;

    // Preload
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
      sound.load();
    });
  }

  play(soundName) {
    if (!this.enabled) return;

    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => console.warn('Sound play failed:', err));
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }

  toggle() {
    this.enabled = !this.enabled;
  }
}

export const soundManager = new SoundManager();

// Usage in component
socket.on('new_bid', (data) => {
  soundManager.play('bid');
  // ... handle bid
});

socket.on('player_sold', (data) => {
  soundManager.play('sold');
  // ... handle sale
});
```

### 10.5 Haptic Feedback (Mobile)
```javascript
// utils/haptics.js
class HapticManager {
  constructor() {
    this.supported = 'vibrate' in navigator;
  }

  light() {
    if (this.supported) navigator.vibrate(10);
  }

  medium() {
    if (this.supported) navigator.vibrate(20);
  }

  heavy() {
    if (this.supported) navigator.vibrate([30, 10, 30]);
  }

  success() {
    if (this.supported) navigator.vibrate([10, 5, 10]);
  }

  error() {
    if (this.supported) navigator.vibrate([30, 10, 30, 10, 30]);
  }
}

export const haptics = new HapticManager();

// Usage
const handleBidClick = () => {
  haptics.medium();
  placeBid(amount);
};
```

---

## 11. Complete Project Structure

```
ipl-auction-system/
│
├── client/                          # React Frontend
│   ├── public/
│   │   ├── sounds/
│   │   │   ├── bid.mp3
│   │   │   ├── gavel.mp3
│   │   │   ├── timer_warning.mp3
│   │   │   └── tick.mp3
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── fonts/
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Loader.jsx
│   │   │   │   └── Toast.jsx
│   │   │   │
│   │   │   ├── auction/
│   │   │   │   ├── PlayerCard.jsx
│   │   │   │   ├── BidControls.jsx
│   │   │   │   ├── Timer.jsx
│   │   │   │   ├── BidHistory.jsx
│   │   │   │   ├── Leaderboard.jsx
│   │   │   │   └── ActivityFeed.jsx
│   │   │   │
│   │   │   ├── squad/
│   │   │   │   ├── SquadGrid.jsx
│   │   │   │   ├── PitchView.jsx
│   │   │   │   ├── PlayerDraggable.jsx
│   │   │   │   └── ConstraintChecker.jsx
│   │   │   │
│   │   │   └── analytics/
│   │   │       ├── TeamRatingChart.jsx
│   │   │       ├── SpendingChart.jsx
│   │   │       └── ComparisonTable.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Lobby.jsx
│   │   │   ├── AuctionRoom.jsx
│   │   │   ├── SquadBuilder.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── History.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSocket.js
│   │   │   ├── useAuth.js
│   │   │   ├── useAuctionRoom.js
│   │   │   ├── useTeam.js
│   │   │   └── usePlayers.js
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── socket.js
│   │   │   └── auth.js
│   │   │
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── auctionStore.js
│   │   │   └── uiStore.js
│   │   │
│   │   ├── utils/
│   │   │   ├── sounds.js
│   │   │   ├── haptics.js
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   │
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   └── tailwind.config.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # Flask Backend
│   ├── app/
│   │   ├── __init__.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── player.py
│   │   │   ├── room.py
│   │   │   └── team.py
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── players.py
│   │   │   ├── rooms.py
│   │   │   ├── teams.py
│   │   │   └── analytics.py
│   │   │
│   │   ├── socket_events/
│   │   │   ├── __init__.py
│   │   │   ├── connection.py
│   │   │   ├── auction.py
│   │   │   ├── bidding.py
│   │   │   └── chat.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auction_engine.py
│   │   │   ├── rating_engine.py
│   │   │   ├── validator.py
│   │   │   └── cache_manager.py
│   │   │
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── auth_utils.py
│   │   │   ├── db_utils.py
│   │   │   └── constants.py
│   │   │
│   │   └── config.py
│   │
│   ├── celery_tasks/
│   │   ├── __init__.py
│   │   ├── rating_tasks.py
│   │   └── notification_tasks.py
│   │
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_auction.py
│   │   ├── test_rating.py
│   │   └── test_websocket.py
│   │
│   ├── requirements.txt
│   ├── run.py
│   └── wsgi.py
│
├── scripts/
│   ├── seed_players.py              # Populate DB with player data
│   ├── import_players_from_csv.py
│   └── generate_mock_auction.py
│
├── docker/
│   ├── Dockerfile.client
│   ├── Dockerfile.server
│   └── docker-compose.yml
│
├── nginx/
│   └── nginx.conf
│
├── docs/
│   ├── API.md
│   ├── WEBSOCKET_EVENTS.md
│   ├── DATABASE_SCHEMA.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

## 12. Deployment Strategy

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:7.0
    container_name: ipl_mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
    volumes:
      - mongo_data:/data/db
    networks:
      - ipl_network

  # Redis
  redis:
    image: redis:7.2-alpine
    container_name: ipl_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - ipl_network

  # Flask Backend
  backend:
    build:
      context: ./server
      dockerfile: ../docker/Dockerfile.server
    container_name: ipl_backend
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://admin:password123@mongodb:27017/
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET_KEY=your_secret_key_here
      - FLASK_ENV=production
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./server:/app
    networks:
      - ipl_network

  # Celery Worker
  celery:
    build:
      context: ./server
      dockerfile: ../docker/Dockerfile.server
    container_name: ipl_celery
    command: celery -A celery_tasks worker --loglevel=info
    environment:
      - MONGO_URI=mongodb://admin:password123@mongodb:27017/
      - REDIS_URL=redis://redis:6379/1
    depends_on:
      - mongodb
      - redis
    networks:
      - ipl_network

  # React Frontend
  frontend:
    build:
      context: ./client
      dockerfile: ../docker/Dockerfile.client
    container_name: ipl_frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:5000
      - VITE_SOCKET_URL=http://localhost:5000
    depends_on:
      - backend
    networks:
      - ipl_network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: ipl_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend
    networks:
      - ipl_network

volumes:
  mongo_data:
  redis_data:

networks:
  ipl_network:
    driver: bridge
```

---

## 13. Testing Strategy

### Backend Unit Tests
```python
# tests/test_auction.py
import pytest
from app.services.auction_engine import AuctionEngine
from app.models import Room, Team, Player

class TestAuctionEngine:
    def test_place_bid_success(self):
        """Test successful bid placement"""
        engine = AuctionEngine(room_id='TEST_ROOM')
        result = engine.place_bid(
            team_id='TEAM_001',
            amount=15000000
        )
        assert result['success'] == True
        assert result['bid']['amount'] == 15000000

    def test_place_bid_insufficient_funds(self):
        """Test bid rejection due to insufficient funds"""
        engine = AuctionEngine(room_id='TEST_ROOM')
        result = engine.place_bid(
            team_id='TEAM_001',
            amount=999999999999  # Exceeds purse
        )
        assert result['success'] == False
        assert 'Insufficient budget' in result['error']

    def test_overseas_limit_constraint(self):
        """Test overseas player limit enforcement"""
        engine = AuctionEngine(room_id='TEST_ROOM')
        # ... setup team with 8 overseas players
        result = engine.place_bid(
            team_id='TEAM_001',
            amount=10000000
        )
        assert result['success'] == False
        assert 'overseas' in result['error'].lower()
```

### Frontend Component Tests
```javascript
// __tests__/BidControls.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import BidControls from '../components/auction/BidControls';

describe('BidControls', () => {
  test('renders quick bid buttons', () => {
    render(<BidControls currentBid={10000000} onBid={jest.fn()} />);

    expect(screen.getByText('+10L')).toBeInTheDocument();
    expect(screen.getByText('+25L')).toBeInTheDocument();
    expect(screen.getByText('+50L')).toBeInTheDocument();
  });

  test('calls onBid with correct amount', () => {
    const onBid = jest.fn();
    render(<BidControls currentBid={10000000} onBid={onBid} remainingPurse={20000000} />);

    fireEvent.click(screen.getByText('+10L'));
    expect(onBid).toHaveBeenCalledWith(11000000);
  });
});
```
