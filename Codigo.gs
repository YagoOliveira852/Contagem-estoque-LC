/**
 * Contagem de estoque — Loja da Construção  (v3, trabalho por Letra)
 * -----------------------------------------------------------------
 * A aba "Contagens" recebe o app e é sua superfície de trabalho, enxuta:
 *   Letra · Código · Produto · Qtd loja · Qtd estoque · Total · Estoque sistema · Ajuste · Status · Atualizado em
 *
 * - Ajuste (automático): "Aumentar 9", "Diminuir 2", "Conferir (0 no sist.)", "—" (bateu).
 * - Status (dropdown colorido): OK (bateu, automático) / Pendente / Feito / Inativado.
 *   Você marca "Feito" quando aplica o ajuste no SysPDV, ou "Inativado" ao inativar.
 * - Letra: primeira letra do produto — filtre por ela pra trabalhar letra a letra.
 * - Aba "Resumo": total, pendentes, feitos e o progresso POR LETRA.
 *
 * Ao terminar uma letra, você passa manualmente pra Estoque_Principal
 * (abas Estoque e Alterações), que continua igual está hoje.
 *
 * SETUP: cole, Salve, rode "configurar" uma vez, e reimplante NOVA VERSÃO do Web App.
 */

var SYNC_TOKEN = 'lc-2026';
var ABA = 'Contagens';
var HDR = ['Chave','Letra','Código','Produto','Qtd loja','Qtd estoque','Total',
           'Estoque sistema','Ajuste','Status','Atualizado em'];
var C_CHAVE=1, C_LETRA=2, C_COD=3, C_PROD=4, C_LOJA=5, C_EST=6, C_TOTAL=7,
    C_SIST=8, C_AJU=9, C_STATUS=10, C_DATA=11, NCOL=11;
var LINHAS = 2000;
var OPCOES_STATUS = ['OK','Pendente','Feito','Inativado'];

// paleta
var VERDE_BG='#D4EDDA', VERDE_TX='#155724';
var VERM_BG='#F8D7DA',  VERM_TX='#721C24';
var AMBAR_BG='#FFF3CD', AMBAR_TX='#856404';
var TEAL_BG='#E1F5EE',  TEAL_TX='#0F6E56';
var HEAD_BG='#0F3D3E',  HEAD_TX='#FFFFFF';

function ss_(){ return SpreadsheetApp.getActiveSpreadsheet(); }
function num_(v){ var n=Number(v); return isNaN(n)?0:n; }
function resp_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------- fórmulas por linha ----------
function fLetra(r){ return '=IF(D'+r+'="","",UPPER(LEFT(D'+r+',1)))'; }
function fTotal(r){ return '=N(E'+r+')+N(F'+r+')'; }
function fAju(r){
  var dif='(G'+r+'-N(H'+r+'))';
  return '=IF(D'+r+'="","",'
       + 'IF(AND(N(H'+r+')=0,G'+r+'=0),"Conferir (0 no sist.)",'
       + 'IF('+dif+'=0,"—",'
       + 'IF('+dif+'>0,"Aumentar "&'+dif+',"Diminuir "&ABS'+dif+'))))';
}

// status automático a partir dos números
function statusPadrao_(loja,est,sist){
  var total=num_(loja)+num_(est), s=num_(sist), dif=total-s;
  if(dif===0 && total>0) return 'OK';   // contou e bateu
  return 'Pendente';                     // precisa de ação (inclui 0 no sistema)
}

// ---------- menu ----------
function onOpen(){
  SpreadsheetApp.getUi().createMenu('🧮 Contagem')
    .addItem('Configurar / reestilizar','configurar')
    .addItem('Atualizar resumo','atualizarResumo')
    .addSeparator()
    .addItem('Limpar contagens (nova letra/ciclo)','limparContagens')
    .addToUi();
    .addItem('Atualizar estoque do sistema (via dados.json)','atualizarEstoqueSistema')
}

