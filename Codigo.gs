/**
 * Contagem de estoque — Loja da Construção  (v8.3)
 * -----------------------------------------------------------------
 * Mudanças da v8 (marcadas com [v8]):
 *  1. NOVO: "Pesquisar produto (código ou nome)" no menu — digite o código de
 *     barras (com ou sem zeros à esquerda) ou parte do nome e ele pula pra linha.
 *  2. ESTOQUE_ID atualizado para a Estoque_Principal ATUAL (antes apontava
 *     para a Antigo_Estoque_Principal — confira se não era proposital!).
 *  3. Anti-duplicado: carregarLetra e gravar_ (doPost) agora reconhecem produto
 *     também pelo CÓDIGO (ignorando zeros à esquerda) e pelo NOME, não só pela
 *     Chave (índice do dados.json, que muda quando o dados.json é regenerado —
 *     era isso que criava linhas duplicadas).
 *  4. fecharLetra: casamento de código com fallback sem zeros à esquerda e
 *     marcação "Enviado" em lote (mais rápido, sem risco de timeout).
 *
 * v8.1: menu "🚨 Verificar duplicados / chaves" — vigia de duplicados e de chaves
 *       desatualizadas em relação ao dados.json (o aviso prévio do duplicado).
 * v8.2: CONGELAMENTO — "Atualizar estoque do sistema" não mexe mais em linhas já
 *       contadas ou resolvidas (Feito/Inativado/Enviado ou com quantidade
 *       preenchida). O Ajuste ("Diminuir 7" etc.) fica congelado relatando o que
 *       você viu e fez na contagem. Pode atualizar o estoque todo dia; a ordem
 *       "Fechar letra antes de atualizar" deixa de ser crítica (mas siga rodando
 *       o Fechar letra no fim de cada dia de contagem).
 * v8.3: gravar_ não confia mais na CHAVE sozinha — código e nome mandam, e a chave
 *       só vale se o nome da linha for o mesmo. (Chaves velhas de produtos
 *       inativados podiam colidir com ids novos do dados.json e fazer o app
 *       SOBRESCREVER a linha de outro produto.)
 *
 * SETUP: cole, Salve, autorize, reimplante NOVA VERSÃO do Web App.
 */

var SYNC_TOKEN='lc-2026';
var DADOS_URL='https://raw.githubusercontent.com/YagoOliveira852/Contagem-estoque-LC/main/dados.json';
var ESTOQUE_ID='1DoUEO-QfwPcdYHFIsroEXpnmO0x4GSVIzFRamJEaoYc'; // [v8] Estoque_Principal ATUAL (antes: 15GKEgro... = Antigo_Estoque_Principal)
var ABA='Contagens';
var HDR=['Chave','Letra','Código','Produto','Qtd loja','Qtd estoque','Total','Estoque sistema','Ajuste','Status','Atualizado em'];
var C_CHAVE=1,C_LETRA=2,C_COD=3,C_PROD=4,C_LOJA=5,C_EST=6,C_TOTAL=7,C_SIST=8,C_AJU=9,C_STATUS=10,C_DATA=11,NCOL=11;
var LINHAS=3000;
var OPCOES_STATUS=['Não contado','OK','Pendente','Feito','Inativado','Enviado'];
var VERDE_BG='#D4EDDA',VERDE_TX='#155724',VERM_BG='#F8D7DA',VERM_TX='#721C24';
var AMBAR_BG='#FFF3CD',AMBAR_TX='#856404',TEAL_BG='#E1F5EE',TEAL_TX='#0F6E56';
var GRIS_BG='#F1EFE8',GRIS_TX='#5F5E5A',AZUL_BG='#E6F1FB',AZUL_TX='#0C447C';
var HEAD_BG='#0F3D3E',HEAD_TX='#FFFFFF',ZEBRA1='#FFFFFF',ZEBRA2='#ECEBF6';

function ss_(){ return SpreadsheetApp.getActiveSpreadsheet(); }
function num_(v){ var n=Number(v); return isNaN(n)?0:n; }
function resp_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function norm_(x){ return String(x).replace(/\s+/g,' ').trim().toUpperCase(); }
function desp_(c){ return String(c||'').trim().replace(/^0+/,''); } // [v8] tira zeros à esquerda
function letraDe_(nome){ nome=String(nome||''); return nome? nome.charAt(0).toUpperCase() : ''; }
function contou_(loja,est){ return (loja!=='' && loja!=null) || (est!=='' && est!=null); }
function totalVal_(loja,est){ return contou_(loja,est)? (num_(loja)+num_(est)) : ''; }
function ajusteVal_(loja,est,sist){
  if(!contou_(loja,est)) return '';
  var total=num_(loja)+num_(est), s=num_(sist), d=total-s;
  if(s===0 && total===0) return 'Conferir (0 no sist.)';
  if(d===0) return '—';
  if(d>0) return 'Aumentar '+d;
  return 'Diminuir '+Math.abs(d);
}
function statusAuto_(loja,est,sist){
  if(!contou_(loja,est)) return 'Não contado';
  var total=num_(loja)+num_(est), s=num_(sist), d=total-s;
  if(d===0 && total>0) return 'OK';
  return 'Pendente';
}
function obsAlter_(total,sist){
  if(sist===0 && total===0) return '0 no sistema';
  if(total===0 && sist>0) return 'Não encontrado';
  return 'Diferença na quantidade';
}
function ajRealizado_(total,sist){
  var d=total-sist;
  if(d>0) return 'Aumentei em '+d;
  if(d<0) return 'Diminui em '+Math.abs(d);
  return '';
}

