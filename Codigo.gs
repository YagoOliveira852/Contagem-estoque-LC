/**
 * Contagem de estoque — Loja da Construção  (v9.3)
 * -----------------------------------------------------------------
 * v9.3: a aba "Não contados" virou REGISTRO ACUMULADO, não mais fotografia.
 *       Cada execução acrescenta a letra pedida e revisa TODAS as letras que já
 *       estão lá: o produto que aparecer contado (ou Feito/Inativado/Enviado)
 *       na aba Contagens sai da lista sozinho. Produto de letra que já foi
 *       apagada da Contagens (fim de ciclo) fica preservado — não dá pra
 *       reconferir, então não some por engano. Digite * pra só revisar, sem
 *       acrescentar letra nova. O alerta mostra o total pendente por letra.
 *
 * v9.2: ETIQUETA SAIU DA ABA CONTAGENS. Agora tem aba própria "Etiquetas"
 *       (Data, Letra, Código, Produto, Chave, Impressa?) e marcar etiqueta
 *       NUNCA mais encosta na aba Contagens.
 *       BUG QUE ISSO CORRIGE: na v9.0/v9.1, marcar etiqueta de um produto já
 *       contado/enviado mandava o item por gravar_. A linha fechada só era
 *       preservada se as quantidades batessem — como a marcação vai sem
 *       quantidade (0/0), a comparação falhava e a linha era SOBRESCRITA com
 *       zeros, apagando a contagem antiga. Além da separação em aba, gravar_
 *       ganhou salvaguarda: item sem quantidade preenchida não regrava linha
 *       fechada, em nenhuma hipótese.
 *       A coluna "Etiqueta nova" (12ª) foi removida — rode "Configurar /
 *       reestilizar" uma vez: ele migra o que estava marcado com "Sim" pra aba
 *       Etiquetas e só depois apaga a coluna. Isso também conserta o
 *       carregarLetra, que na v9.0 montava 11 colunas num range de 12 e
 *       quebrava ao trazer uma letra nova.
 *       Marcar o mesmo produto de novo não duplica: atualiza a data e reabre
 *       pra impressão. "Marcar como impressas" não apaga o histórico da aba.
 *
 * v9.1: menu "📝 Ver produtos NÃO contados da letra". Gera/reescreve a aba
 *       "Não contados" com o que ficou de fora naquela letra, separando quem
 *       está na aba Contagens sem quantidade de quem NUNCA foi carregado na aba
 *       (produtos anteriores à automação, comparados contra o dados.json).
 *       Quem você contou (status OK, com quantidade) nunca aparece nessa lista.
 *       A aba é uma FOTOGRAFIA: cada execução apaga e reescreve. Nada é enviado
 *       pra Estoque_Principal — é só pra você saber o que falta conferir.
 *
 * v9.0: duas funcionalidades novas pra não perder tempo/produto durante a
 *       contagem:
 *  1. ETIQUETA NOVA: nova coluna "Etiqueta nova" na aba Contagens. O app
 *     manda esse sinal junto da contagem (mesmo sem quantidade preenchida) —
 *     a linha fica destacada em âmbar. Menu novo "🏷️ Ver produtos p/
 *     etiqueta nova" lista tudo marcado; "🏷️ Limpar marcações de etiqueta"
 *     zera depois de imprimir.
 *  2. CÓDIGO NOVO (vincular sem parar a contagem): quando o app não acha um
 *     código de barras, agora dá pra vincular na hora a um produto já
 *     existente (buscado por nome). Isso NÃO mexe na aba Contagens — vai pra
 *     uma aba nova "Códigos novos", só de revisão: você confere depois, no
 *     computador, e adiciona o código ao dados.json (a skill de atualização
 *     de estoque já faz isso a partir de uma lista). O app também lembra
 *     esse vínculo localmente (no aparelho) pra reconhecer o código de novo
 *     na mesma contagem, sem perguntar de novo.
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
 * v8.4: contagem avulsa fora da letra do ciclo, sem risco:
 *       - "Fechar letra" aceita * para enviar TODAS as letras resolvidas de uma
 *         vez (a aba Alterações recebe a letra correta de cada linha);
 *       - "Limpar contagens" avisa (com detalhe por letra) se existir contagem ou
 *         resolução ainda não enviada em QUALQUER letra antes de apagar.
 * v8.5: congelamento completo — linha Enviado/Feito/Inativado agora também fica
 *       protegida do APP: reenvio do celular com as mesmas quantidades (botão
 *       "Sincronizar", fila antiga no localStorage, re-scan) não regrava a linha.
 *       Só uma recontagem com números DIFERENTES regrava — e volta o status pra
 *       OK/Pendente, reentrando no fluxo de envio.
 *
 * SETUP: cole, Salve, autorize, reimplante NOVA VERSÃO do Web App.
 */

