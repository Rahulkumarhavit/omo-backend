// const express = require('express');
// const WebSocket = require('ws');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const http = require('http');
// const { Player, GameRound, GameStats } = require('./models/GameData');

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });

// // Middleware
// app.use(express.json());
// app.use(cors());

// // MongoDB connection
// mongoose.connect('mongodb://localhost:27017/choicegame', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// // Game state
// let gameState = {
//   currentRound: 1,
//   timeLeft: 10,
//   isActive: true,
//   leftChoices: [],
//   rightChoices: [],
//   totalPlayers: 0,
//   currentImage: 'default-image.jpg',
//   gameEnded: false
// };

// let connectedPlayers = new Map();

// // Broadcast to all connected clients
// function broadcast(data) {
//   wss.clients.forEach(client => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify(data));
//     }
//   });
// }

// // Record game round to database
// async function recordGameRound(gameState, results, winners) {
//   try {
//     const round = new GameRound({
//       roundNumber: gameState.currentRound,
//       startTime: new Date(Date.now() - 10000), // 10 seconds ago
//       endTime: new Date(),
//       totalPlayers: gameState.leftChoices.length + gameState.rightChoices.length,
//       leftChoices: gameState.leftChoices.length,
//       rightChoices: gameState.rightChoices.length,
//       winningSide: results.winningSide,
//       winners: winners.map(w => ({ 
//         playerId: w.id, 
//         username: w.username, 
//         choice: w.choice 
//       })),
//       imageUsed: gameState.currentImage
//     });
    
//     await round.save();
//     console.log(`Round ${gameState.currentRound} recorded to database`);
//   } catch (error) {
//     console.error('Error recording game round:', error);
//   }
// }

// // Update player statistics
// async function updatePlayerStats(playerId, username, won) {
//   try {
//     // Only update stats for real usernames (not auto-generated ones)
//     if (username && !username.startsWith('Player_') && username.trim() !== '') {
//       const player = await Player.findOrCreate(username);
//       await player.recordGame(won);
//       console.log(`Updated stats for ${username}: ${won ? 'WIN' : 'LOSS'}`);
//     }
//   } catch (error) {
//     console.error('Error updating player stats:', error);
//   }
// }

// // Game timer logic
// function startGameTimer() {
//   const timer = setInterval(() => {
//     if (gameState.timeLeft > 0) {
//       gameState.timeLeft--;
      
//       // Lock choices at 3 seconds
//       if (gameState.timeLeft === 3) {
//         gameState.isActive = false;
//         broadcast({
//           type: 'CHOICES_LOCKED',
//           gameState
//         });
//       }
      
//       // Show results at 1 second
//       if (gameState.timeLeft === 1) {
//         const leftCount = gameState.leftChoices.length;
//         const rightCount = gameState.rightChoices.length;
//         const total = leftCount + rightCount;
        
//         const results = {
//           leftPercent: total > 0 ? Math.round((leftCount / total) * 100) : 0,
//           rightPercent: total > 0 ? Math.round((rightCount / total) * 100) : 0,
//           leftCount,
//           rightCount,
//           winningSide: leftCount < rightCount ? 'left' : rightCount < leftCount ? 'right' : 'tie'
//         };
        
//         gameState.gameEnded = true;
        
//         // Record game results to database
//         const winners = [];
//         connectedPlayers.forEach((player, playerId) => {
//           const won = (results.winningSide === player.choice) || results.winningSide === 'tie';
//           if (player.choice) {
//             winners.push({
//               id: playerId,
//               username: player.username,
//               choice: player.choice,
//               won: won
//             });
//             // Update player stats
//             updatePlayerStats(playerId, player.username, won);
//           }
//         });
        
//         // Record the round
//         recordGameRound(gameState, results, winners);
        
//         broadcast({
//           type: 'GAME_RESULTS',
//           results,
//           gameState
//         });
//       }
      
//       broadcast({
//         type: 'TIMER_UPDATE',
//         timeLeft: gameState.timeLeft
//       });
//     } else {
//       // Reset for next round
//       clearInterval(timer);
//       setTimeout(() => {
//         resetGame();
//         startGameTimer();
//       }, 3000); // 3 second pause between rounds
//     }
//   }, 1000);
// }

// function resetGame() {
//   gameState = {
//     currentRound: gameState.currentRound + 1,
//     timeLeft: 10,
//     isActive: true,
//     leftChoices: [],
//     rightChoices: [],
//     totalPlayers: connectedPlayers.size,
//     currentImage: `image-${Math.floor(Math.random() * 5) + 1}.jpg`,
//     gameEnded: false
//   };
  
