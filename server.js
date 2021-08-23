console.log('> Script started')
const express = require('express')
// const path = require('path')
const webApp = express()
const webServer = require('http').createServer(webApp)
const io = require('socket.io')(webServer)

const game = createGame()
let maxConcurrentConnections = 15
let messages = []
let votosDoDia = []
let rodada = 0
let donoDaSala_socketID = ""
let reiniciar = 0

let classeTipoObjetivo = [
  {
    classe: "Mafioso",
    alinhamento: "Máfia",
    objetivo: "Matar todos que não façam parte da mafia",
    habilidades: "Seguir as ordens do Godfather",
    atributos: "Você pode atacar livremente caso o Godfather não lhe de ordens, caso o Godfather morra você se tornará o próximo Godfather, você pode falar com os outros membros da mafia"
  },
  {
    classe: "Incriminador",
    alinhamento: "Máfia",
    objetivo: "Matar todos que não façam parte da mafia",
    habilidades: "Escolher alguém pra implantar provas falsas durante a noite",
    atributos: "Se seu alvo for investigado na mesma noite ele irá aparecer como suspeito, se não houver nenhum mafioso capaz de matar você se tornará mafioso, você pode falar com os outros membros da mafia"
  },
  {
    classe: "Chefe",
    alinhamento: "Máfia",
    objetivo: "Matar todos que não façam parte da mafia",
    habilidades: "Dar ordens para o mafioso atacar seu alvo",
    atributos: "Caso seja interrogado pelo Sheriff você irá aparecer como inocente, você pode falar com outros membros da mafia durante a noite, caso não tenha nenhum mafioso vivo você atacará seu alvo com as próprias mãos"
  },
  {
    classe: "Louco",
    alinhamento: "Neutro",
    objetivo: "Ser linchado a qualquer custo",
    habilidades: "Convencer a cidade a te linchar",
    atributos: "Se você for linchado você ganha o jogo"
  },
  {
    classe: "Mercenário",
    alinhamento: "Neutro",
    objetivo: "Linchar seu alvo a qualquer custo",
    habilidades: "Nenhuma",
    atributos: "No começo da partida você receberá um alvo aleatório, seu objetivo é convencer a cidade a linchar seu alvo, se seu alvo for morto durante a noite você se tornará um Jester, caso você tenha cumprido seu objetivo, você ganha o jogo"
  },
  {
    classe: "SerialKiller",
    alinhamento: "Neutro",
    objetivo: "Matar todo mundo",
    habilidades: "Escolher um jogador para atacar durante a noite",
    atributos: "Caso você seja bloqueado você irá atacar quem te bloqueou ao invés do seu alvo"
  },
  {
    classe: "Carcereiro",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Durante o dia você pode escolher uma pessoa para prender a noite",
    atributos: "Você pode falar anonimamente com o prisioneiro, você pode matar o prisioneiro, o prisioneiro não pode executar sua habilidade noturna"
  },
  {
    classe: "Sheriff",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Interrogar uma pessoa por noite",
    atributos: "Você saberá se a pessoa é suspeita"
  },
  {
    classe: "Investigador",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Investigar uma pessoa por noite para tentar encontrar pistas de seu personagem",
    atributos: "Nenhum"
  },
  {
    classe: "Olheiro",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Espiar uma pessoa por noite para ver quem visitou ela",
    atributos: "Nenhum"
  },
  {
    classe: "Médico",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Curar uma pessoa por noite",
    atributos: "Você pode se curar uma vez durante a partida inteira, você saberá se seu alvo foi atacado"
  },
  {
    classe: "Medium",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Falar com os mortos anonimamente durante a noite",
    atributos: "Você poderá escolher algum vivo pra falar uma única vez após morrer"
  },
  {
    classe: "Bloqueador",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Distrair uma pessoa por noite pra impedir que ela execute sua habilidade",
    atributos: "Você não pode ser bloqueado"
  },
  {
    classe: "Transportador",
    alinhamento: "Cidade",
    objetivo: "Linchar todos criminosos e mal feitores",
    habilidades: "Troca dois jogadores de lugar",
    atributos: "Quando você troca dois jogadores de lugar, as ações que iriam ser feitas em um, serão feitas no outro"
  },

]