var SYNC_TOKEN='lc-2026';
var DADOS_URL='https://raw.githubusercontent.com/YagoOliveira852/Contagem-estoque-LC/main/dados.json';
var ESTOQUE_ID='1DoUEO-QfwPcdYHFIsroEXpnmO0x4GSVIzFRamJEaoYc'; // [v8] Estoque_Principal ATUAL (antes: 15GKEgro... = Antigo_Estoque_Principal)
var ABA='Contagens';
var ABA_CODNOVOS='Códigos novos'; // [v9] revisão manual: vínculos feitos no app entre código escaneado e produto existente
var HDR_CODNOVOS=['Data','Código escaneado','Produto vinculado','Chave produto','Letra'];
var ABA_ETIQ='Etiquetas'; // [v9.2] etiqueta nova saiu da aba Contagens e virou aba própria
var HDR_ETIQ=['Data','Letra','Código','Produto','Chave','Impressa?'];
var ABA_NAOCONT='Não contados'; // [v9.1] fotografia do que ficou de fora quando você fecha a letra
var HDR_NAOCONT=['Letra','Código','Produto','Estoque sistema','Origem','Detectado em'];
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
    .addItem('📝 Ver produtos NÃO contados da letra','listarNaoContados') // [v9.1]
    .addSeparator()
    .addItem('Atualizar estoque do sistema (via dados.json)','atualizarEstoqueSistema')
    .addSeparator()
    .addItem('Configurar / reestilizar','configurar')
    .addItem('Atualizar resumo','atualizarResumo')
    .addItem('Limpar contagens (nova letra/ciclo)','limparContagens')
    .addSeparator()
    .addItem('🏷️ Ver etiquetas pendentes','listarEtiquetas')             // [v9.2]
    .addItem('🏷️ Marcar etiquetas como impressas','limparEtiquetas')     // [v9.2]
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
  var data=sh.getDataRange().getValues(); var rows=[]; var migrar=[]; // [v9.2]
  if(data.length>1){
    var head=data[0].map(function(x){return String(x).trim();});
    function ix(n){ return head.indexOf(n); }
    var iCh=ix('Chave'),iCo=ix('Código'),iPr=ix('Produto'),iLo=ix('Qtd loja'),
        iEs=ix('Qtd estoque'),iSi=ix('Estoque sistema'),iSt=ix('Status'),iIn=ix('Inativado?'),iDa=ix('Atualizado em'),
        iEt=ix('Etiqueta nova'); // [v9.2] só pra MIGRAR o que já estava marcado
    for(var r=1;r<data.length;r++){
      var row=data[r]; var prod=iPr>=0?row[iPr]:row[3];
      if(prod===''||prod==null) continue;
      var st=''; if(iSt>=0) st=row[iSt];
      else if(iIn>=0 && String(row[iIn]).toLowerCase()==='sim') st='Inativado';
      rows.push({chave:iCh>=0?row[iCh]:(row[0]||prod),cod:iCo>=0?row[iCo]:'',prod:prod,
        loja:iLo>=0?row[iLo]:'',est:iEs>=0?row[iEs]:'',sist:iSi>=0?row[iSi]:'',status:st,data:iDa>=0?row[iDa]:''});
      // [v9.2] marcação antiga na coluna velha? manda pra aba Etiquetas antes de sumir com a coluna
      if(iEt>=0 && String(row[iEt]||'')==='Sim'){
        migrar.push({codigo:iCo>=0?row[iCo]:'', nome:prod, chave:iCh>=0?row[iCh]:''});
      }
    }
  }
  if(migrar.length){ gravarEtiquetas_(migrar); }
  rows.sort(function(a,b){ return String(a.prod).localeCompare(String(b.prod),'pt'); });
  sh.clear();
  sh.getRange(1,1,sh.getMaxRows(),sh.getMaxColumns()).clearDataValidations(); // remove validação antiga (senão barra "Não contado"/"Enviado")
  // [v9.2] some de vez com a 12ª coluna ("Etiqueta nova") — o que estava marcado já foi migrado acima
  if(sh.getMaxColumns()>NCOL){ sh.deleteColumns(NCOL+1, sh.getMaxColumns()-NCOL); }
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
  var r=ui.prompt('Fechar letra','Enviar qual letra para a Estoque_Principal? (ex.: C — ou * para TODAS as letras resolvidas)',ui.ButtonSet.OK_CANCEL);
  if(r.getSelectedButton()!==ui.Button.OK) return;
  var letra=String(r.getResponseText()||'').trim().toUpperCase().charAt(0);
  if(!letra){ ui.alert('Digite uma letra (ou * para todas).'); return; }
  var todas=(letra==='*'); // [v8.4] envia itens avulsos de qualquer letra numa tacada só

  var sh=ss_().getSheetByName(ABA); var last=sh.getLastRow();
  if(last<2){ ui.alert('Sem contagens.'); return; }
  var vals=sh.getRange(2,1,last-1,NCOL).getValues();
  var alvo=[]; var pendentes=0;
  for(var i=0;i<vals.length;i++){
    var v=vals[i]; var prod=v[C_PROD-1]; if(!prod) continue;
    if(!todas && String(v[C_LETRA-1]).toUpperCase()!==letra) continue;
    var st=String(v[C_STATUS-1]||'');
    if(st==='Enviado') continue;
    if(st==='Pendente'||st==='Não contado'){ pendentes++; continue; }
    alvo.push({rowSheet:i+2, letra:String(v[C_LETRA-1]||'').toUpperCase(), cod:String(v[C_COD-1]||'').trim(), nome:String(prod),
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
      if(aLetra>=0) linha[aLetra]=a2.letra||letra; // [v8.4] letra da própria linha
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

  var msg=(todas?'Todas as letras':'Letra '+letra)+':\n• '+enviados+' contagens gravadas na aba Estoque\n• '+novasAlt.length+' linhas adicionadas na Alterações';
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
  // [v8.4] antes de apagar, procura contagem/resolução NÃO enviada em qualquer letra
  var sh0=ss_().getSheetByName(ABA); var last0=sh0?sh0.getLastRow():0;
  var porLetra={};
  if(last0>=2){
    var vals0=sh0.getRange(2,1,last0-1,NCOL).getValues();
    for(var i0=0;i0<vals0.length;i0++){
      var v0=vals0[i0]; if(!v0[C_PROD-1]) continue;
      var st0=String(v0[C_STATUS-1]||'');
      if(st0==='Enviado'||st0==='Não contado') continue;
      // OK/Pendente/Feito/Inativado = trabalho seu que ainda não foi pra Estoque_Principal
      var L0=String(v0[C_LETRA-1]||'?').toUpperCase();
      porLetra[L0]=(porLetra[L0]||0)+1;
    }
  }
  var letras0=Object.keys(porLetra).sort();
  if(letras0.length){
    var detalhe=letras0.map(function(L){ return '• letra '+L+': '+porLetra[L]+' item(ns)'; }).join('\n');
    var r0=ui.alert('⚠️ Contagens NÃO enviadas seriam apagadas!',
      'Ainda existem contagens/resoluções que não foram enviadas pra Estoque_Principal:\n\n'+detalhe+
      '\n\nRode "Fechar letra" (use * para todas) antes de limpar.\n\nApagar MESMO ASSIM, perdendo esses dados?',
      ui.ButtonSet.YES_NO);
    if(r0!==ui.Button.YES) return;
  }
  var r=ui.alert('Nova letra / ciclo','Isso apaga as contagens atuais da aba Contagens. Faça só depois de fechar/enviar a letra. Continuar?',ui.ButtonSet.YES_NO);
  if(r!==ui.Button.YES) return;
  var sh=ss_().getSheetByName(ABA); var last=sh.getLastRow();
  if(last>1) sh.getRange(2,1,last-1,NCOL).clearContent();
  atualizarResumo();
  SpreadsheetApp.getActive().toast('Contagens zeradas.','🧮 Contagem',5);
}

// [v9.2] Pega (ou cria) a aba própria das etiquetas
function abaEtiquetas_(){
  var ss=ss_(); var sh=ss.getSheetByName(ABA_ETIQ);
  if(!sh){
    sh=ss.insertSheet(ABA_ETIQ);
    sh.getRange(1,1,1,HDR_ETIQ.length).setValues([HDR_ETIQ])
      .setBackground(HEAD_BG).setFontColor(HEAD_TX).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1,140); sh.setColumnWidth(2,55); sh.setColumnWidth(3,150);
    sh.setColumnWidth(4,330); sh.setColumnWidth(5,90); sh.setColumnWidth(6,100);
    sh.getRange(2,3,LINHAS,1).setNumberFormat('@');            // código sempre texto
    sh.getRange(2,1,LINHAS,1).setNumberFormat('dd/mm/yyyy hh:mm');
    sh.getRange(2,6,LINHAS,1).setHorizontalAlignment('center');
    var v=SpreadsheetApp.newDataValidation().requireValueInList(['','Sim'],true).setAllowInvalid(false).build();
    sh.getRange(2,6,LINHAS,1).setDataValidation(v);
    sh.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Sim').setBackground(VERDE_BG).setFontColor(VERDE_TX)
      .setRanges([sh.getRange(2,6,LINHAS,1)]).build()]);
  }
  return sh;
}

