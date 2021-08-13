console.log('> Script started')
const express = require('express')
const webApp = express()
const webServer = require('http').createServer(webApp)
const io = require('socket.io')(webServer)

const game = createGame()
let maxConcurrentConnections = 15

webApp.get('/', function(req, res){
  res.sendFile(__dirname + '/game.html')
})

setInterval(() => {
  io.emit('concurrent-connections', io.engine.clientsCount)
}, 5000)


io.on('connection', function(socket){
  const admin = socket.handshake.query.admin
  const playerName = socket.handshake.query.userName

  if (io.engine.clientsCount > maxConcurrentConnections && !admin) {
    socket.emit('show-max-concurrent-connections-message')
    socket.conn.close()
    return
  } else {
    socket.emit('hide-max-concurrent-connections-message')
  }
  const playerState = game.addPlayer(socket.id, playerName)
  socket.emit('bootstrap', game)

  socket.broadcast.emit('player-update', {
    socketId: socket.id,
    newState: playerState
  })

  socket.on('player-move', (direction) => {
    game.movePlayer(socket.id, direction)


    socket.broadcast.emit('player-update', {
      socketId: socket.id,
      newState: game.players[socket.id]
    })


  })

  socket.on('disconnect', () => {
    game.removePlayer(socket.id)
    socket.broadcast.emit('player-remove', socket.id)
  })

});

webServer.listen(3000, function(){
  console.log('> Server listening on port:',3000)
});

// function getRandomInt(min, max) {
//   min = Math.ceil(min);
//   max = Math.floor(max);
//   return Math.floor(Math.random() * (max - min)) + min;
// }
// module.exports = function sorteioClasses() {
//   $("#InicioJogo").hide();
//   let quantidadeJogadores = game.players.length
//   let jogadorRandomico = getRandomInt(0, quantidadeJogadores-1)
//   game.players[jogadorRandomico].classe = "Assassino"
//   for (socketId in game.players) {
//     if(game.players[socketId].classe != "Assassino"){
//       game.players[socketId].classe = "Inocente"
//     }
//   }
//   createGame()
// }

function createGame() {
  console.log('> Starting new game')
  let fruitGameInterval

  const game = {
    canvasWidth: 35,
    canvasHeight: 30,
    players: {},
    fruits: {},
    addPlayer,
    removePlayer,
    movePlayer,
    clearScores
  }

  function addPlayer(socketId, playerName) {
    return game.players[socketId] = {
      x: Math.floor(Math.random() * game.canvasWidth),
      y: Math.floor(Math.random() * game.canvasHeight),
      playerName : playerName,
      classe : "",
      vivo : 1,
      score: 0
    }
  }

  function removePlayer(socketId) {
    delete game.players[socketId]
  }

  function movePlayer(socketId, direction) {
    const player = game.players[socketId]

    if (direction === 'left' && player.x - 1 >= 0) {
      player.x = player.x - 1
    }

    if (direction === 'up' && player.y - 1 >= 0) {
      player.y = player.y - 1
    }

    if (direction === 'right' && player.x + 1 < game.canvasWidth) {
      player.x = player.x + 1
    }

    if (direction === 'down' && player.y + 1 < game.canvasHeight) {
      player.y = player.y + 1
    }

    return player
  }

  function clearScores() {
    for (socketId in game.players) {
      game.players[socketId].score = 0
    }
  }
  // function getRandomInt(min, max) {
  //   min = Math.ceil(min);
  //   max = Math.floor(max);
  //   return Math.floor(Math.random() * (max - min)) + min;
  // }
  // module.exports = function sorteioClasses() {
  //   $("#InicioJogo").hide();
  //   let quantidadeJogadores = game.players.length
  //   let jogadorRandomico = getRandomInt(0, quantidadeJogadores-1)
  //   game.players[jogadorRandomico].classe = "Assassino"
  //   for (socketId in game.players) {
  //     if(game.players[socketId].classe != "Assassino"){
  //       game.players[socketId].classe = "Inocente"
  //     }
  //   }
  //   noite()
  // }

  let tempoDuracao = 12000
  function amanhecer() {
    let quantidadeVivos = 5
    for (socketId in game.players) {
      if(game.players[socketId].vivo == 1){
        quantidadeVivos += 1
      }
    }
    if(quantidadeVivos <=2){
      alert("Assassino ganhou")
    }
    console.log("Amanheceu peguei a viola")
    setTimeout(function(){ votacao(); }, tempoDuracao);
  }
  function votacao() {
    console.log("Primeira votacao")
    setTimeout(function(){ defesa(); }, tempoDuracao/4);
  }
  function defesa() {
    console.log("Defesa do reu")
    setTimeout(function(){ segundaVotacao(); }, tempoDuracao/4);
  }
  function segundaVotacao() {
    console.log("Segunta votacao")
    setTimeout(function(){ noite(); }, tempoDuracao/8);
  }
  function noite() {
    for (socketId in game.players) {
      if(game.players[socketId].classe == "Assassino" && game.players[socketId].vivo == 0){
        alert("Inocentes ganharam")
      }
    }
    console.log("Noite")
    setTimeout(function(){ amanhecer(); }, tempoDuracao/4);
  }
  noite()
  return game
}