//   // Reset all player choices
//   connectedPlayers.forEach(player => {
//     player.choice = null;
//   });
  
//   broadcast({
//     type: 'NEW_ROUND',
//     gameState
//   });
// }

// // WebSocket connection handling
// wss.on('connection', (ws) => {
//   const playerId = Date.now() + Math.random();
  
//   connectedPlayers.set(playerId, {
//     ws,
//     choice: null,
//     username: `Player_${Math.floor(Math.random() * 1000)}`
//   });
  
//   console.log(`Player ${playerId} connected`);
  
//   // Send current game state to new player
//   ws.send(JSON.stringify({
//     type: 'GAME_STATE',
//     gameState,
//     playerId
//   }));
  
//   ws.on('message', (message) => {
//     try {
//       const data = JSON.parse(message);
      
//       switch (data.type) {
//         case 'MAKE_CHOICE':
//           if (gameState.isActive && !gameState.gameEnded) {
//             const player = connectedPlayers.get(playerId);
            
//             // Remove previous choice
//             if (player.choice === 'left') {
//               gameState.leftChoices = gameState.leftChoices.filter(id => id !== playerId);
//             } else if (player.choice === 'right') {
//               gameState.rightChoices = gameState.rightChoices.filter(id => id !== playerId);
//             }
            
//             // Add new choice
//             if (data.choice === 'left') {
//               gameState.leftChoices.push(playerId);
//             } else if (data.choice === 'right') {
//               gameState.rightChoices.push(playerId);
//             }
            
//             player.choice = data.choice;
            
//             broadcast({
//               type: 'CHOICE_UPDATE',
//               leftCount: gameState.leftChoices.length,
//               rightCount: gameState.rightChoices.length,
//               totalPlayers: connectedPlayers.size
//             });
//           }
//           break;
          
//         case 'SET_USERNAME':
//           const player = connectedPlayers.get(playerId);
//           if (player) {
//             player.username = data.username;
//           }
//           break;
//       }
//     } catch (error) {
//       console.error('Error parsing message:', error);
//     }
//   });
  
//   ws.on('close', () => {
//     const player = connectedPlayers.get(playerId);
//     if (player && player.choice) {
//       // Remove player's choice from game state
//       if (player.choice === 'left') {
//         gameState.leftChoices = gameState.leftChoices.filter(id => id !== playerId);
//       } else if (player.choice === 'right') {
//         gameState.rightChoices = gameState.rightChoices.filter(id => id !== playerId);
//       }
//     }
    
//     connectedPlayers.delete(playerId);
//     console.log(`Player ${playerId} disconnected`);
    
//     broadcast({
//       type: 'PLAYER_COUNT_UPDATE',
//       totalPlayers: connectedPlayers.size
//     });
//   });
// });

// // Start the game timer
// startGameTimer();

// // Routes for game statistics
// app.get('/api/stats', (req, res) => {
//   res.json({
//     currentRound: gameState.currentRound,
//     connectedPlayers: connectedPlayers.size,
//     leftChoices: gameState.leftChoices.length,
//     rightChoices: gameState.rightChoices.length
//   });
// });

// // Get leaderboard
// app.get('/api/leaderboard', async (req, res) => {
//   try {
//     const leaderboard = await Player.getLeaderboard();
//     res.json(leaderboard);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get game history
// app.get('/api/history', async (req, res) => {
//   try {
//     const history = await GameRound.find()
//       .sort({ createdAt: -1 })
//       .limit(20)
//       .select('roundNumber totalPlayers leftChoices rightChoices winningSide createdAt');
//     res.json(history);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get player profile
// app.get('/api/player/:username', async (req, res) => {
//   try {
//     const player = await Player.findOne({ username: req.params.username });
//     if (!player) {
//       return res.status(404).json({ error: 'Player not found' });
//     }
//     res.json({
//       username: player.username,
//       gamesPlayed: player.gamesPlayed,
//       gamesWon: player.gamesWon,
//       totalScore: player.totalScore,
//       winRate: player.winRate,
//       lastActive: player.lastActive
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Player, GameRound, GameStats } = require('./models/GameData');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/choicegame', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Game state
let gameState = {
  currentRound: 1,
  timeLeft: 10,
  isActive: true,
  leftChoices: [],
  rightChoices: [],
  totalPlayers: 0,
  currentImage: 'default-image.jpg',
  gameEnded: false
};