// [v9.2] Registra a marcação de etiqueta na aba própria — sem encostar na aba Contagens.
// Uma linha por produto: marcar de novo só atualiza a data e reabre pra impressão.
function gravarEtiquetas_(itens){
  var sh=abaEtiquetas_();
  var last=sh.getLastRow();
  var porCod={}, porNome={};
  if(last>=2){
    var cur=sh.getRange(2,1,last-1,HDR_ETIQ.length).getValues();
    for(var i=0;i<cur.length;i++){
      var cz=desp_(cur[i][2]); if(cz && porCod[cz]==null) porCod[cz]=i+2;
      var nm=norm_(cur[i][3]||''); if(nm && porNome[nm]==null) porNome[nm]=i+2;
    }
  }
  var agora=new Date(), novas=[];
  for(var j=0;j<itens.length;j++){
    var it=itens[j];
    var nome=String(it.nome||''); if(!nome) continue;
    var cod=String(it.codigo||''); var codZ=desp_(cod);
    var ts=it.ts?new Date(it.ts):agora;
    var r=(codZ&&porCod[codZ]!=null)?porCod[codZ]:porNome[norm_(nome)];
    if(r!=null){
      sh.getRange(r,1).setValue(ts);   // já estava na lista: só atualiza a data
      sh.getRange(r,6).setValue('');   // e reabre pra impressão
      continue;
    }
    var linha=[ts, letraDe_(nome), cod, nome, it.chave!=null?String(it.chave):'', ''];
    novas.push(linha);
    var nr=last+novas.length;
    if(codZ) porCod[codZ]=nr;
    porNome[norm_(nome)]=nr;
  }
  if(novas.length){
    var r0=sh.getLastRow()+1;
    sh.getRange(r0,3,novas.length,1).setNumberFormat('@');
    sh.getRange(r0,1,novas.length,HDR_ETIQ.length).setValues(novas);
  }
}

