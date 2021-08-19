console.log('> Script started')
const express = require('express')
// const path = require('path')
const webApp = express()
const webServer = require('http').createServer(webApp)
const io = require('socket.io')(webServer)

const game = createGame()
let maxConcurrentConnections = 15
let messages = []
let resumoPartida = []
let votosDoDia = []
let rodada = 0
let donoDaSala_socketID = ""

webApp.get('/', function(req, res){
  res.sendFile(__dirname + '/game.html')
})

setInterval(() => {
  io.emit('concurrent-connections', io.engine.clientsCount, rodada, donoDaSala_socketID)
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
  if (io.engine.clientsCount == 1){
    donoDaSala_socketID = socket.id
  }
  const playerState = game.addPlayer(socket.id, playerName)
  socket.emit('bootstrap', game)
//envia o perfil de todos os jogadores atualizado
  socket.broadcast.emit('player-update', nomeClasse())
//envia para uma pessoa que entrou depois, as mensagens anteriores
  socket.emit('previousMessages', messages);
//se nao estiver na primeira rodada, envia qual rodada está
  if (rodada!=0) {
    socket.emit('atualizarRodada', rodada);
  }
//envia para uma pessoa que entrou depois, os acontecimentos anteriores
  socket.emit('previousResumoPartida', resumoPartida);
//funcao para enviar mensagem para o chat publico
  socket.on('sendMessage', data =>{
      console.log(data);
      messages.push(data);
      socket.broadcast.emit('receivedMessage', data);
  })
//funcao que gera um numero randomico
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

//funcao que retorna o o perfil de todos os jogadores
  function nomeClasse(){
    var nomeClasseObject = {}
    for (socketId in game.players) {
      nomeClasseObject[socketId] = {
        donoDaSala : game.players[socketId].donoDaSala,
        playerName : game.players[socketId].playerName,
        vivo : game.players[socketId].vivo,
        classe : game.players[socketId].classe
      }
    }
    return nomeClasseObject
  }
  //Envia para o front qual classe ganhou o jogo
    function alguemGanhou(classeGanhadora){
      var classeGanhouObject = {
            author: "JOGO",
            message: classeGanhadora +" ganhou",
      };
      enviarMensagemFront(classeGanhouObject)
      //Para o timer no front
      socket.emit('pararTimer');
      socket.broadcast.emit('pararTimer');
      //Envia para o front o nome e classe de todos depois que acaba o jogo
      var nomeClasseMessage = {}
      for (socketId in game.players) {
        nomeClasseMessage[socketId] = {
          author : "JOGO",
          message: game.players[socketId].playerName +" era um " +game.players[socketId].classe,
        }
      }
      socket.emit('nomeClasseTodos', nomeClasseMessage);
      socket.broadcast.emit('nomeClasseTodos', nomeClasseMessage);
      socket.emit('novaPartida', donoDaSala_socketID);
      socket.broadcast.emit('novaPartida', donoDaSala_socketID);

    }
//envia para o front a mensagem do parametro
  function enviarMensagemFront(mensagem){
    messages.push(mensagem);
    socket.emit('receivedMessage', mensagem);
    socket.broadcast.emit('receivedMessage', mensagem);
  }
//Envia para o front o perfil de todos o jogadores atualizado
  socket.on('sorteioClasses', data =>{
      sorteioClasses()
  })

  function sorteioClasses() {     // Função que executa quando começa o jogo
    // Esconde o botão começar jogo no front
    socket.emit('esconderBotaoComecar');
    socket.broadcast.emit('esconderBotaoComecar');
    //Reseto o perfil de todos os jogadores
    for (socketId in game.players) {
      game.players[socketId].vivo = 1
      game.players[socketId].classe = ""
    }
    socket.emit('player-update', nomeClasse())
    socket.broadcast.emit('player-update', nomeClasse())
    //Limpa todas as variaveis
      messages = []
      resumoPartida = []
      votosDoDia = []
      rodada = 0
    //Escolhe um jogador aleatorio para ser o assassino e torna o resto inocente
    var jogadores = []
    for (socketId in game.players) {
      jogadores.push(game.players[socketId].playerName)
    }
    var quantidadeJogadores = jogadores.length
    let jogadorRandomico = getRandomInt(0, quantidadeJogadores-1)
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
//Manda para cada jogador sua classe especifica
    for (socketId in game.players) {
      var classeObject = {
          author: game.players[socketId].playerName,
          message: "Você é um " + game.players[socketId].classe,
      };
      console.log(classeObject);
      socket.emit('receivedClasse', classeObject)
      socket.broadcast.emit('receivedClasse', classeObject)
    }
//Manda para o Front um objeto com todas informações dos jogadores no Inicio
    socket.emit('todosJogadoresInicio', nomeClasse())
    socket.broadcast.emit('todosJogadoresInicio', nomeClasse())
//Chama a noite
    noite()
  }
//Inicializa o array de votos<sim ou nao> da segunda votacao(confirmacao)
  var votosConfimarExpulsao = []
//Tempo de duraçao base
  let tempoDuracao = 12000

  function noite() {
    //Atualiza a rodada todo inicio de noite
    rodada+=1
    socket.emit('atualizarRodada', rodada);
    socket.broadcast.emit('atualizarRodada', rodada);
    //Manda um log de inicio de noite no front e back
    var mensagemJogo = {
          author: "JOGO",
          message: "Inicio da Noite",
    };
    enviarMensagemFront(mensagemJogo)
    console.log("Noite")
    //Verifica quantidade de votos de confirmacao <sim ou nao>
    if(votosConfimarExpulsao.length){
      var votosSim = votosConfimarExpulsao.filter(x => x === "sim").length;
      var votosNao = votosConfimarExpulsao.filter(x => x === "nao").length;
      if(votosSim > votosNao+1){
        for (socketId in game.players) {
          if (jogadorMaisVotado == game.players[socketId].playerName) {
            game.players[socketId].vivo = 0
            var mortoVotacaoObject = {
                  author: "JOGO",
                  message: game.players[socketId].playerName + " --foi morto por votacao e ele era "+ game.players[socketId].classe,
            };
            enviarMensagemFront(mortoVotacaoObject)
          }
        }
      }
    }
    jogadorMaisVotado = ""
    //Verifica se há apenas 2 pessoas vivas e 1 delas é ossassino
    let quantidadeVivos = 0
    for (socketId in game.players) {
      if(game.players[socketId].vivo == 1){
        quantidadeVivos += 1
      }
    }
    if(quantidadeVivos <=2){
      alguemGanhou("Assassino")
      return
    }
    //Verifica se o assassino esta morto
    for (socketId in game.players) {
      if(game.players[socketId].classe == "Assassino" && game.players[socketId].vivo == 0){
        alguemGanhou("Inocente")
        return
      }
    }
    //Envia para o front o perfil de todos os jogadores
    socket.emit('acoesNoite', nomeClasse());
    socket.broadcast.emit('acoesNoite', nomeClasse());
    console.log(nomeClasse())
    setTimeout(function(){ amanhecer(); }, tempoDuracao/4);
  }
  //Realiza acoes que vieram do front
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

  function amanhecer() {
    //Gera um log de inicio do amanhecer no front e no back
    var mensagemJogo = {
          author: "JOGO",
          message: "Inicio do dia",
    };
    enviarMensagemFront(mensagemJogo)
    console.log("Amanheceu peguei a viola")
    //Envia para o front as mensagens das açoes que ocorreram de noite
    var mensagemAcoes = {}
    for (author in game.addAcoesOcorreramNoite) {
      console.log(game.addAcoesOcorreramNoite[author])
      for (socketId in game.players) {
        if(game.players[socketId].playerName == game.addAcoesOcorreramNoite[author].vitima){
          if(game.addAcoesOcorreramNoite[author].acao == "assassinato"){
            mensagemAcoes = {
              author : "JOGO",
              message : "O jogador "+game.players[socketId].playerName+" foi assassinado, e ele era "+ game.players[socketId].classe
            }
            //Limpam as acoes da noite daquele autor
            game.addAcoesOcorreramNoite[author].vitima = ""
            game.addAcoesOcorreramNoite[author].acao = ""
            enviarMensagemFront(mensagemAcoes)
            //Atualizam o perfil dos jogadores no Front
            socket.emit('player-update', nomeClasse())
            socket.broadcast.emit('player-update', nomeClasse())
          }
        }
      }
    }
    //Verifica no amanhecer se o assassino ganhou
    let quantidadeVivos = 0
    for (socketId in game.players) {
      if(game.players[socketId].vivo == 1){
        quantidadeVivos += 1
      }
    }
    if(quantidadeVivos <=2){
      alguemGanhou("Assassino")
      return
    }
    //Starta o time de amanhecer no front
    socket.emit('receivedTempoAmanhecer');
    socket.broadcast.emit('receivedTempoAmanhecer');
    setTimeout(function(){ votacao(); }, tempoDuracao);
  }

  function votacao() {
    //Gera log de periodo de votacao
    var mensagemJogo = {
          author: "JOGO",
          message: "Periodo de Votacao",
    };
    enviarMensagemFront(mensagemJogo)
    console.log("Primeira votacao")
    //Envia para o front perfil de todos os jogadores
    socket.emit('votacao', nomeClasse());
    socket.broadcast.emit('votacao', nomeClasse());
    setTimeout(function(){ defesa(); }, tempoDuracao/4);
  }

  socket.on('sendVotacao', data =>{
    //recebe os votos do front
      votosDoDia.push(data);
  })

  var jogadorMaisVotado = ""
  function defesa() {
    //verifica se houveram votos
    if(votosDoDia.length){
      //inicializa variaveis auxiliares para a contagem de votos
      var maisVotado = 0
      var nomeMaisVotado = ""
      var segundoMaisVotado = 0
      //conta os votos
      for (socketId in game.players) {
        aux = votosDoDia.filter(x => x === game.players[socketId].playerName).length;
        if (aux > maisVotado) {
          segundoMaisVotado = maisVotado
          maisVotado = aux
          nomeMaisVotado = game.players[socketId].playerName
        }
      }
      //verifica se houve alguem mais votado
      if(maisVotado > segundoMaisVotado+1){
        jogadorMaisVotado = nomeMaisVotado
      }
      //se houve alguem mais votado, envia log para o front
      if (jogadorMaisVotado.length) {
        var maisVotadoObject = {
              author: "JOGO",
              message: jogadorMaisVotado + " --foi o jogador mais votado, ele terá um tempo para se defender",
        };
        enviarMensagemFront(maisVotadoObject)
      }
      //limpa a variavel de votos
      var total = votosDoDia.length
      for (var i = 0; i < total; i++) {
        votosDoDia.pop()
      }
    }
    //se nao houve alguem mais votado, entao pula direto para a proxima noite
    if (!jogadorMaisVotado.length) {
      return noite()
    }
    //gera log de periodo de defesa(se for necessario) no front e no back
    var mensagemJogo = {
          author: "JOGO",
          message: "Periodo de defesa do jogador mais votado",
    };
    enviarMensagemFront(mensagemJogo)
    console.log("Defesa do reu")
    //starta o time de defesa(se for necessario) no front
    socket.emit('receivedTempoDefesa');
    socket.broadcast.emit('receivedTempoDefesa');
    setTimeout(function(){ segundaVotacao(); }, tempoDuracao/4);
  }


  function segundaVotacao() {
    //fera log de confirmacao no front e no back
    var mensagemJogo = {
          author: "JOGO",
          message: "Perido de confirmacao",
    };
    enviarMensagemFront(mensagemJogo)
    console.log("Segunda votacao")
    //verifica se há um jogador mais votado
    if(jogadorMaisVotado.length){
      var jogadorMaisVotadoObject = {}
      //percorre e salva o perfil do jogador mais votado
      for (socketId in game.players) {
        if(game.players[socketId].playerName == jogadorMaisVotado){
          jogadorMaisVotadoObject = {
            playerName : game.players[socketId].playerName,
            vivo : game.players[socketId].vivo,
            classe : game.players[socketId].classe
          }
        }
      }
      //envia para o front quem foi o mais votado
      socket.emit('segundaVotacao', jogadorMaisVotadoObject, nomeClasse());
      socket.broadcast.emit('segundaVotacao', jogadorMaisVotadoObject, nomeClasse());
    }
    setTimeout(function(){ noite(); }, tempoDuracao/6);
  }
  //recebe o front os votos<sim ou nao> para confirmar a expulsao
  socket.on('sendSegundaVotacao', data =>{
      votosConfimarExpulsao.push(data)
  })


//-----------------------------------------------
  socket.on('disconnect', () => {
    game.removePlayer(socket.id)
    socket.broadcast.emit('player-remove', socket.id)
    if (socket.id == donoDaSala_socketID) {
      let contador = 0
      for (socketId in game.players){
        if (contador == 0) {
          donoDaSala_socketID = socketId
        }
        contador+=1
      }
    }
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
  function addAcoesOcorreramNoite(author, acao, vitima) {
    return game.addAcoesOcorreramNoite[author] = {
      author : author,
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