// ---------- setup / migração ----------
function configurar(){
  var ss=ss_();
  var sh=ss.getSheetByName(ABA);
  if(!sh) sh=ss.insertSheet(ABA);

  // lê o que já existe, casando por cabeçalho (qualquer versão anterior)
  var data=sh.getDataRange().getValues();
  var rows=[];
  if(data.length>1){
    var head=data[0].map(function(x){return String(x).trim();});
    function ix(n){ return head.indexOf(n); }
    var iCh=ix('Chave'), iCo=ix('Código'), iPr=ix('Produto'), iLo=ix('Qtd loja'),
        iEs=ix('Qtd estoque'), iSi=ix('Estoque sistema'), iSt=ix('Status'),
        iIn=ix('Inativado?'), iDa=ix('Atualizado em');
    for(var r=1;r<data.length;r++){
      var row=data[r];
      var prod = iPr>=0 ? row[iPr] : row[2];
      if(prod==='' || prod==null) continue;
      var st='';
      if(iSt>=0) st=row[iSt];
      else if(iIn>=0 && String(row[iIn]).toLowerCase()==='sim') st='Inativado';
      rows.push({
        chave: iCh>=0 ? row[iCh] : (row[0]||prod),
        cod:   iCo>=0 ? row[iCo] : row[1],
        prod:  prod,
        loja:  iLo>=0 ? row[iLo] : '',
        est:   iEs>=0 ? row[iEs] : '',
        sist:  iSi>=0 ? row[iSi] : '',
        status: st,
        data:  iDa>=0 ? row[iDa] : ''
      });
    }
  }

  sh.clear();
  sh.getRange(1,1,1,NCOL).setValues([HDR]);
  var n=rows.length;
  if(n){
    var out=[];
    for(var i=0;i<n;i++){
      var x=rows[i];
      var st=x.status;
      if(st!=='Feito' && st!=='Inativado') st=statusPadrao_(x.loja,x.est,x.sist);
      out.push([x.chave,'',x.cod,x.prod,x.loja,x.est,'',x.sist,'',st,x.data]);
    }
    sh.getRange(2,1,n,NCOL).setValues(out);
    var fL=[],fT=[],fA=[];
    for(var r2=2;r2<n+2;r2++){ fL.push([fLetra(r2)]); fT.push([fTotal(r2)]); fA.push([fAju(r2)]); }
    sh.getRange(2,C_LETRA,n,1).setFormulas(fL);
    sh.getRange(2,C_TOTAL,n,1).setFormulas(fT);
    sh.getRange(2,C_AJU,n,1).setFormulas(fA);
  }

  aplicarEstilo_(sh);
  atualizarResumo();
  SpreadsheetApp.getActive().toast('Planilha configurada (por letra) e estilizada.','🧮 Contagem',5);
}