// let classesmafia = ["mafioso", "framer", "godfather"]
// let classesneutro = ["jester", "executioner", "serial killer"]
let classesDisponiveis = ["Mafioso", "Incriminador", "Chefe", "Louco", "Mercenário", "SerialKiller", "Carcereiro", "Sheriff", "Investigador", "Olheiro", "Médico", "Medium", "Bloqueador", "Transportador"]
let classesMafia = ["Mafioso", "Incriminador", "Chefe"]
let classesNeutro = ["Louco", "Mercenário", "Serial Killer"]
let classesBem = ["Carcereiro", "Sheriff", "Investigador", "Olheiro", "Médico", "Medium", "Bloqueador", "Transportador"]

webApp.get('/', function(req, res){
  res.sendFile(__dirname + '/game.html')
})

setInterval(() => {
  io.emit('concurrent-connections', io.engine.clientsCount, rodada, donoDaSala_socketID)
}, 3000)

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
    rodada = 0
  }
//envia para o front a mensagem do parametro
  function enviarMensagemFront(mensagem){
    messages.push(mensagem);
    socket.emit('receivedMessage', mensagem);
    socket.broadcast.emit('receivedMessage', mensagem);
  }
  socket.on('reiniciarJogo', data =>{
    reiniciar = 1
    socket.emit('limpaTelaReiniciar')
    socket.broadcast.emit('limpaTelaReiniciar')
    //Reseta o perfil de todos os jogadores
    for (socketId in game.players) {
      game.players[socketId].vivo = 1
      game.players[socketId].classe = ""
    }
    socket.emit('player-update', nomeClasse())
    socket.broadcast.emit('player-update', nomeClasse())
    //Limpa todas as variaveis
      messages = []
      votosDoDia = []
      rodada = 0
  })