function onOpen(){
  SpreadsheetApp.getUi().createMenu('🧮 Contagem')
    .addItem('🔍 Pesquisar produto (código ou nome)','pesquisarProduto') // [v8]
    .addItem('🚨 Verificar duplicados / chaves','verificarDuplicados')   // [v8.1]
    .addSeparator()
    .addItem('Carregar letra (trazer todos os produtos)','carregarLetra')
    .addItem('Ordenar por produto (A→Z)','ordenar')
    .addSeparator()
    .addItem('Fechar letra (enviar p/ Estoque_Principal)','fecharLetra')
    .addSeparator()
    .addItem('Atualizar estoque do sistema (via dados.json)','atualizarEstoqueSistema')
    .addSeparator()
    .addItem('Configurar / reestilizar','configurar')
    .addItem('Atualizar resumo','atualizarResumo')
    .addItem('Limpar contagens (nova letra/ciclo)','limparContagens')
    .addToUi();
}

// [v8] Pesquisa por código de barras (com/sem zeros à esquerda) ou por parte do nome
function pesquisarProduto(){
  var ui=SpreadsheetApp.getUi();
  var r=ui.prompt('Pesquisar produto','Digite o código de barras ou parte do nome:',ui.ButtonSet.OK_CANCEL);
  if(r.getSelectedButton()!==ui.Button.OK) return;
  var q=String(r.getResponseText()||'').trim();
  if(!q){ ui.alert('Digite um código ou nome.'); return; }
  var sh=ss_().getSheetByName(ABA); var last=sh.getLastRow();
  if(!sh || last<2){ ui.alert('A aba Contagens está vazia.'); return; }
  var vals=sh.getRange(2,1,last-1,NCOL).getValues();
  var achados=[];
  var soDigitos=q.replace(/\s/g,'');
  var ehCodigo=/^\d{4,}$/.test(soDigitos);

  if(ehCodigo){
    var alvo=desp_(soDigitos);
    for(var i=0;i<vals.length;i++){
      if(desp_(vals[i][C_COD-1])===alvo && vals[i][C_PROD-1]) achados.push(i);
    }
  }
  if(!achados.length){ // busca por nome (também como fallback do código)
    var t=norm_(q);
    for(var j=0;j<vals.length && achados.length<30;j++){
      var nm=norm_(vals[j][C_PROD-1]||'');
      if(nm && nm.indexOf(t)>=0) achados.push(j);
    }
  }
  if(!achados.length){ ui.alert('Nada encontrado para "'+q+'".'); return; }

  var row=achados[0]+2;
  sh.activate();
  sh.setActiveRange(sh.getRange(row,C_PROD));
  if(achados.length===1){
    SpreadsheetApp.getActive().toast(String(vals[achados[0]][C_PROD-1])+' — linha '+row,'🔍 Encontrado',6);
  } else {
    var lista=achados.slice(0,15).map(function(k){ return '• linha '+(k+2)+': '+vals[k][C_PROD-1]; }).join('\n');
    ui.alert(achados.length+' resultados (fui para o 1º):\n\n'+lista+(achados.length>15?'\n• ...':''));
  }
}

// [v8.1] Vigia: aponta pares duplicados e chaves desatualizadas em relação ao dados.json.
// Chave desatualizada é o AVISO PRÉVIO — é ela que gera duplicado/sobrescrita.
function verificarDuplicados(){
  var ui=SpreadsheetApp.getUi();
  var sh=ss_().getSheetByName(ABA); var last=sh?sh.getLastRow():0;
  if(!sh||last<2){ ui.alert('A aba Contagens está vazia.'); return; }
  var vals=sh.getRange(2,1,last-1,NCOL).getValues();

  var grupos={};
  for(var i=0;i<vals.length;i++){
    var r=vals[i]; if(r[C_PROD-1]===''||r[C_PROD-1]==null) continue;
    var k=(desp_(r[C_COD-1])||'SEMCOD')+'|'+norm_(r[C_PROD-1]);
    (grupos[k]=grupos[k]||[]).push(i+2);
  }
  var dups=[];
  for(var g in grupos){ if(grupos[g].length>1) dups.push(g.split('|')[1]+' (linhas '+grupos[g].join(', ')+')'); }

  var desatual=0, verificadas=0, erroFetch=null;
  try{
    var d=JSON.parse(UrlFetchApp.fetch(DADOS_URL,{muteHttpExceptions:true}).getContentText());
    var idPorCod={}, idPorNome={};
    for(var c in d.codigos){ var z=desp_(c); if(z&&idPorCod[z]==null) idPorCod[z]=d.codigos[c]; }
    for(var p=0;p<d.produtos.length;p++){ var nm=norm_(d.produtos[p].n); if(idPorNome[nm]==null) idPorNome[nm]=p; }
    for(var j=0;j<vals.length;j++){
      var rw=vals[j]; if(rw[C_PROD-1]===''||rw[C_PROD-1]==null) continue;
      var id=idPorCod[desp_(rw[C_COD-1])]; if(id==null) id=idPorNome[norm_(rw[C_PROD-1])];
      if(id==null) continue; // produto fora do dados.json (inativado no SysPDV)
      verificadas++;
      if(String(rw[C_CHAVE-1])!==String(id)) desatual++;
    }
  }catch(e){ erroFetch=String(e); }

  var msg='Verificação da aba Contagens:\n\n';
  msg+=dups.length? ('🚨 '+dups.length+' produto(s) DUPLICADO(S):\n- '+dups.slice(0,15).join('\n- ')+(dups.length>15?'\n- ...':'')+'\n\n')
                  : '✅ Nenhum duplicado.\n\n';
  if(erroFetch) msg+='⚠️ Não consegui checar as chaves (dados.json inacessível): '+erroFetch;
  else if(desatual) msg+='⚠️ '+desatual+' de '+verificadas+' chaves estão DESATUALIZADAS em relação ao dados.json.\nRode a reindexação (corrigirChaves) antes que gerem problemas.';
  else msg+='✅ Todas as '+verificadas+' chaves batem com o dados.json atual.';
  ui.alert(msg);
}