// [v9.2] Lista o que está pendente de imprimir (aba Etiquetas, coluna "Impressa?" vazia)
function listarEtiquetas(){
  var ui=SpreadsheetApp.getUi();
  var sh=abaEtiquetas_(); var last=sh.getLastRow();
  if(last<2){ ui.alert('Nenhum produto marcado pra etiqueta nova no momento.'); return; }
  var vals=sh.getRange(2,1,last-1,HDR_ETIQ.length).getValues();
  var achados=[];
  for(var i=0;i<vals.length;i++){
    var v=vals[i]; if(!v[3]) continue;
    if(String(v[5]||'')==='Sim') continue; // já impressa
    achados.push('• '+v[3]+(v[2]?' — '+v[2]:''));
  }
  sh.activate();
  if(!achados.length){ ui.alert('✅ Nenhuma etiqueta pendente — tudo que está na aba "'+ABA_ETIQ+'" já foi marcado como impresso.'); return; }
  ui.alert('🏷️ '+achados.length+' produto(s) esperando etiqueta:\n\n'+achados.slice(0,40).join('\n')+(achados.length>40?'\n• ...':'')+'\n\n(lista completa na aba "'+ABA_ETIQ+'")');
}

// [v9.2] Marca as pendentes como impressas (não apaga o histórico da aba)
function limparEtiquetas(){
  var ui=SpreadsheetApp.getUi();
  var sh=abaEtiquetas_(); var last=sh.getLastRow();
  if(last<2){ ui.alert('A aba "'+ABA_ETIQ+'" está vazia.'); return; }
  var vals=sh.getRange(2,1,last-1,HDR_ETIQ.length).getValues();
  var linhas=[];
  for(var i=0;i<vals.length;i++){ if(vals[i][3] && String(vals[i][5]||'')!=='Sim') linhas.push(i+2); }
  if(!linhas.length){ ui.alert('Nenhuma etiqueta pendente pra marcar como impressa.'); return; }
  var r=ui.alert('Etiquetas impressas','Marcar '+linhas.length+' etiqueta(s) como impressas? (as linhas ficam na aba, só saem da lista de pendentes)',ui.ButtonSet.YES_NO);
  if(r!==ui.Button.YES) return;
  var rl=linhas.map(function(L){ return 'F'+L; });
  sh.getRangeList(rl).setValue('Sim');
  SpreadsheetApp.getActive().toast(linhas.length+' etiqueta(s) marcada(s) como impressa(s).','🏷️ Etiqueta',5);
}

