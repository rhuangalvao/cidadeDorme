console.log('> Script started')
const express = require('express')
const path = require('path');
const webApp = express()
const webServer = require('http').createServer(webApp)
const io = require('socket.io')(webServer)

const game = createGame()
let maxConcurrentConnections = 15
let messages = [];

webApp.get('/', function(req, res){
  res.sendFile(__dirname + '/game.html')
})

setInterval(() => {
  io.emit('concurrent-connections', io.engine.clientsCount)
}, 5000)


io.on('connection', function(socket){
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

  socket.emit('previousMessages', messages);

  socket.on('sendMessage', data =>{
      console.log(data);
      messages.push(data);
      socket.broadcast.emit('receivedMessage', data);
  })

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function sorteioClasses() {
    var jogadores = []
    for (socketId in game.players) {
      jogadores.push(game.players[socketId].playerName)
    }
    var quantidadeJogadores = jogadores.length
    console.log(quantidadeJogadores)
    let jogadorRandomico = getRandomInt(0, quantidadeJogadores-1)
    console.log(jogadorRandomico)
    for (socketId in game.players) {
      if(game.players[socketId].playerName == jogadores[jogadorRandomico]){
        game.players[socketId].classe = "Assassino"
      }
    }
    for (socketId in game.players) {
      if(game.players[socketId].classe != "Assassino"){
        game.players[socketId].classe = "Inocente"
      }
    }
    for (socketId in game.players) {
      var classeObject = {
          author: game.players[socketId].playerName,
          message: "Você é um " + game.players[socketId].classe,
      };
      console.log(classeObject);
      socket.emit('receivedClasse', classeObject);
      socket.broadcast.emit('receivedClasse', classeObject);
    }
    noite()
  }
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

  socket.on('sorteioClasses', data =>{
      sorteioClasses()
  })

  socket.on('disconnect', () => {
    game.removePlayer(socket.id)
    socket.broadcast.emit('player-remove', socket.id)
  })

});

webServer.listen(3000, function(){
  console.log('> Server listening on port:',3000)
});

function createGame() {
  console.log('> Starting new game')

  const game = {
    players: {},
    addPlayer,
    removePlayer,
  }

  function addPlayer(socketId, playerName) {
    return game.players[socketId] = {
      playerName : playerName,
      classe : "",
      vivo : 1
    }
  }

  function removePlayer(socketId) {
    delete game.players[socketId]
  }
  return game
}