function ordenar(){
  var sh=ss_().getSheetByName(ABA); var last=sh.getLastRow();
  if(last<3){ SpreadsheetApp.getActive().toast('Nada pra ordenar.','🧮 Contagem',4); return; }
  sh.getRange(2,1,last-1,NCOL).sort([{column:C_PROD, ascending:true}]);
  aplicarEstilo_(sh);
  SpreadsheetApp.getActive().toast('Ordenado por produto (A→Z).','🧮 Contagem',4);
}

function configurar(){
  var ss=ss_(); var sh=ss.getSheetByName(ABA); if(!sh) sh=ss.insertSheet(ABA);
  var data=sh.getDataRange().getValues(); var rows=[];
  if(data.length>1){
    var head=data[0].map(function(x){return String(x).trim();});
    function ix(n){ return head.indexOf(n); }
    var iCh=ix('Chave'),iCo=ix('Código'),iPr=ix('Produto'),iLo=ix('Qtd loja'),
        iEs=ix('Qtd estoque'),iSi=ix('Estoque sistema'),iSt=ix('Status'),iIn=ix('Inativado?'),iDa=ix('Atualizado em');
    for(var r=1;r<data.length;r++){
      var row=data[r]; var prod=iPr>=0?row[iPr]:row[3];
      if(prod===''||prod==null) continue;
      var st=''; if(iSt>=0) st=row[iSt];
      else if(iIn>=0 && String(row[iIn]).toLowerCase()==='sim') st='Inativado';
      rows.push({chave:iCh>=0?row[iCh]:(row[0]||prod),cod:iCo>=0?row[iCo]:'',prod:prod,
        loja:iLo>=0?row[iLo]:'',est:iEs>=0?row[iEs]:'',sist:iSi>=0?row[iSi]:'',status:st,data:iDa>=0?row[iDa]:''});
    }
  }
  rows.sort(function(a,b){ return String(a.prod).localeCompare(String(b.prod),'pt'); });
  sh.clear();
  sh.getRange(1,1,sh.getMaxRows(),sh.getMaxColumns()).clearDataValidations(); // remove validação antiga (senão barra "Não contado"/"Enviado")
  sh.getRange(1,1,1,NCOL).setValues([HDR]);
  var n=rows.length;
  if(n){
    var out=[];
    for(var i=0;i<n;i++){
      var x=rows[i]; var st=x.status;
      if(st!=='Feito'&&st!=='Inativado'&&st!=='Enviado') st=statusAuto_(x.loja,x.est,x.sist);
      out.push([x.chave, letraDe_(x.prod), x.cod, x.prod, x.loja, x.est,
                totalVal_(x.loja,x.est), x.sist, ajusteVal_(x.loja,x.est,x.sist), st, x.data]);
    }
    sh.getRange(2,C_COD,n,1).setNumberFormat('@'); // [v8] garante código como texto
    sh.getRange(2,1,n,NCOL).setValues(out);
  }
  aplicarEstilo_(sh);
  atualizarResumo();
  SpreadsheetApp.getActive().toast('Configurada, ordenada e zebrada.','🧮 Contagem',6);
}