// [v9] Pega (ou cria) a aba de revisão dos códigos vinculados manualmente no app
function abaCodigosNovos_(){
  var ss=ss_(); var sh=ss.getSheetByName(ABA_CODNOVOS);
  if(!sh){
    sh=ss.insertSheet(ABA_CODNOVOS);
    sh.getRange(1,1,1,HDR_CODNOVOS.length).setValues([HDR_CODNOVOS])
      .setBackground(HEAD_BG).setFontColor(HEAD_TX).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1,140); sh.setColumnWidth(2,150); sh.setColumnWidth(3,300); sh.setColumnWidth(4,90); sh.setColumnWidth(5,55);
    sh.getRange(2,2,LINHAS,1).setNumberFormat('@'); // código sempre texto
    sh.getRange(2,1,LINHAS,1).setNumberFormat('dd/mm/yyyy hh:mm');
  }
  return sh;
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
    // [v9] separa vínculos de código novo (vão pra aba de revisão) das contagens normais
    // [v9.2] etiqueta virou aba própria: marcar etiqueta NÃO passa mais pela aba Contagens
    var codNovos=[], contagens=[], etiquetas=[];
    for(var i=0;i<itens.length;i++){
      var it=itens[i];
      if(it.tipo==='codigo_novo'){ codNovos.push(it); continue; }
      if(it.etiqueta) etiquetas.push(it);
      // só vira contagem se veio quantidade de verdade (marcação pura de etiqueta não conta)
      if(it.tipo!=='etiqueta' && contou_(it.qtdLoja,it.qtdEstoque)) contagens.push(it);
    }
    if(contagens.length) gravar_(contagens);
    if(codNovos.length) gravarCodigosNovos_(codNovos);
    if(etiquetas.length) gravarEtiquetas_(etiquetas);
    return resp_({ok:true,gravados:itens.length});
  }catch(err){ return resp_({ok:false,erro:String(err)}); }
}