function aplicarEstilo_(sh){
  sh.getRange(1,1,1,NCOL).setBackground(HEAD_BG).setFontColor(HEAD_TX)
    .setFontWeight('bold').setVerticalAlignment('middle').setWrap(true);
  sh.setFrozenRows(1);
  sh.setRowHeight(1,36);
  if(sh.getMaxColumns()>=C_CHAVE) sh.hideColumns(C_CHAVE);

  sh.setColumnWidth(C_LETRA,55); sh.setColumnWidth(C_COD,120); sh.setColumnWidth(C_PROD,300);
  sh.setColumnWidth(C_LOJA,80); sh.setColumnWidth(C_EST,95); sh.setColumnWidth(C_TOTAL,70);
  sh.setColumnWidth(C_SIST,120); sh.setColumnWidth(C_AJU,160); sh.setColumnWidth(C_STATUS,110);
  sh.setColumnWidth(C_DATA,155);

  sh.getRange(2,C_LETRA,LINHAS,1).setHorizontalAlignment('center');
  sh.getRange(2,C_LOJA,LINHAS,C_SIST-C_LOJA+1).setHorizontalAlignment('center');
  sh.getRange(2,C_STATUS,LINHAS,1).setHorizontalAlignment('center');

  // dropdown Status
  var val=SpreadsheetApp.newDataValidation().requireValueInList(OPCOES_STATUS,true).setAllowInvalid(false).build();
  sh.getRange(2,C_STATUS,LINHAS,1).setDataValidation(val);

  // formatação condicional
  var rules=[];
  function contains(col,text,bg,fg){
    return SpreadsheetApp.newConditionalFormatRule().whenTextContains(text)
      .setBackground(bg).setFontColor(fg).setRanges([sh.getRange(2,col,LINHAS,1)]).build();
  }
  function equals(col,text,bg,fg){
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text)
      .setBackground(bg).setFontColor(fg).setRanges([sh.getRange(2,col,LINHAS,1)]).build();
  }
  // Ajuste
  rules.push(contains(C_AJU,'Aumentar',VERDE_BG,VERDE_TX));
  rules.push(contains(C_AJU,'Diminuir',VERM_BG,VERM_TX));
  rules.push(contains(C_AJU,'Conferir',AMBAR_BG,AMBAR_TX));
  // Status (pílulas)
  rules.push(equals(C_STATUS,'OK',TEAL_BG,TEAL_TX));
  rules.push(equals(C_STATUS,'Pendente',AMBAR_BG,AMBAR_TX));
  rules.push(equals(C_STATUS,'Feito',VERDE_BG,VERDE_TX));
  rules.push(equals(C_STATUS,'Inativado',VERM_BG,VERM_TX));
  sh.setConditionalFormatRules(rules);

  try{ var f=sh.getFilter(); if(f) f.remove(); }catch(e){}
  try{ sh.getRange(1,1,Math.max(sh.getLastRow(),2),NCOL).createFilter(); }catch(e){}
  sh.getRange(2,C_DATA,LINHAS,1).setNumberFormat('dd/mm/yyyy hh:mm');
}

// ---------- resumo (geral + por letra) ----------
function atualizarResumo(){
  var ss=ss_();
  var sh=ss.getSheetByName('Resumo');
  if(!sh) sh=ss.insertSheet('Resumo',0);
  sh.clear();
  var A=ABA;
  var geral=[
    ['RESUMO DA CONTAGEM',''],
    ['Itens contados','=COUNTA('+A+'!D2:D)'],
    ['Bateu (OK)','=COUNTIF('+A+'!J2:J,"OK")'],
    ['Pendentes','=COUNTIF('+A+'!J2:J,"Pendente")'],
    ['Feitos (SysPDV)','=COUNTIF('+A+'!J2:J,"Feito")'],
    ['Inativados','=COUNTIF('+A+'!J2:J,"Inativado")'],
    ['Última atualização','=IFERROR(TEXT(MAX('+A+'!K2:K),"dd/mm/yyyy hh:mm"),"—")']
  ];
  sh.getRange(1,1,geral.length,2).setValues(geral);
  sh.getRange(1,1,1,2).merge().setBackground(HEAD_BG).setFontColor(HEAD_TX)
    .setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(2,1,geral.length-1,1).setFontWeight('bold');
  sh.getRange(2,2,geral.length-1,1).setHorizontalAlignment('center');

  // progresso por letra
  sh.getRange(1,4,1,3).setValues([['Letra','Itens','Pendentes']])
    .setBackground(HEAD_BG).setFontColor(HEAD_TX).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(2,4).setFormula('=IFERROR(SORT(UNIQUE(FILTER('+A+'!B2:B,'+A+'!B2:B<>""))),"")');
  sh.getRange(2,5).setFormula('=ARRAYFORMULA(IF(D2:D="","",COUNTIF('+A+'!B:B,D2:D)))');
  sh.getRange(2,6).setFormula('=ARRAYFORMULA(IF(D2:D="","",COUNTIFS('+A+'!B:B,D2:D,'+A+'!J:J,"Pendente")))');
  sh.getRange(2,4,LINHAS,3).setHorizontalAlignment('center');

  sh.setColumnWidth(1,190); sh.setColumnWidth(2,140);
  sh.setColumnWidth(4,70); sh.setColumnWidth(5,90); sh.setColumnWidth(6,110);
  sh.setRowHeight(1,32);
  try{ sh.setFrozenRows(1); }catch(e){}
}