function aplicarEstilo_(sh){
  sh.getRange(1,1,1,NCOL).setBackground(HEAD_BG).setFontColor(HEAD_TX).setFontWeight('bold').setVerticalAlignment('middle').setWrap(true);
  sh.setFrozenRows(1); sh.setRowHeight(1,36);
  if(sh.getMaxColumns()>=C_CHAVE) sh.hideColumns(C_CHAVE);
  sh.setColumnWidth(C_LETRA,55); sh.setColumnWidth(C_COD,120); sh.setColumnWidth(C_PROD,300);
  sh.setColumnWidth(C_LOJA,80); sh.setColumnWidth(C_EST,95); sh.setColumnWidth(C_TOTAL,70);
  sh.setColumnWidth(C_SIST,120); sh.setColumnWidth(C_AJU,160); sh.setColumnWidth(C_STATUS,115); sh.setColumnWidth(C_DATA,155);
  sh.getRange(2,C_LETRA,LINHAS,1).setHorizontalAlignment('center');
  sh.getRange(2,C_LOJA,LINHAS,C_SIST-C_LOJA+1).setHorizontalAlignment('center');
  sh.getRange(2,C_STATUS,LINHAS,1).setHorizontalAlignment('center');
  sh.getRange(2,C_COD,LINHAS,1).setNumberFormat('@'); // [v8] coluna Código sempre texto
  sh.getBandings().forEach(function(b){ b.remove(); });
  var lastData=Math.max(sh.getLastRow(),2);
  var band=sh.getRange(2,1,lastData-1,NCOL).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY,false,false);
  band.setFirstRowColor(ZEBRA1); band.setSecondRowColor(ZEBRA2);
  var val=SpreadsheetApp.newDataValidation().requireValueInList(OPCOES_STATUS,true).setAllowInvalid(false).build();
  sh.getRange(2,C_STATUS,LINHAS,1).setDataValidation(val);
  var rules=[];
  function contains(col,text,bg,fg){ return SpreadsheetApp.newConditionalFormatRule().whenTextContains(text).setBackground(bg).setFontColor(fg).setRanges([sh.getRange(2,col,LINHAS,1)]).build(); }
  function equals(col,text,bg,fg){ return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([sh.getRange(2,col,LINHAS,1)]).build(); }
  rules.push(contains(C_AJU,'Aumentar',VERDE_BG,VERDE_TX));
  rules.push(contains(C_AJU,'Diminuir',VERM_BG,VERM_TX));
  rules.push(contains(C_AJU,'Conferir',AMBAR_BG,AMBAR_TX));
  rules.push(equals(C_STATUS,'OK',TEAL_BG,TEAL_TX));
  rules.push(equals(C_STATUS,'Pendente',AMBAR_BG,AMBAR_TX));
  rules.push(equals(C_STATUS,'Feito',VERDE_BG,VERDE_TX));
  rules.push(equals(C_STATUS,'Inativado',VERM_BG,VERM_TX));
  rules.push(equals(C_STATUS,'Não contado',GRIS_BG,GRIS_TX));
  rules.push(equals(C_STATUS,'Enviado',AZUL_BG,AZUL_TX));
  sh.setConditionalFormatRules(rules);
  try{ var f=sh.getFilter(); if(f) f.remove(); }catch(e){}
  try{ sh.getRange(1,1,Math.max(sh.getLastRow(),2),NCOL).createFilter(); }catch(e){}
  sh.getRange(2,C_DATA,LINHAS,1).setNumberFormat('dd/mm/yyyy hh:mm');
}

// Traz TODOS os produtos de uma letra (do dados.json do site)
function carregarLetra(){
  var ui=SpreadsheetApp.getUi();
  var r=ui.prompt('Carregar letra','Digite a letra (ex.: C):',ui.ButtonSet.OK_CANCEL);
  if(r.getSelectedButton()!==ui.Button.OK) return;
  var letra=String(r.getResponseText()||'').trim().toUpperCase().charAt(0);
  if(!letra){ ui.alert('Digite uma letra.'); return; }
  var resp=UrlFetchApp.fetch(DADOS_URL,{muteHttpExceptions:true});
  if(resp.getResponseCode()!==200){ ui.alert('Não consegui baixar a base (dados.json). Código '+resp.getResponseCode()); return; }
  var d=JSON.parse(resp.getContentText());
  var produtos=d.produtos||[]; var codigos=d.codigos||{};
  var codeById={}; for(var c in codigos){ var id=codigos[c]; if(codeById[id]==null) codeById[id]=c; }
  var sh=ss_().getSheetByName(ABA); if(!sh){ configurar(); sh=ss_().getSheetByName(ABA); }
  // [v8] anti-duplicado: reconhece o que já existe por chave, CÓDIGO (sem zeros) e NOME
  var last=sh.getLastRow(); var exist={}, existCod={}, existNome={};
  if(last>=2){
    var cur=sh.getRange(2,1,last-1,NCOL).getValues();
    for(var i=0;i<cur.length;i++){
      var rw=cur[i];
      if(rw[C_CHAVE-1]!=='' && rw[C_CHAVE-1]!=null) exist[String(rw[C_CHAVE-1])]=true;
      var cz=desp_(rw[C_COD-1]); if(cz) existCod[cz]=true;
      var nm=norm_(rw[C_PROD-1]||''); if(nm) existNome[nm]=true;
    }
  }
  var novas=[];
  for(var idx=0; idx<produtos.length; idx++){
    var p=produtos[idx]; var nome=String(p.n||''); if(!nome) continue;
    if(nome.charAt(0).toUpperCase()!==letra) continue;
    var cod=codeById[idx]||''; var codZ=desp_(cod);
    if(exist[String(idx)]) continue;
    if(codZ && existCod[codZ]) continue;           // [v8] já existe pelo código
    if(!codZ && existNome[norm_(nome)]) continue;  // [v8] sem código: já existe pelo nome
    novas.push([String(idx), letra, cod, nome, '', '', '', num_(p.e), '', 'Não contado', '']);
  }
  if(novas.length){
    var r0=sh.getLastRow()+1;
    sh.getRange(r0,C_COD,novas.length,1).setNumberFormat('@'); // [v8] código como texto
    sh.getRange(r0,1,novas.length,NCOL).setValues(novas);
  }
  ordenar(); atualizarResumo();
  ui.alert('Letra '+letra+': '+novas.length+' produtos trazidos.');
}