// [v9] Registra na aba "Códigos novos" os vínculos feitos no app (código sem cadastro
// ligado a um produto existente) — pra revisão manual e inclusão no dados.json.
function gravarCodigosNovos_(itens){
  var sh=abaCodigosNovos_();
  var agora=new Date();
  var linhas=itens.map(function(it){
    return [it.ts?new Date(it.ts):agora, it.codigo||'', it.nome||'', it.chave!=null?String(it.chave):'', letraDe_(it.nome)];
  });
  sh.getRange(sh.getLastRow()+1,1,linhas.length,HDR_CODNOVOS.length).setValues(linhas);
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
    var st;
    if(cur2==='Feito'||cur2==='Inativado'||cur2==='Enviado'){
      // [v8.5] linha FECHADA: congelada também contra o app.
      // Reenvio do celular com as MESMAS quantidades (botão Sincronizar, fila antiga)
      // não toca na linha. Só regrava se a contagem mudou de verdade (recontagem) —
      // e aí volta pro fluxo com status recalculado, pra ser enviada de novo.
      // [v9.2] SALVAGUARDA: item sem quantidade preenchida NUNCA regrava linha fechada.
      // (era isso que zerava a contagem antiga quando você só marcava etiqueta)
      if(!contou_(it.qtdLoja,it.qtdEstoque)) continue;
      var lojaAtual=num_(sh.getRange(r,C_LOJA).getValue());
      var estAtual=num_(sh.getRange(r,C_EST).getValue());
      if(lojaAtual===num_(it.qtdLoja) && estAtual===num_(it.qtdEstoque)) continue;
      st=statusAuto_(it.qtdLoja,it.qtdEstoque,it.sistema);
    } else {
      st=statusAuto_(it.qtdLoja,it.qtdEstoque,it.sistema);
    }
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


// [v9.3] Pega (ou cria) a aba-registro do que ainda falta contar.
// Corrige o cabeçalho se vier de uma versão anterior.
function abaNaoContados_(){
  var ss=ss_(); var sh=ss.getSheetByName(ABA_NAOCONT);
  if(!sh){
    sh=ss.insertSheet(ABA_NAOCONT);
    sh.setFrozenRows(1);
    sh.setColumnWidth(1,55); sh.setColumnWidth(2,150); sh.setColumnWidth(3,330);
    sh.setColumnWidth(4,120); sh.setColumnWidth(5,210); sh.setColumnWidth(6,140);
    sh.getRange(2,2,LINHAS,1).setNumberFormat('@');          // código sempre texto
    sh.getRange(2,6,LINHAS,1).setNumberFormat('dd/mm/yyyy hh:mm');
    sh.getRange(2,1,LINHAS,1).setHorizontalAlignment('center');
  }
  var cab=sh.getRange(1,1,1,HDR_NAOCONT.length).getValues()[0].join('|');
  if(cab!==HDR_NAOCONT.join('|')){
    sh.getRange(1,1,1,HDR_NAOCONT.length).setValues([HDR_NAOCONT])
      .setBackground(HEAD_BG).setFontColor(HEAD_TX).setFontWeight('bold');
  }
  return sh;
}

// [v9.3] REGISTRO ACUMULADO do que falta contar — vai somando letra após letra.
// A cada execução:
//   1) revisa TUDO que já está na aba: o produto que agora aparece contado (ou
//      resolvido como Feito/Inativado/Enviado) na aba Contagens SAI da lista;
//   2) acrescenta o que falta na letra perguntada, sem duplicar o que já estava.
// Produto de uma letra que já foi apagada da aba Contagens (fim de ciclo) fica
// preservado no registro — não dá pra reconferir, então não some sozinho.
// Duas origens na coluna "Origem":
//   • "Na aba, sem contar"  = a linha existe na Contagens e está sem quantidade;
//   • "Nunca carregado (dados.json)" = produto da letra que nem chegou na aba.
// Quem você contou (inclusive contando ZERO) nunca entra aqui.
function listarNaoContados(){
  var ui=SpreadsheetApp.getUi();
  var r=ui.prompt('Produtos não contados',
    'Qual letra acrescentar ao registro? (ex.: C)\n\nDeixe * para só revisar o que já está na aba, sem acrescentar letra nova.',
    ui.ButtonSet.OK_CANCEL);
  if(r.getSelectedButton()!==ui.Button.OK) return;
  var letra=String(r.getResponseText()||'').trim().toUpperCase().charAt(0);
  if(!letra){ ui.alert('Digite uma letra (ou * para só revisar).'); return; }
  var soRevisar=(letra==='*');

  var sh=ss_().getSheetByName(ABA); var last=sh?sh.getLastRow():0;
  var vals=(sh&&last>=2)? sh.getRange(2,1,last-1,NCOL).getValues() : [];

  // estado atual da aba Contagens, por código (sem zeros) e por nome
  var feitoCod={}, feitoNome={}, naAba={}, naAbaCod={}, naAbaNome={};
  var itensLetra=[], contados=0, resolvidos=0;
  for(var i=0;i<vals.length;i++){
    var v=vals[i]; var nome=v[C_PROD-1]; if(!nome) continue;
    var L=String(v[C_LETRA-1]||'').toUpperCase();
    var cz=desp_(v[C_COD-1]); var nz=norm_(nome);

    if(v[C_CHAVE-1]!==''&&v[C_CHAVE-1]!=null) naAba[String(v[C_CHAVE-1])]=true;
    if(cz) naAbaCod[cz]=true;
    if(nz) naAbaNome[nz]=true;

    var st=String(v[C_STATUS-1]||'');
    var jaResolvido = contou_(v[C_LOJA-1],v[C_EST-1]) || st==='Feito' || st==='Inativado' || st==='Enviado';
    if(jaResolvido){ if(cz) feitoCod[cz]=true; if(nz) feitoNome[nz]=true; }

    if(soRevisar || L!==letra) continue;
    if(contou_(v[C_LOJA-1],v[C_EST-1])){ contados++; continue; }
    if(st==='Feito'||st==='Inativado'||st==='Enviado'){ resolvidos++; continue; }
    itensLetra.push([L||letra, String(v[C_COD-1]||''), String(nome), num_(v[C_SIST-1]), 'Na aba, sem contar', '']);
  }

  // 1) revisa o registro que já existe
  var dest=abaNaoContados_(); var lastR=dest.getLastRow();
  var antigos=(lastR>=2)? dest.getRange(2,1,lastR-1,HDR_NAOCONT.length).getValues() : [];
  var mantidos=[], saiu=0, jaTem={};
  for(var k=0;k<antigos.length;k++){
    var a=antigos[k]; var nomeA=a[2]; if(!nomeA) continue;
    var czA=desp_(a[1]); var nzA=norm_(nomeA);
    if((czA&&feitoCod[czA]) || feitoNome[nzA]){ saiu++; continue; } // contou depois: sai
    mantidos.push(a);
    if(czA) jaTem['C:'+czA]=true;
    jaTem['N:'+nzA]=true;
  }

  // 2) produtos da letra que nunca chegaram na aba Contagens
  var nuncaCarregado=0, erroFetch=null;
  if(!soRevisar){
    try{
      var d=JSON.parse(UrlFetchApp.fetch(DADOS_URL,{muteHttpExceptions:true}).getContentText());
      var produtos=d.produtos||[], codigos=d.codigos||{};
      var codeById={}; for(var c in codigos){ var id=codigos[c]; if(codeById[id]==null) codeById[id]=c; }
      for(var idx=0; idx<produtos.length; idx++){
        var p=produtos[idx]; var nm=String(p.n||''); if(!nm) continue;
        if(letraDe_(nm)!==letra) continue;
        var cod=codeById[idx]||''; var codZ=desp_(cod);
        if(naAba[String(idx)]) continue;
        if(codZ && naAbaCod[codZ]) continue;
        if(naAbaNome[norm_(nm)]) continue;
        itensLetra.push([letra, cod, nm, num_(p.e), 'Nunca carregado (dados.json)', '']);
        nuncaCarregado++;
      }
    }catch(e){ erroFetch=String(e); }
  }

  // 3) junta sem duplicar
  var agora=new Date(), entrou=0;
  for(var j=0;j<itensLetra.length;j++){
    var it=itensLetra[j]; var czI=desp_(it[1]); var nzI=norm_(it[2]);
    if((czI&&jaTem['C:'+czI]) || jaTem['N:'+nzI]) continue; // já estava no registro
    it[5]=agora; // detectado em
    mantidos.push(it); entrou++;
    if(czI) jaTem['C:'+czI]=true;
    jaTem['N:'+nzI]=true;
  }

  mantidos.sort(function(x,y){
    var lx=String(x[0]||''), ly=String(y[0]||'');
    if(lx!==ly) return lx<ly? -1 : 1;
    var nx=norm_(x[2]), ny=norm_(y[2]);
    return nx<ny? -1 : (nx>ny? 1 : 0);
  });

  if(lastR>1) dest.getRange(2,1,lastR-1,HDR_NAOCONT.length).clearContent();
  if(mantidos.length){
    dest.getRange(2,2,mantidos.length,1).setNumberFormat('@');
    dest.getRange(2,1,mantidos.length,HDR_NAOCONT.length).setValues(mantidos);
  }
  dest.activate();

  var porLetra={};
  for(var m=0;m<mantidos.length;m++){ var LL=String(mantidos[m][0]||'?'); porLetra[LL]=(porLetra[LL]||0)+1; }
  var resumo=[]; for(var L2 in porLetra) resumo.push(L2+': '+porLetra[L2]);
  resumo.sort();

  var msg=(soRevisar?'Revisão do registro':'Letra '+letra)+'\n\n';
  if(!soRevisar){
    msg+='• '+entrou+' produto(s) novo(s) no registro';
    if(nuncaCarregado) msg+=' (sendo '+nuncaCarregado+' que nunca foram carregados na aba)';
    msg+='\n';
  }
  msg+='• '+saiu+' saíram (foram contados desde a última vez)\n';
  msg+='• '+mantidos.length+' ainda faltando no total\n';
  if(resumo.length) msg+='\nPor letra — '+resumo.join(' | ');
  if(!soRevisar) msg+='\n\nNa letra '+letra+', ficaram de fora da lista:\n• '+contados+' que você contou\n• '+resolvidos+' resolvidos sem quantidade';
  if(erroFetch) msg+='\n\n⚠️ Não consegui checar os nunca carregados (dados.json inacessível): '+erroFetch;
  ui.alert(msg);
}

function doGet(){ return resp_({ok:true,servico:'contagem-estoque-lc',versao:9.3}); }