// ---------- nova letra / ciclo ----------
function limparContagens(){
  var ui=SpreadsheetApp.getUi();
  var r=ui.alert('Nova letra / ciclo',
    'Isso apaga as contagens atuais da aba "Contagens". Faça só depois de já ter passado a letra pra Estoque_Principal. Continuar?',
    ui.ButtonSet.YES_NO);
  if(r!==ui.Button.YES) return;
  var sh=ss_().getSheetByName(ABA);
  var last=sh.getLastRow();
  if(last>1) sh.getRange(2,1,last-1,NCOL).clearContent();
  atualizarResumo();
  SpreadsheetApp.getActive().toast('Contagens zeradas. Pode começar a próxima letra.','🧮 Contagem',5);
}

// ---------- recepção do app ----------
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
  var ss=ss_();
  var sh=ss.getSheetByName(ABA);
  if(!sh){ configurar(); sh=ss.getSheetByName(ABA); }
  if(sh.getLastRow()===0) sh.getRange(1,1,1,NCOL).setValues([HDR]);

  var last=sh.getLastRow();
  var mapa={};
  if(last>=2){
    var chaves=sh.getRange(2,C_CHAVE,last-1,1).getValues();
    for(var i=0;i<chaves.length;i++){ var k=String(chaves[i][0]); if(k!=='') mapa[k]=i+2; }
  }
  var agora=new Date();
  for(var j=0;j<itens.length;j++){
    var it=itens[j];
    var chave=String(it.key!=null?it.key:(it.codigo||it.nome||''));
    var r=mapa[chave];
    var nova=false;
    if(!r){ r=sh.getLastRow()+1; mapa[chave]=r; nova=true; }

    var curStatus = nova ? '' : String(sh.getRange(r,C_STATUS).getValue()||'');
    var novoStatus = (curStatus==='Feito'||curStatus==='Inativado')
                     ? curStatus : statusPadrao_(it.qtdLoja,it.qtdEstoque,it.sistema);

    sh.getRange(r,C_CHAVE).setValue(chave);
    sh.getRange(r,C_COD).setValue(it.codigo||'');
    sh.getRange(r,C_PROD).setValue(it.nome||'');
    sh.getRange(r,C_LOJA).setValue(num_(it.qtdLoja));
    sh.getRange(r,C_EST).setValue(num_(it.qtdEstoque));
    sh.getRange(r,C_SIST).setValue(num_(it.sistema));
    sh.getRange(r,C_DATA).setValue(it.ts?new Date(it.ts):agora);
    sh.getRange(r,C_LETRA).setFormula(fLetra(r));
    sh.getRange(r,C_TOTAL).setFormula(fTotal(r));
    sh.getRange(r,C_AJU).setFormula(fAju(r));
    sh.getRange(r,C_STATUS).setValue(novoStatus);
  }
}

/* =====================================================================
 * ADICIONE ESTA FUNÇÃO ao seu Codigo.gs (v6) — cole antes do doGet().
 * E acrescente uma linha no menu onOpen (veja abaixo).
 *
 * O que faz: baixa o dados.json (já atualizado no GitHub) e atualiza a
 * coluna "Estoque sistema" na aba Contagens E na Estoque_Principal,
 * recalculando Ajuste/Status. Roda no Google, pelo menu (zero token).
 *
 * >>> Rode DEPOIS de subir o dados.json novo no GitHub.
 *
 * No onOpen, adicione esta linha junto dos outros addItem:
 *   .addItem('Atualizar estoque do sistema (via dados.json)','atualizarEstoqueSistema')
 * ===================================================================== */

