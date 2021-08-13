function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

export default function sorteioClasses() {
  $("#InicioJogo").hide();
  let quantidadeJogadores = game.players.length
  let jogadorRandomico = getRandomInt(0, quantidadeJogadores-1)
  game.players[jogadorRandomico].classe = "Assassino"
  for (socketId in game.players) {
    if(game.players[socketId].classe != "Assassino"){
      game.players[socketId].classe = "Inocente"
    }
  }
}

let tempoDuracao = 12000
  function amanhecer() {
    let quantidadeVivos = 5
    for (socketId in game.players) {
      // if(game.players[socketId].vivo == 1){
      //   quantidadeVivos += 1
      // }
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
