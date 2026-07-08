/**
 * Backend de contagem de estoque — Loja da Construção
 * -----------------------------------------------------
 * Recebe as contagens do site (GitHub Pages) e grava nesta planilha.
 * Cada produto ocupa UMA linha (upsert): se você reescanear e mudar a
 * quantidade, a mesma linha é atualizada em vez de criar duplicada.
 *
 * Este script é "container-bound": ele já está preso a esta planilha,
 * então não precisa de nenhum ID. É só publicar como Web App.
 *
 * Aba usada: "Contagens" (criada automaticamente na primeira gravação).
 */

// Palavra-chave simples pra evitar que estranhos gravem na sua planilha.
// Precisa ser IGUAL à const SYNC_TOKEN lá no index.html.
var SYNC_TOKEN = 'lc-2026';

var ABA = 'Contagens';
var CABECALHO = [
  'Chave', 'Código', 'Produto', 'Qtd loja', 'Qtd estoque',
  'Total', 'Estoque sistema', 'Diferença', 'Observação', 'Atualizado em'
];

/** Garante que a aba e o cabeçalho existem, e devolve a aba. */
function getAba_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABA);
  if (!aba) {
    aba = ss.insertSheet(ABA);
  }
  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO])
       .setFontWeight('bold').setBackground('#0F3D3E').setFontColor('#FFFFFF');
    aba.setFrozenRows(1);
    aba.hideColumns(1); // esconde a coluna "Chave"
  }
  return aba;
}

/** Mapa chave -> número da linha, pra fazer upsert. */
function mapaChaves_(aba) {
  var mapa = {};
  var ult = aba.getLastRow();
  if (ult < 2) return mapa;
  var chaves = aba.getRange(2, 1, ult - 1, 1).getValues();
  for (var i = 0; i < chaves.length; i++) {
    var k = String(chaves[i][0]);
    if (k !== '') mapa[k] = i + 2; // linha real na planilha
  }
  return mapa;
}

function n_(v) { var x = Number(v); return isNaN(x) ? 0 : x; }

function observacao_(dif) {
  if (dif > 0) return 'Sobra (+' + dif + ')';
  if (dif < 0) return 'Falta (' + dif + ')';
  return 'OK';
}

/** Monta a linha da planilha a partir de um item recebido. */
function montarLinha_(it, agora) {
  var loja = n_(it.qtdLoja);
  var est  = n_(it.qtdEstoque);
  var total = (it.total != null) ? n_(it.total) : loja + est;
  var sist = n_(it.sistema);
  var dif = (it.diferenca != null) ? n_(it.diferenca) : total - sist;
  return [
    String(it.key != null ? it.key : (it.codigo || it.nome || '')),
    it.codigo || '',
    it.nome || '',
    loja, est, total, sist, dif,
    observacao_(dif),
    it.ts ? new Date(it.ts) : agora
  ];
}

/** Grava uma lista de itens (upsert por chave). */
function gravarItens_(itens) {
  var aba = getAba_();
  var mapa = mapaChaves_(aba);
  var agora = new Date();
  var novos = [];
  for (var i = 0; i < itens.length; i++) {
    var linha = montarLinha_(itens[i], agora);
    var chave = linha[0];
    if (mapa[chave]) {
      aba.getRange(mapa[chave], 1, 1, CABECALHO.length).setValues([linha]);
    } else {
      novos.push(linha);
      mapa[chave] = -1; // evita duplicar dentro do mesmo lote
    }
  }
  if (novos.length) {
    aba.getRange(aba.getLastRow() + 1, 1, novos.length, CABECALHO.length).setValues(novos);
  }
  return itens.length;
}

function resposta_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Recebe as contagens do site. */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (SYNC_TOKEN && body.token !== SYNC_TOKEN) {
      return resposta_({ ok: false, erro: 'token invalido' });
    }
    var itens = body.itens || (body.item ? [body.item] : []);
    if (!itens.length) return resposta_({ ok: false, erro: 'sem itens' });
    var n = gravarItens_(itens);
    return resposta_({ ok: true, gravados: n });
  } catch (err) {
    return resposta_({ ok: false, erro: String(err) });
  }
}

/** Teste rápido no navegador: abre a URL do Web App e deve mostrar {ok:true}. */
function doGet() {
  return resposta_({ ok: true, servico: 'contagem-estoque-lc', versao: 1 });
}