//Chama a funcao sorteioClasses para iniciar o jogo
  socket.on('sorteioClasses', data =>{
      sorteioClasses(data)
  })

  function sorteioClasses(quantClassesEscolhidas) {     // Função que executa quando começa o jogo

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
    votosDoDia = []
    rodada = 0
    //Filtra quais classes foram escolhidas pelo front
    let classesEscolhidas = []
    for (i in quantClassesEscolhidas) {
      if (quantClassesEscolhidas[i].quantidade == 1) {
        classesEscolhidas.push(quantClassesEscolhidas[i].classe)
      }
    }
    console.log(classesEscolhidas)
    //Guarda num array o nome de todos os jogadores
    var jogadores = []
    for (socketId in game.players) {
      jogadores.push(game.players[socketId].playerName)
    }
    //Aleatoriza a ordem do array com os nomes
    for (let i = 0; i < jogadores.length; i++) {
       const j = Math.floor(Math.random() * (i + 1));
       [jogadores[i], jogadores[j]] = [jogadores[j], jogadores[i]];
    }
    //Dá para cara jogador uma classe
    for (var i = 0; i < classesEscolhidas.length; i++) {
      for (socketId in game.players) {
        if(game.players[socketId].playerName == jogadores[i]){
          game.players[socketId].classe = classesEscolhidas[i]
        }
      }
    }
    //Escolhe um jogador aleatorio para ser o assassino e torna o resto inocente
    // let jogadorRandomico = getRandomInt(0, jogadores.length - 1)
    // for (socketId in game.players) {
    //   if(game.players[socketId].playerName == jogadores[jogadorRandomico]){
    //     game.players[socketId].classe = "Assassino"
    //   }
    // }
    // for (socketId in game.players) {
    //   if(game.players[socketId].classe != "Assassino"){
    //     game.players[socketId].classe = "Inocente"
    //   }
    // }
//Manda para cada jogador sua classe especifica
    for (socketId in game.players) {
      var classeObject = {
          author: game.players[socketId].playerName,
          message: "Você é o " + game.players[socketId].classe,
      };
      console.log(classeObject);
      socket.emit('receivedClasse', classeObject)
      socket.broadcast.emit('receivedClasse', classeObject)
      for (var i = 0; i < classeTipoObjetivo.length; i++) {
        if (game.players[socketId].classe == classeTipoObjetivo[i].classe) {
          var alinhamentoObject = {
              author: game.players[socketId].playerName,
              message: "Alinhamento: " +classeTipoObjetivo[i].alinhamento,
          };
          var objetivoObject = {
              author: game.players[socketId].playerName,
              message: "Objetivo: " +classeTipoObjetivo[i].objetivo,
          };
          var habilidadesObject = {
              author: game.players[socketId].playerName,
              message: "Habilidade: " +classeTipoObjetivo[i].habilidades,
          };
          var atributosObject = {
              author: game.players[socketId].playerName,
              message: "Atributos: " +classeTipoObjetivo[i].atributos,
          };
          socket.emit('receivedClasse', alinhamentoObject)
          socket.broadcast.emit('receivedClasse', alinhamentoObject)
          socket.emit('receivedClasse', objetivoObject)
          socket.broadcast.emit('receivedClasse', objetivoObject)
          socket.emit('receivedClasse', habilidadesObject)
          socket.broadcast.emit('receivedClasse', habilidadesObject)
          socket.emit('receivedClasse', atributosObject)
          socket.broadcast.emit('receivedClasse', atributosObject)
        }
      }
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
    //Verifica se ainda tem jogadores na sala
    if (io.engine.clientsCount == 0 || reiniciar == 1) {
      messages = []
      votosDoDia = []
      rodada = 0
      reiniciar = 0
      return
    }
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
              socket.emit('buscarDiarioDoMorto',game.addAcoesOcorreramNoite[author].vitima);
              socket.broadcast.emit('buscarDiarioDoMorto',game.addAcoesOcorreramNoite[author].vitima);
            }
          }
        }
      }
  })

  socket.on('enviarDiarioDoMortoBack', diarioMorto =>{
      console.log(diarioMorto)
      mensagemDoDiario = {
        author : "JOGO",
        message : "Diário: " + diarioMorto
      }
      enviarMensagemFront(mensagemDoDiario)
  })

  function amanhecer() {
    //Verifica se ainda tem jogadores na sala
    if (io.engine.clientsCount == 0 || reiniciar == 1) {
      messages = []
      votosDoDia = []
      rodada = 0
      reiniciar = 0
      return
    }
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
    //Verifica se ainda tem jogadores na sala
    if (io.engine.clientsCount == 0 || reiniciar == 1) {
      messages = []
      votosDoDia = []
      rodada = 0
      reiniciar = 0
      return
    }
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
    //Verifica se ainda tem jogadores na sala
    if (io.engine.clientsCount == 0 || reiniciar == 1) {
      messages = []
      votosDoDia = []
      rodada = 0
      reiniciar = 0
      return
    }
    //verifica se houveram votos
    if(votosDoDia.length){
      //inicializa variaveis auxiliares para a contagem de votos
      var maisVotado = 0
      var nomeMaisVotado = ""
      // var segundoMaisVotado = 0
      //conta os votos
      for (socketId in game.players) {
        aux = votosDoDia.filter(x => x === game.players[socketId].playerName).length;
        if (aux > maisVotado) {
          // segundoMaisVotado = maisVotado
          maisVotado = aux
          nomeMaisVotado = game.players[socketId].playerName
        }
      }
      //Conta quantas pessoas estão vivas
      let quantidadeVivos = 0
      for (socketId in game.players) {
        if(game.players[socketId].vivo == 1){
          quantidadeVivos += 1
        }
      }
      //verifica se houve alguem mais votado
      if(maisVotado >= ((quantidadeVivos/2)+0.5)){
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
    //Verifica se ainda tem jogadores na sala
    if (io.engine.clientsCount == 0 || reiniciar == 1) {
      messages = []
      votosDoDia = []
      rodada = 0
      reiniciar = 0
      return
    }
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

webServer.listen(process.env.PORT || 3000, function(){
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
