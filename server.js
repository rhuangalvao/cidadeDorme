console.log('> Script started')
const express = require('express')
const path = require('path');
const webApp = express()
const webServer = require('http').createServer(webApp)
const io = require('socket.io')(webServer)

const game = createGame()
let maxConcurrentConnections = 15
let messages = [];
let votosDoDia = [];

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

  function isEmpty(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        return false;
      }
    }
    return JSON.stringify(obj) === JSON.stringify({});
  }

  function nomeClasse(){
    var nomeClasseObject = {}
    for (socketId in game.players) {
      nomeClasseObject[socketId] = {
        nome : game.players[socketId].playerName,
        vivo : game.players[socketId].vivo,
        classe : game.players[socketId].classe
      }
    }
    return nomeClasseObject
  }

  socket.on('sorteioClasses', data =>{
      sorteioClasses()
  })

  function sorteioClasses() {
    socket.broadcast.emit('esconderBotaoComecar');
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

  var votosConfimarExpulsao = []
  let tempoDuracao = 12000

  function noite() {
    var mensagemJogo = {
          author: "JOGO",
          message: "Inicio da Noite",
    };
    socket.emit('receivedMessage', mensagemJogo);
    socket.broadcast.emit('receivedMessage', mensagemJogo);
    console.log("Noite")
    if(votosConfimarExpulsao.length){
      var votosSim = 0
      var votosNao = 0
      votosSim = votosConfimarExpulsao.filter(x => x === "sim").length;
      votosNao = votosConfimarExpulsao.filter(x => x === "nao").length;

      if(votosSim > votosNao){
        for (socketId in game.players) {
          if (jogadorMaisVotado == game.players[socketId].playerName) {
            game.players[socketId].vivo = 0
            var mortoVotacaoObject = {
                  author: "JOGO",
                  message: game.players[socketId].playerName + " --foi morto por votacao e ele era "+ game.players[socketId].classe,
            };
            socket.emit('receivedMessage', mortoVotacaoObject);
            socket.broadcast.emit('receivedMessage', mortoVotacaoObject);
          }
        }
      }
    }
    jogadorMaisVotado = ""
    let quantidadeVivos = 0
    for (socketId in game.players) {
      if(game.players[socketId].vivo == 1){
        quantidadeVivos += 1
      }
    }
    if(quantidadeVivos <=2){
      alguemGanhou("Assassino")
      return
      // alert("Assassino ganhou")
    }
    for (socketId in game.players) {
      if(game.players[socketId].classe == "Assassino" && game.players[socketId].vivo == 0){
        alguemGanhou("Inocente")
        return
        // alert("Inocentes ganharam")
      }
    }
    socket.emit('acoesNoite', nomeClasse());
    socket.broadcast.emit('acoesNoite', nomeClasse());
    console.log(nomeClasse())
    setTimeout(function(){ amanhecer(); }, tempoDuracao/4);
  }

  socket.on('sendAcaoNoite', data =>{
      console.log(data)
      game.addAcoesOcorreramNoite(data.author,data.qualAcao,data.vitima)
      for (author in game.addAcoesOcorreramNoite) {
        if(game.addAcoesOcorreramNoite[author].acao == "assassinato"){
          for (socketId in game.players) {
            if(game.players[socketId].playerName == game.addAcoesOcorreramNoite[author].vitima){
              game.players[socketId].vivo = 0
            }
          }
        }
      }
  })

  function alguemGanhou(classeGanhadora){
    var classeGanhouObject = {
          author: "JOGO",
          message: classeGanhadora +" ganhou",
    };
    socket.emit('receivedMessage', classeGanhouObject);
    socket.broadcast.emit('receivedMessage', classeGanhouObject);
    socket.emit('pararTimer');
    socket.broadcast.emit('pararTimer');
    var nomeClasseMessage = {}
    for (socketId in game.players) {
      nomeClasseMessage[socketId] = {
        author : "JOGO",
        message: game.players[socketId].playerName +" era um " +game.players[socketId].classe,
      }
    }
    socket.emit('nomeClasseTodos', nomeClasseMessage);
    socket.broadcast.emit('nomeClasseTodos', nomeClasseMessage);

  }

  function amanhecer() {
    socket.emit('receivedTempoAmanhecer');
    socket.broadcast.emit('receivedTempoAmanhecer');
    var mensagemJogo = {
          author: "JOGO",
          message: "Inicio do dia",
    };
    socket.emit('receivedMessage', mensagemJogo);
    socket.broadcast.emit('receivedMessage', mensagemJogo);
    var mensagemAcoes = {}
    console.log("Amanheceu peguei a viola")
    for (author in game.addAcoesOcorreramNoite) {
      console.log(game.addAcoesOcorreramNoite[author])
      for (socketId in game.players) {
        if(game.players[socketId].playerName == game.addAcoesOcorreramNoite[author].vitima){
          if(game.addAcoesOcorreramNoite[author].acao == "assassinato"){
            mensagemAcoes = {
              author : "JOGO",
              message : "O jogador "+game.players[socketId].playerName+" foi assassinado, e ele era "+ game.players[socketId].classe
            }
            game.addAcoesOcorreramNoite[author].vitima = ""
            game.addAcoesOcorreramNoite[author].acao = ""
            socket.emit('receivedMessage', mensagemAcoes);
            socket.broadcast.emit('receivedMessage', mensagemAcoes);
          }
        }
      }
    }
    let quantidadeVivos = 0
    for (socketId in game.players) {
      if(game.players[socketId].vivo == 1){
        quantidadeVivos += 1
      }
    }
    if(quantidadeVivos <=2){
      alguemGanhou("Assassino")
      return
      // alert("Assassino ganhou")
    }
    setTimeout(function(){ votacao(); }, tempoDuracao);
  }

  function votacao() {
    var mensagemJogo = {
          author: "JOGO",
          message: "Periodo de Votacao",
    };
    socket.emit('receivedMessage', mensagemJogo);
    socket.broadcast.emit('receivedMessage', mensagemJogo);
    console.log("Primeira votacao")

    socket.emit('votacao', nomeClasse());
    socket.broadcast.emit('votacao', nomeClasse());
    setTimeout(function(){ defesa(); }, tempoDuracao/4);
  }

  socket.on('sendVotacao', data =>{
      votosDoDia.push(data);
  })
  var jogadorMaisVotado = ""

  function defesa() {
    socket.emit('receivedTempoDefesa');
    socket.broadcast.emit('receivedTempoDefesa');
    var mensagemJogo = {
          author: "JOGO",
          message: "Periodo de defesa do jogador mais votado",
    };
    socket.emit('receivedMessage', mensagemJogo);
    socket.broadcast.emit('receivedMessage', mensagemJogo);
    console.log("Defesa do reu")
    if(votosDoDia.length){
      var maisVotado = 0
      var nomeMaisVotado = ""
      var segundoMaisVotado = 0

      for (socketId in game.players) {
        aux = votosDoDia.filter(x => x === game.players[socketId].playerName).length;
        if (aux > maisVotado) {
          segundoMaisVotado = maisVotado
          maisVotado = aux
          nomeMaisVotado = game.players[socketId].playerName
        }
      }
      if(maisVotado > segundoMaisVotado+1){
        jogadorMaisVotado = nomeMaisVotado
      }
      var maisVotadoObject = {
            author: "JOGO",
            message: jogadorMaisVotado + " --foi o jogador mais votado, ele terá um tempo para se defender",
      };
      socket.emit('receivedMessage', maisVotadoObject);
      socket.broadcast.emit('receivedMessage', maisVotadoObject);
      var total = votosDoDia.length
      for (var i = 0; i < total; i++) {
        votosDoDia.pop()
      }
    }
    setTimeout(function(){ segundaVotacao(); }, tempoDuracao/4);
  }


  function segundaVotacao() {
    var mensagemJogo = {
          author: "JOGO",
          message: "Perido de confirmacao",
    };
    socket.emit('receivedMessage', mensagemJogo);
    socket.broadcast.emit('receivedMessage', mensagemJogo);
    console.log("Segunda votacao")
    if(jogadorMaisVotado.length){
      var jogadorMaisVotadoObject = {}
      for (socketId in game.players) {
        if(game.players[socketId].playerName == jogadorMaisVotado){
          jogadorMaisVotadoObject = {
            nome : game.players[socketId].playerName,
            vivo : game.players[socketId].vivo,
            classe : game.players[socketId].classe
          }
        }
      }
      socket.emit('segundaVotacao', jogadorMaisVotadoObject, nomeClasse());
      socket.broadcast.emit('segundaVotacao', jogadorMaisVotadoObject, nomeClasse());
    }
    setTimeout(function(){ noite(); }, tempoDuracao/6);
  }

  socket.on('sendSegundaVotacao', data =>{
      votosConfimarExpulsao.push(data)
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
    acoesOcorreramNoite: {},
    mensagemAcoes: {},
    addAcoesOcorreramNoite,
    addPlayer,
    removePlayer,
  }
  function addAcoesOcorreramNoite(socketId, acao, vitima) {
    return game.addAcoesOcorreramNoite[socketId] = {
      acao : acao,
      vitima : vitima
    }
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