// Envia a letra pra Estoque_Principal (aba Estoque + append na Alterações)
function fecharLetra(){
  var ui=SpreadsheetApp.getUi();
  if(!ESTOQUE_ID){ ui.alert('Configure o ESTOQUE_ID no topo do script.'); return; }
  var r=ui.prompt('Fechar letra','Enviar qual letra para a Estoque_Principal? (ex.: C)',ui.ButtonSet.OK_CANCEL);
  if(r.getSelectedButton()!==ui.Button.OK) return;
  var letra=String(r.getResponseText()||'').trim().toUpperCase().charAt(0);
  if(!letra){ ui.alert('Digite uma letra.'); return; }

  var sh=ss_().getSheetByName(ABA); var last=sh.getLastRow();
  if(last<2){ ui.alert('Sem contagens.'); return; }
  var vals=sh.getRange(2,1,last-1,NCOL).getValues();
  var alvo=[]; var pendentes=0;
  for(var i=0;i<vals.length;i++){
    var v=vals[i]; var prod=v[C_PROD-1]; if(!prod) continue;
    if(String(v[C_LETRA-1]).toUpperCase()!==letra) continue;
    var st=String(v[C_STATUS-1]||'');
    if(st==='Enviado') continue;
    if(st==='Pendente'||st==='Não contado'){ pendentes++; continue; }
    alvo.push({rowSheet:i+2, cod:String(v[C_COD-1]||'').trim(), nome:String(prod),
               loja:v[C_LOJA-1], est:v[C_EST-1], total:num_(v[C_TOTAL-1]), sist:num_(v[C_SIST-1]), status:st});
  }
  if(!alvo.length){ ui.alert('Nada resolvido pra enviar na letra '+letra+(pendentes?(' ('+pendentes+' ainda pendentes/não contados).'):'.')); return; }

  var ext=SpreadsheetApp.openById(ESTOQUE_ID);
  var abaEst=ext.getSheetByName('Estoque');
  var abaAlt=ext.getSheetByName('Alterações');
  if(!abaEst||!abaAlt){ ui.alert('Não achei as abas "Estoque" e/ou "Alterações" na planilha do ID informado.'); return; }

  var eData=abaEst.getRange(1,1,abaEst.getLastRow(),abaEst.getLastColumn()).getValues();
  var hrow=-1,cCod=-1,cAdd=-1,cNome=-1,cLoja=-1,cEst=-1;
  for(var rr=0; rr<Math.min(eData.length,15); rr++){
    for(var cc=0; cc<eData[rr].length; cc++){
      var h=String(eData[rr][cc]).trim();
      if(h==='Qtd loja'){ hrow=rr; cLoja=cc; }
      if(h==='Qtd estoque') cEst=cc;
      if(h==='Código') cCod=cc;
      if(h==='Cód. adicionais') cAdd=cc;
      if(h==='Nome no SysPDV') cNome=cc;
    }
    if(hrow>=0 && cLoja>=0 && cEst>=0 && cNome>=0) break;
  }
  if(hrow<0||cLoja<0||cEst<0||cNome<0){ ui.alert('Não localizei o cabeçalho da aba Estoque (Qtd loja/estoque/Nome no SysPDV).'); return; }
  var byCode={}, byCodeZ={}, byName={}; // [v8] byCodeZ: sem zeros à esquerda
  for(var dr=hrow+1; dr<eData.length; dr++){
    var rowd=eData[dr]; var nm=rowd[cNome]; if(nm===''||nm==null) continue;
    var sheetRow=dr+1;
    if(cCod>=0 && rowd[cCod]){ var cs=String(rowd[cCod]).trim(); byCode[cs]=sheetRow; var csz=desp_(cs); if(csz) byCodeZ[csz]=sheetRow; }
    if(cAdd>=0 && rowd[cAdd]){ String(rowd[cAdd]).split(/[,\s;]+/).forEach(function(x){ if(x){ byCode[x.trim()]=sheetRow; var xz=desp_(x); if(xz) byCodeZ[xz]=sheetRow; } }); }
    var kk=norm_(nm); if(byName[kk]==null) byName[kk]=sheetRow;
  }

  var enviados=0, naoCasou=[];
  for(var j=0;j<alvo.length;j++){
    var a=alvo[j]; var sr=null;
    if(a.cod && byCode[a.cod]!=null) sr=byCode[a.cod];
    else if(a.cod && byCodeZ[desp_(a.cod)]!=null) sr=byCodeZ[desp_(a.cod)]; // [v8] fallback sem zeros
    else if(byName[norm_(a.nome)]!=null) sr=byName[norm_(a.nome)];
    if(sr==null){ naoCasou.push(a.nome); continue; }
    if(a.loja!=='' && a.loja!=null) abaEst.getRange(sr,cLoja+1).setValue(num_(a.loja));
    if(a.est!=='' && a.est!=null) abaEst.getRange(sr,cEst+1).setValue(num_(a.est));
    enviados++;
  }

  var aData=abaAlt.getRange(1,1,Math.min(abaAlt.getLastRow(),15),abaAlt.getLastColumn()).getValues();
  var aCols=abaAlt.getLastColumn();
  var aLetra=-1,aCod=-1,aNome=-1,aObs=-1,aAj=-1,aInat=-1,aDataC=-1;
  for(var hr=0; hr<aData.length; hr++){
    for(var hc=0; hc<aData[hr].length; hc++){
      var hh=String(aData[hr][hc]).trim();
      if(hh==='Letra') aLetra=hc;
      if(hh==='Código') aCod=hc;
      if(hh==='Nome no SysPDV') aNome=hc;
      if(hh==='Observação') aObs=hc;
      if(hh==='Ajuste realizado') aAj=hc;
      if(hh.indexOf('Inativado')===0) aInat=hc;
      if(hh.indexOf('Data')===0) aDataC=hc;
    }
    if(aAj>=0 && aNome>=0) break;
  }
  var novasAlt=[]; var hoje=new Date();
  for(var k2=0;k2<alvo.length;k2++){
    var a2=alvo[k2];
    if(a2.status==='Feito' || a2.status==='Inativado'){
      var linha=[]; for(var z=0;z<aCols;z++) linha.push('');
      if(aLetra>=0) linha[aLetra]=letra;
      if(aCod>=0) linha[aCod]=a2.cod;
      if(aNome>=0) linha[aNome]=a2.nome;
      if(aObs>=0) linha[aObs]=obsAlter_(a2.total,a2.sist);
      if(aAj>=0) linha[aAj]=(a2.status==='Inativado')?'Inativado':ajRealizado_(a2.total,a2.sist);
      if(aInat>=0) linha[aInat]=(a2.status==='Inativado')?'sim':'Não';
      if(aDataC>=0) linha[aDataC]=hoje;
      novasAlt.push(linha);
    }
  }
  if(novasAlt.length) abaAlt.getRange(abaAlt.getLastRow()+1,1,novasAlt.length,aCols).setValues(novasAlt);

  // [v8] marca "Enviado" em lote (uma chamada, não uma por linha)
  var a1s=alvo.map(function(a){ return String.fromCharCode(64+C_STATUS)+a.rowSheet; });
  sh.getRangeList(a1s).setValue('Enviado');
  atualizarResumo();

  var msg='Letra '+letra+':\n• '+enviados+' contagens gravadas na aba Estoque\n• '+novasAlt.length+' linhas adicionadas na Alterações';
  if(naoCasou.length) msg+='\n\nNÃO casaram ('+naoCasou.length+') — reveja manualmente:\n- '+naoCasou.slice(0,20).join('\n- ')+(naoCasou.length>20?'\n- ...':'');
  if(pendentes) msg+='\n\nAtenção: '+pendentes+' itens desta letra ainda estão Pendentes/Não contados (não enviados).';
  ui.alert(msg);
}