let connectedPlayers = new Map();

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Update total players count
function updateTotalPlayers() {
  gameState.totalPlayers = connectedPlayers.size;
  console.log(`Total connected players: ${connectedPlayers.size}`);
  
  // Log active connections for debugging
  if (connectedPlayers.size > 0) {
    console.log('Active connections:');
    connectedPlayers.forEach((player, id) => {
      console.log(`  - Player ${id}: ${player.username} (${player.ip})`);
    });
  }
  
  broadcast({
    type: 'PLAYER_COUNT_UPDATE',
    totalPlayers: connectedPlayers.size
  });
}

// Record game round to database
async function recordGameRound(gameState, results, winners) {
  try {
    const round = new GameRound({
      roundNumber: gameState.currentRound,
      startTime: new Date(Date.now() - 10000), // 10 seconds ago
      endTime: new Date(),
      totalPlayers: connectedPlayers.size, // Use actual connected players count
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
    console.log(`Round ${gameState.currentRound} recorded to database`);
  } catch (error) {
    console.error('Error recording game round:', error);
  }
}

// Update player statistics
async function updatePlayerStats(playerId, username, won) {
  try {
    // Only update stats for real usernames (not auto-generated ones)
    if (username && !username.startsWith('Player_') && username.trim() !== '') {
      const player = await Player.findOrCreate(username);
      await player.recordGame(won);
      console.log(`Updated stats for ${username}: ${won ? 'WIN' : 'LOSS'}`);
    }
  } catch (error) {
    console.error('Error updating player stats:', error);
  }
}

// Game timer logic
function startGameTimer() {
  const timer = setInterval(() => {
    // Main game phase (10 seconds countdown)
    if (!gameState.showingResults && gameState.timeLeft > 0) {
      gameState.timeLeft--;
      
      // Lock choices at 3 seconds
      if (gameState.timeLeft === 3) {
        gameState.isActive = false;
        broadcast({
          type: 'CHOICES_LOCKED',
          gameState
        });
      }
      
      // Show results at 0 seconds
      if (gameState.timeLeft === 0) {
        const leftCount = gameState.leftChoices.length;
        const rightCount = gameState.rightChoices.length;
        const total = leftCount + rightCount;
        
        const results = {
          leftPercent: total > 0 ? Math.round((leftCount / total) * 100) : 0,
          rightPercent: total > 0 ? Math.round((rightCount / total) * 100) : 0,
          leftCount,
          rightCount,
          winningSide: leftCount < rightCount ? 'left' : rightCount < leftCount ? 'right' : 'tie'
        };
        
        gameState.gameEnded = true;
        gameState.showingResults = true;
        gameState.timeLeftAfterResult = 3; // Reset post-result timer
        
        // Record game results to database
        const winners = [];
        connectedPlayers.forEach((player, playerId) => {
          const won = (results.winningSide === player.choice) || results.winningSide === 'tie';
          if (player.choice) {
            winners.push({
              id: playerId,
              username: player.username,
              choice: player.choice,
              won: won
            });
            // Update player stats
            updatePlayerStats(playerId, player.username, won);
          }
        });
        
        // Record the round
        recordGameRound(gameState, results, winners);
        
        broadcast({
          type: 'GAME_RESULTS',
          results,
          gameState
        });
      }
      
      // Broadcast main timer update
      broadcast({
        type: 'TIMER_UPDATE',
        timeLeft: gameState.timeLeft,
        showingResults: gameState.showingResults
      });
    }
    // Post-result countdown phase (3, 2, 1)
    else if (gameState.showingResults && gameState.timeLeftAfterResult > 0) {
      gameState.timeLeftAfterResult--;
      
      // Broadcast post-result timer update
      broadcast({
        type: 'POST_RESULT_TIMER',
        timeLeftAfterResult: gameState.timeLeftAfterResult,
        showingResults: gameState.showingResults
      });
      
      // Start new round when countdown reaches 0
      if (gameState.timeLeftAfterResult === 0) {
        clearInterval(timer);
        resetGame();
        startGameTimer();
      }
    }
  }, 1000);
}

function resetGame() {
  gameState = {
    currentRound: gameState.currentRound + 1,
    timeLeft: 10,
    timeLeftAfterResult: 3,
    isActive: true,
    leftChoices: [],
    rightChoices: [],
    totalPlayers: connectedPlayers.size,
    currentImage: `image-${Math.floor(Math.random() * 5) + 1}.jpg`,
    gameEnded: false,
    showingResults: false
  };
  
  // Reset all player choices
  connectedPlayers.forEach(player => {
    player.choice = null;
  });
  
  console.log(`Starting new round ${gameState.currentRound}`);
  
  broadcast({
    type: 'NEW_ROUND',
    gameState
  });
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const playerId = Date.now() + Math.random();
  const clientIP = req.socket.remoteAddress;
  
  console.log(`New WebSocket connection from ${clientIP}`);
  
  connectedPlayers.set(playerId, {
    ws,
    choice: null,
    username: `Player_${Math.floor(Math.random() * 1000)}`,
    connectedAt: new Date(),
    ip: clientIP
  });
  
  console.log(`Player ${playerId} connected. Total players: ${connectedPlayers.size}`);
  
  // Update total players count
  updateTotalPlayers();
  
  // Send current game state to new player
  ws.send(JSON.stringify({
    type: 'GAME_STATE',
    gameState,
    playerId
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'MAKE_CHOICE':
          if (gameState.isActive && !gameState.gameEnded) {
            const player = connectedPlayers.get(playerId);
            
            // Remove previous choice
            if (player.choice === 'left') {
              gameState.leftChoices = gameState.leftChoices.filter(id => id !== playerId);
            } else if (player.choice === 'right') {
              gameState.rightChoices = gameState.rightChoices.filter(id => id !== playerId);
            }
            
            // Add new choice
            if (data.choice === 'left') {
              gameState.leftChoices.push(playerId);
            } else if (data.choice === 'right') {
              gameState.rightChoices.push(playerId);
            }
            
            player.choice = data.choice;
            
            console.log(`Choice update - Left: ${gameState.leftChoices.length}, Right: ${gameState.rightChoices.length}, Total Players: ${connectedPlayers.size}`);
            
            broadcast({
              type: 'CHOICE_UPDATE',
              leftCount: gameState.leftChoices.length,
              rightCount: gameState.rightChoices.length,
              totalPlayers: connectedPlayers.size
            });
          }
          break;
          
        case 'SET_USERNAME':
          const player = connectedPlayers.get(playerId);
          if (player) {
            player.username = data.username;
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    const player = connectedPlayers.get(playerId);
    if (player && player.choice) {
      // Remove player's choice from game state
      if (player.choice === 'left') {
        gameState.leftChoices = gameState.leftChoices.filter(id => id !== playerId);
      } else if (player.choice === 'right') {
        gameState.rightChoices = gameState.rightChoices.filter(id => id !== playerId);
      }
    }
    
    connectedPlayers.delete(playerId);
    console.log(`Player ${playerId} disconnected. Total players: ${connectedPlayers.size}`);
    
    // Update total players count
    updateTotalPlayers();
    
    // Also broadcast updated choice counts if player had a choice
    if (player && player.choice) {
      broadcast({
        type: 'CHOICE_UPDATE',
        leftCount: gameState.leftChoices.length,
        rightCount: gameState.rightChoices.length,
        totalPlayers: connectedPlayers.size
      });
    }
  });
});

// Periodic cleanup of dead connections
setInterval(() => {
  let removedCount = 0;
  connectedPlayers.forEach((player, playerId) => {
    if (player.ws.readyState === WebSocket.CLOSED) {
      connectedPlayers.delete(playerId);
      removedCount++;
    }
  });
  
  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} dead connections`);
    updateTotalPlayers();
  }
}, 30000); // Check every 30 seconds

// Start the game timer
startGameTimer();

// Routes for game statistics
app.get('/api/stats', (req, res) => {
  res.json({
    currentRound: gameState.currentRound,
    connectedPlayers: connectedPlayers.size,
    leftChoices: gameState.leftChoices.length,
    rightChoices: gameState.rightChoices.length
  });
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Player.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game history
app.get('/api/history', async (req, res) => {
  try {
    const history = await GameRound.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('roundNumber totalPlayers leftChoices rightChoices winningSide createdAt');
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player profile
app.get('/api/player/:username', async (req, res) => {
  try {
    const player = await Player.findOne({ username: req.params.username });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({
      username: player.username,
      gamesPlayed: player.gamesPlayed,
      gamesWon: player.gamesWon,
      totalScore: player.totalScore,
      winRate: player.winRate,
      lastActive: player.lastActive
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});