function atualizarEstoqueSistema(){
  var ui=SpreadsheetApp.getUi();
  var resp=UrlFetchApp.fetch(DADOS_URL,{muteHttpExceptions:true});
  if(resp.getResponseCode()!==200){ ui.alert('Não consegui baixar o dados.json ('+resp.getResponseCode()+').'); return; }
  var d=JSON.parse(resp.getContentText());
  var produtos=d.produtos||[]; var codigos=d.codigos||{};

  var eById={}; for(var i=0;i<produtos.length;i++) eById[String(i)]=num_(produtos[i].e);
  var eByCode={}; for(var c in codigos){ var id=codigos[c]; if(produtos[id]) eByCode[String(c).trim()]=num_(produtos[id].e); }
  var eByName={}; for(var k=0;k<produtos.length;k++){ var nm=norm_(produtos[k].n); if(eByName[nm]==null) eByName[nm]=num_(produtos[k].e); }

  // 1) aba Contagens
  var sh=ss_().getSheetByName(ABA); var cCont=0;
  if(sh){
    var last=sh.getLastRow();
    if(last>=2){
      var rng=sh.getRange(2,1,last-1,NCOL); var vals=rng.getValues();
      for(var r=0;r<vals.length;r++){
        var v=vals[r]; if(!v[C_PROD-1]) continue;
        var chave=String(v[C_CHAVE-1]);
        var novo=(eById[chave]!=null)?eById[chave]:eByName[norm_(v[C_PROD-1])];
        if(novo==null) continue;
        v[C_SIST-1]=novo;
        var loja=v[C_LOJA-1], est=v[C_EST-1];
        v[C_TOTAL-1]=totalVal_(loja,est);
        v[C_AJU-1]=ajusteVal_(loja,est,novo);
        var st=String(v[C_STATUS-1]||'');
        if(st!=='Feito'&&st!=='Inativado'&&st!=='Enviado') v[C_STATUS-1]=statusAuto_(loja,est,novo);
        cCont++;
      }
      rng.setValues(vals);
    }
  }

  // 2) Estoque_Principal — coluna "Estoque sistema"
  var cEst=0, semCasar=0;
  if(ESTOQUE_ID){
    var ext=SpreadsheetApp.openById(ESTOQUE_ID);
    var abaEst=ext.getSheetByName('Estoque');
    if(abaEst){
      var eData=abaEst.getRange(1,1,abaEst.getLastRow(),abaEst.getLastColumn()).getValues();
      var hrow=-1,cCod=-1,cAdd=-1,cNome=-1,cSist=-1;
      for(var rr=0;rr<Math.min(eData.length,15);rr++){
        for(var cc=0;cc<eData[rr].length;cc++){
          var h=String(eData[rr][cc]).trim();
          if(h==='Estoque sistema'){ hrow=rr; cSist=cc; }
          if(h==='Código') cCod=cc;
          if(h==='Cód. adicionais') cAdd=cc;
          if(h==='Nome no SysPDV') cNome=cc;
        }
        if(hrow>=0&&cSist>=0&&cNome>=0) break;
      }
      if(hrow>=0&&cSist>=0&&cNome>=0){
        var col=[];
        for(var dr=hrow+1; dr<eData.length; dr++){
          var rowd=eData[dr]; var nm=rowd[cNome]; var atual=rowd[cSist];
          if(nm===''||nm==null){ col.push([atual]); continue; }
          var novo=null;
          if(cCod>=0 && rowd[cCod] && eByCode[String(rowd[cCod]).trim()]!=null) novo=eByCode[String(rowd[cCod]).trim()];
          if(novo==null && cAdd>=0 && rowd[cAdd]){
            var parts=String(rowd[cAdd]).split(/[,\s;]+/);
            for(var pi=0;pi<parts.length;pi++){ var pc=parts[pi].trim(); if(pc && eByCode[pc]!=null){ novo=eByCode[pc]; break; } }
          }
          if(novo==null){ var kk=norm_(nm); if(eByName[kk]!=null) novo=eByName[kk]; }
          if(novo==null){ semCasar++; col.push([atual]); }
          else { col.push([novo]); cEst++; }
        }
        abaEst.getRange(hrow+2, cSist+1, col.length, 1).setValues(col);
      }
    }
  }
  atualizarResumo();
  ui.alert('Estoque sistema atualizado:\n• Contagens: '+cCont+' linhas\n• Estoque_Principal: '+cEst+' produtos'+(semCasar?('\n• '+semCasar+' não casaram (mantidos)'):''));
}

// teste no navegador
function doGet(){ return resp_({ok:true, servico:'contagem-estoque-lc', versao:3}); }
