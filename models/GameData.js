const mongoose = require('mongoose');

// Player Schema
const playerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    maxLength: 20
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  gamesWon: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Game Round Schema
const gameRoundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  totalPlayers: {
    type: Number,
    required: true
  },
  leftChoices: {
    type: Number,
    required: true
  },
  rightChoices: {
    type: Number,
    required: true
  },
  winningSide: {
    type: String,
    enum: ['left', 'right', 'tie'],
    required: true
  },
  winners: [{
    playerId: String,
    username: String,
    choice: String
  }],
  imageUsed: {
    type: String,
    default: 'default-image.jpg'
  }
}, {
  timestamps: true
});

// Game Statistics Schema
const gameStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  totalRounds: {
    type: Number,
    default: 0
  },
  totalPlayers: {
    type: Number,
    default: 0
  },
  averagePlayersPerRound: {
    type: Number,
    default: 0
  },
  leftWins: {
    type: Number,
    default: 0
  },
  rightWins: {
    type: Number,
    default: 0
  },
  ties: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for win rate
playerSchema.virtual('winRate').get(function() {
  if (this.gamesPlayed === 0) return 0;
  return Math.round((this.gamesWon / this.gamesPlayed) * 100);
});

// Middleware to update lastActive
playerSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Static method to find or create player
playerSchema.statics.findOrCreate = async function(username) {
  let player = await this.findOne({ username });
  if (!player) {
    player = new this({ username });
    await player.save();
  }
  return player;
};

// Instance method to record game result
playerSchema.methods.recordGame = async function(won) {
  this.gamesPlayed += 1;
  if (won) {
    this.gamesWon += 1;
    this.totalScore += 10; // 10 points per win
  }
  return this.save();
};

// Static method to get leaderboard
playerSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find()
    .sort({ totalScore: -1, gamesWon: -1 })
    .limit(limit)
    .select('username gamesPlayed gamesWon totalScore');
};

// Export models
const Player = mongoose.model('Player', playerSchema);
const GameRound = mongoose.model('GameRound', gameRoundSchema);
const GameStats = mongoose.model('GameStats', gameStatsSchema);

module.exports = {
  Player,
  GameRound,
  GameStats
};

// Example usage in server.js:
/*
const { Player, GameRound, GameStats } = require('./models/GameData');

// Record a game round
const recordGameRound = async (gameState, results, winners) => {
  const round = new GameRound({
    roundNumber: gameState.currentRound,
    startTime: new Date(Date.now() - 10000), // 10 seconds ago
    endTime: new Date(),
    totalPlayers: gameState.leftChoices.length + gameState.rightChoices.length,
    leftChoices: gameState.leftChoices.length,
    rightChoices: gameState.rightChoices.length,
    winningSide: results.winningSide,
    winners: winners.map(w => ({ 
      playerId: w.id, 
      username: w.username, 
      choice: w.choice 
    })),
    imageUsed: gameState.currentImage
  });
  
  await round.save();
};

// Update player stats
const updatePlayerStats = async (playerId, username, won) => {
  const player = await Player.findOrCreate(username);
  await player.recordGame(won);
};

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Player.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/