function atualizarResumo(){
  var ss=ss_(); var sh=ss.getSheetByName('Resumo'); if(!sh) sh=ss.insertSheet('Resumo',0);
  var c=ss.getSheetByName(ABA);
  var itens=0,ok=0,pend=0,naoc=0,feito=0,inat=0,env=0,lastu=null,porLetra={};
  if(c){
    var last=c.getLastRow();
    if(last>=2){
      var vals=c.getRange(2,1,last-1,NCOL).getValues();
      for(var i=0;i<vals.length;i++){
        var prod=vals[i][C_PROD-1]; if(prod===''||prod==null) continue;
        itens++;
        var st=String(vals[i][C_STATUS-1]||'');
        if(st==='OK') ok++; else if(st==='Pendente') pend++; else if(st==='Não contado') naoc++;
        else if(st==='Feito') feito++; else if(st==='Inativado') inat++; else if(st==='Enviado') env++;
        var L=String(vals[i][C_LETRA-1]||'?');
        if(!porLetra[L]) porLetra[L]={itens:0,falta:0};
        porLetra[L].itens++;
        if(st==='Pendente'||st==='Não contado') porLetra[L].falta++;
        var dt=vals[i][C_DATA-1]; if(dt instanceof Date){ if(!lastu||dt>lastu) lastu=dt; }
      }
    }
  }
  sh.clear();
  var geral=[
    ['RESUMO DA CONTAGEM',''],
    ['Itens na planilha',itens],
    ['Bateu (OK)',ok],
    ['Pendentes',pend],
    ['Não contados',naoc],
    ['Feitos (SysPDV)',feito],
    ['Inativados',inat],
    ['Enviados p/ Estoque',env],
    ['Última atualização', lastu?Utilities.formatDate(lastu,Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm'):'—']
  ];
  sh.getRange(1,1,geral.length,2).setValues(geral);
  sh.getRange(1,1,1,2).merge().setBackground(HEAD_BG).setFontColor(HEAD_TX).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(2,1,geral.length-1,1).setFontWeight('bold');
  sh.getRange(2,2,geral.length-1,1).setHorizontalAlignment('center');
  sh.getRange(1,4,1,3).setValues([['Letra','Itens','Falta resolver']]).setBackground(HEAD_BG).setFontColor(HEAD_TX).setFontWeight('bold').setHorizontalAlignment('center');
  var letras=Object.keys(porLetra).sort();
  if(letras.length){
    var tab=letras.map(function(L){ return [L,porLetra[L].itens,porLetra[L].falta]; });
    sh.getRange(2,4,tab.length,3).setValues(tab).setHorizontalAlignment('center');
  }
  sh.setColumnWidth(1,190); sh.setColumnWidth(2,140);
  sh.setColumnWidth(4,70); sh.setColumnWidth(5,90); sh.setColumnWidth(6,120);
  sh.setRowHeight(1,32);
  try{ sh.setFrozenRows(1); }catch(e){}
}

function limparContagens(){
  var ui=SpreadsheetApp.getUi();
  var r=ui.alert('Nova letra / ciclo','Isso apaga as contagens atuais da aba Contagens. Faça só depois de fechar/enviar a letra. Continuar?',ui.ButtonSet.YES_NO);
  if(r!==ui.Button.YES) return;
  var sh=ss_().getSheetByName(ABA); var last=sh.getLastRow();
  if(last>1) sh.getRange(2,1,last-1,NCOL).clearContent();
  atualizarResumo();
  SpreadsheetApp.getActive().toast('Contagens zeradas.','🧮 Contagem',5);
}

// Recalcula na hora se você digitar quantidade na mão
function onEdit(e){
  try{
    var sh=e.range.getSheet(); if(sh.getName()!==ABA) return;
    var row=e.range.getRow(), col=e.range.getColumn(); if(row<2) return;
    if(col===C_LOJA||col===C_EST||col===C_SIST){
      var loja=sh.getRange(row,C_LOJA).getValue();
      var est=sh.getRange(row,C_EST).getValue();
      var sist=sh.getRange(row,C_SIST).getValue();
      var prod=sh.getRange(row,C_PROD).getValue();
      sh.getRange(row,C_LETRA).setValue(letraDe_(prod));
      sh.getRange(row,C_TOTAL).setValue(totalVal_(loja,est));
      sh.getRange(row,C_AJU).setValue(ajusteVal_(loja,est,sist));
      var cur=String(sh.getRange(row,C_STATUS).getValue()||'');
      if(cur!=='Feito'&&cur!=='Inativado'&&cur!=='Enviado') sh.getRange(row,C_STATUS).setValue(statusAuto_(loja,est,sist));
    }
    if(col===C_LOJA||col===C_EST||col===C_SIST||col===C_STATUS) atualizarResumo();
  }catch(err){}
}

function doPost(e){
  try{
    var body=JSON.parse(e.postData.contents||'{}');
    if(SYNC_TOKEN && body.token!==SYNC_TOKEN) return resp_({ok:false,erro:'token invalido'});
    var itens=body.itens||(body.item?[body.item]:[]);
    if(!itens.length) return resp_({ok:false,erro:'sem itens'});
    gravar_(itens);
    return resp_({ok:true,gravados:itens.length});
  }catch(err){ return resp_({ok:false,erro:String(err)}); }
}

function gravar_(itens){
  var ss=ss_(); var sh=ss.getSheetByName(ABA);
  if(!sh){ configurar(); sh=ss.getSheetByName(ABA); }
  if(sh.getLastRow()===0) sh.getRange(1,1,1,NCOL).setValues([HDR]);
  // [v8] anti-duplicado: localiza a linha por chave, depois por CÓDIGO (sem zeros), depois por NOME
  var last=sh.getLastRow(); var mapa={}, mapaCod={}, mapaNome={};
  if(last>=2){
    var cur=sh.getRange(2,1,last-1,NCOL).getValues();
    for(var i=0;i<cur.length;i++){
      var rw=cur[i]; var rr=i+2;
      var k=String(rw[C_CHAVE-1]); if(k!=='' && k!=='null') mapa[k]=rr;
      var cz=desp_(rw[C_COD-1]); if(cz && mapaCod[cz]==null) mapaCod[cz]=rr;
      var nm=norm_(rw[C_PROD-1]||''); if(nm && mapaNome[nm]==null) mapaNome[nm]=rr;
    }
  }
  var agora=new Date();
  for(var j=0;j<itens.length;j++){
    var it=itens[j];
    var chave=String(it.key!=null?it.key:(it.codigo||it.nome||''));
    var codZ=desp_(it.codigo); var nomeN=norm_(it.nome||'');
    // [v8.3] código e nome mandam; chave só vale se o NOME da linha for o mesmo
    // (chaves velhas de inativados podem colidir com ids novos e sobrescrever outra linha)
    var r=null;
    if(codZ) r=mapaCod[codZ];
    if(!r && nomeN) r=mapaNome[nomeN];
    if(!r){
      var rc=mapa[chave];
      if(rc && norm_(sh.getRange(rc,C_PROD).getValue()||'')===nomeN) r=rc;
    }
    var nova=false;
    if(!r){ r=sh.getLastRow()+1; nova=true; }
    mapa[chave]=r;
    if(codZ) mapaCod[codZ]=r;
    if(nomeN) mapaNome[nomeN]=r;
    var cur2=nova?'':String(sh.getRange(r,C_STATUS).getValue()||'');
    var st=(cur2==='Feito'||cur2==='Inativado'||cur2==='Enviado')?cur2:statusAuto_(it.qtdLoja,it.qtdEstoque,it.sistema);
    sh.getRange(r,C_COD).setNumberFormat('@'); // [v8] código como texto
    sh.getRange(r,1,1,NCOL).setValues([[
      chave, letraDe_(it.nome), it.codigo||'', it.nome||'',
      num_(it.qtdLoja), num_(it.qtdEstoque), num_(it.qtdLoja)+num_(it.qtdEstoque),
      num_(it.sistema), ajusteVal_(it.qtdLoja,it.qtdEstoque,it.sistema), st,
      it.ts?new Date(it.ts):agora
    ]]);
  }
  atualizarResumo();
}

// Atualiza "Estoque sistema" na Contagens e na Estoque_Principal, a partir do dados.json
// (rode DEPOIS de subir o dados.json novo no GitHub)
function atualizarEstoqueSistema(){
  var ui=SpreadsheetApp.getUi();
  var resp=UrlFetchApp.fetch(DADOS_URL,{muteHttpExceptions:true});
  if(resp.getResponseCode()!==200){ ui.alert('Não consegui baixar o dados.json ('+resp.getResponseCode()+').'); return; }
  var d=JSON.parse(resp.getContentText());
  var produtos=d.produtos||[]; var codigos=d.codigos||{};
  var eByCode={}, eByCodeZ={}, eByName={};
  for(var c in codigos){ var id=codigos[c]; if(produtos[id]!=null){ var e=num_(produtos[id].e);
    eByCode[String(c).trim()]=e; var z=desp_(c); if(z) eByCodeZ[z]=e; } }
  for(var k=0;k<produtos.length;k++){ var n=norm_(produtos[k].n); if(eByName[n]==null) eByName[n]=num_(produtos[k].e); }
  function estoqueDe_(cod,nome){
    cod=String(cod||'').trim();
    if(cod){ if(eByCode[cod]!=null) return eByCode[cod]; var z=desp_(cod); if(z&&eByCodeZ[z]!=null) return eByCodeZ[z]; }
    var nm=norm_(nome); if(nm&&eByName[nm]!=null) return eByName[nm];
    return null;
  }
  var sh=ss_().getSheetByName(ABA); var cCont=0, semC=0, congeladas=0;
  if(sh){ var last=sh.getLastRow();
    if(last>=2){ var rng=sh.getRange(2,1,last-1,NCOL); var vals=rng.getValues();
      for(var r=0;r<vals.length;r++){ var v=vals[r]; if(!v[C_PROD-1]) continue;
        // [v8.2] linha já contada ou resolvida: NÃO mexe — estoque/total/ajuste ficam
        // congelados relatando o momento da contagem (o que você viu e o que fez).
        var st=String(v[C_STATUS-1]||'');
        if(st==='Feito'||st==='Inativado'||st==='Enviado'||contou_(v[C_LOJA-1],v[C_EST-1])){ congeladas++; continue; }
        var novo=estoqueDe_(v[C_COD-1], v[C_PROD-1]);
        if(novo==null){ semC++; continue; }
        v[C_SIST-1]=novo;
        cCont++; }
      rng.setValues(vals); } }
  var cEst=0, semCasar=0;
  if(ESTOQUE_ID){ var ext=SpreadsheetApp.openById(ESTOQUE_ID); var abaEst=ext.getSheetByName('Estoque');
    if(abaEst){ var eData=abaEst.getRange(1,1,abaEst.getLastRow(),abaEst.getLastColumn()).getValues();
      var hrow=-1,cCod=-1,cAdd=-1,cNome=-1,cSist=-1;
      for(var rr=0;rr<Math.min(eData.length,15);rr++){ for(var cc=0;cc<eData[rr].length;cc++){ var h=String(eData[rr][cc]).trim();
        if(h==='Estoque sistema'){ hrow=rr; cSist=cc; } if(h==='Código'||h==='Códigos') cCod=cc;
        if(h==='Cód. adicionais') cAdd=cc; if(h==='Nome no SysPDV') cNome=cc; } if(hrow>=0&&cSist>=0&&cNome>=0) break; }
      if(hrow>=0&&cSist>=0&&cNome>=0){ var col=[];
        for(var dr=hrow+1; dr<eData.length; dr++){ var rowd=eData[dr]; var nome=rowd[cNome]; var atual=rowd[cSist];
          if(nome===''||nome==null){ col.push([atual]); continue; } var nv=null;
          if(cCod>=0 && rowd[cCod]) nv=estoqueDe_(rowd[cCod], nome);
          if(nv==null && cAdd>=0 && rowd[cAdd]){ var parts=String(rowd[cAdd]).split(/[,\s;\/]+/);
            for(var pi=0;pi<parts.length;pi++){ var pc=parts[pi].trim(); if(pc){ var e2=estoqueDe_(pc,nome); if(e2!=null){ nv=e2; break; } } } }
          if(nv==null) nv=estoqueDe_('',nome);
          if(nv==null){ semCasar++; col.push([atual]); } else { col.push([nv]); cEst++; } }
        abaEst.getRange(hrow+2, cSist+1, col.length, 1).setValues(col); } } }
  atualizarResumo();
  ui.alert('Estoque atualizado:\n• Contagens: '+cCont+' linhas não contadas atualizadas'+
           (congeladas?('\n• '+congeladas+' linhas já contadas/resolvidas preservadas (não mexi)'):'')+
           (semC?('\n• '+semC+' sem casar'):'')+
           '\n• Estoque_Principal: '+cEst+' produtos'+(semCasar?('\n• '+semCasar+' sem casar'):''));
}

function doGet(){ return resp_({ok:true,servico:'contagem-estoque-lc',versao:8.3}); }