/**
 * CORREÇÕES — Contagens Loja da Construção + Estoque_Principal (v2, otimizado)
 *
 * Como usar:
 * 1. Abra a planilha "Contagens Loja da Construção"
 * 2. Extensões → Apps Script → cole este arquivo
 * 3. Rode executarCorrecoes() — ou cada fix individualmente se preferir:
 *    fix1_codigosComoTexto, fix2_removerDuplicados, fix3_abaSemCodigo, fix4_resumoDataZero
 *
 * v2: tudo em operações em lote (sem appendRow/deleteRow em loop) para não
 * estourar o tempo máximo de execução.
 */

const ID_ESTOQUE_PRINCIPAL = '1DoUEO-QfwPcdYHFIsroEXpnmO0x4GSVIzFRamJEaoYc';

function executarCorrecoes() {
  const r = [];
  r.push(fix1_codigosComoTexto());
  SpreadsheetApp.flush();
  r.push(fix2_removerDuplicados());
  SpreadsheetApp.flush();
  r.push(fix3_abaSemCodigo());
  SpreadsheetApp.flush();
  r.push(fix4_resumoDataZero());
  Logger.log(r.join('\n'));
}

/* ---------- helpers ---------- */

function normalizarCodigo(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') return String(Math.round(v)); // remove .0
  return String(v).trim();
}

function semZeros(s) {
  return s.replace(/^0+/, '');
}

/* 1) Código como texto + zeros à esquerda restaurados (2 leituras + 2 escritas, total) */
function fix1_codigosComoTexto() {
  const ssEstoque = SpreadsheetApp.openById(ID_ESTOQUE_PRINCIPAL);
  const abaEstoque = ssEstoque.getSheetByName('Estoque');
  const dados = abaEstoque.getRange(2, 1, abaEstoque.getLastRow() - 1, 3).getValues();
  const mapa = {};
  dados.forEach(r => {
    const cod = normalizarCodigo(r[0]);
    if (cod) mapa[semZeros(cod)] = cod;
    const adicionais = normalizarCodigo(r[2]);
    if (adicionais) {
      adicionais.split(',').forEach(c => {
        c = c.trim();
        if (c) mapa[semZeros(c)] = c;
      });
    }
  });

  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Contagens');
  const n = aba.getLastRow() - 1;
  if (n < 1) return '1) Nada a corrigir.';
  const rng = aba.getRange(2, 3, n, 1); // coluna C = Código
  let restaurados = 0, convertidos = 0;

  const novos = rng.getValues().map(([v]) => {
    const s = normalizarCodigo(v);
    if (!s) return [''];
    const canonico = mapa[semZeros(s)];
    if (canonico && canonico !== s) { restaurados++; return [canonico]; }
    if (typeof v === 'number') convertidos++;
    return [canonico || s];
  });

  rng.setNumberFormat('@');
  rng.setValues(novos);
  const msg = `1) Códigos: ${restaurados} restaurados com zeros, ${convertidos + restaurados} convertidos p/ texto.`;
  Logger.log(msg);
  return msg;
}

/* 2) Remover duplicados reescrevendo o bloco inteiro de uma vez (1 leitura + 2 escritas) */
function fix2_removerDuplicados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('Contagens');
  const n = aba.getLastRow() - 1;
  if (n < 1) return '2) Nada a corrigir.';
  const NCOLS = 11; // A..K
  const dados = aba.getRange(2, 1, n, NCOLS).getValues();

  // agrupa por código+produto
  const grupos = {};
  dados.forEach((r, i) => {
    const cod = normalizarCodigo(r[2]);
    const prod = String(r[3] || '').trim();
    if (!cod || !prod) return;
    const chave = semZeros(cod) + '|' + prod;
    (grupos[chave] = grupos[chave] || []).push(i);
  });

  // marca índices a remover: cópias "Não contado" sem quantidades, quando o grupo tem outra linha com dado
  const temDado = r => (r[4] !== '' || r[5] !== '' || (r[9] !== '' && r[9] !== 'Não contado'));
  const remover = new Set();
  Object.values(grupos).forEach(idx => {
    if (idx.length < 2) return;
    const comDado = idx.filter(i => temDado(dados[i]));
    const manter = new Set(comDado.length ? comDado : [idx[0]]);
    idx.forEach(i => { if (!manter.has(i)) remover.add(i); });
  });

  if (!remover.size) return '2) Nenhum duplicado encontrado.';

  // log em lote
  let log = ss.getSheetByName('Log correções') || ss.insertSheet('Log correções');
  if (log.getLastRow() === 0) log.appendRow(['Data', 'Ação', 'Código', 'Produto']);
  const agora = new Date();
  const linhasLog = [...remover].map(i => [agora, 'Duplicado removido', normalizarCodigo(dados[i][2]), dados[i][3]]);
  log.getRange(log.getLastRow() + 1, 1, linhasLog.length, 4).setValues(linhasLog);

  // reescreve o bloco sem os duplicados e apaga a sobra no fim
  const mantidos = dados.filter((_, i) => !remover.has(i));
  aba.getRange(2, 1, n, NCOLS).clearContent();
  aba.getRange(2, 1, mantidos.length, NCOLS).setValues(mantidos);

  const msg = `2) ${remover.size} linhas duplicadas removidas (ver "Log correções").`;
  Logger.log(msg);
  return msg;
}

/* 3) Aba "Sem código" na Estoque_Principal (1 leitura + 1 escrita) */
function fix3_abaSemCodigo() {
  const ssEstoque = SpreadsheetApp.openById(ID_ESTOQUE_PRINCIPAL);
  const abaEstoque = ssEstoque.getSheetByName('Estoque');
  const n = abaEstoque.getLastRow() - 1;
  const dados = abaEstoque.getRange(2, 1, n, 8).getValues();
  const semCodigo = dados
    .filter(r => normalizarCodigo(r[0]) === '' && String(r[1] || '').trim() !== '')
    .map(r => [r[1], r[3], r[4], r[5], r[7]]);

  let aba = ssEstoque.getSheetByName('Sem código');
  if (aba) aba.clear(); else aba = ssEstoque.insertSheet('Sem código');
  const saida = [['Nome no SysPDV', 'Un.', 'Preço venda', 'Últ. entrada', 'Estoque sistema'], ...semCodigo];
  aba.getRange(1, 1, saida.length, 5).setValues(saida);
  aba.getRange(1, 1, 1, 5).setFontWeight('bold');
  aba.setFrozenRows(1);
  const msg = `3) Aba "Sem código" criada com ${semCodigo.length} itens.`;
  Logger.log(msg);
  return msg;
}

/* 4) Resumo B8: limpa data zero (30/12/1899) */
function fix4_resumoDataZero() {
  const res = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Resumo');
  const cel = res.getRange('B8');
  const v = cel.getValue();
  let msg;
  if (v instanceof Date && v.getFullYear() < 1990) {
    cel.setNumberFormat('@').setValue('—');
    msg = '4) Resumo B8: data zero substituída por "—".';
  } else {
    msg = '4) Resumo B8 já estava ok.';
  }
  Logger.log(msg);
  return msg;
}