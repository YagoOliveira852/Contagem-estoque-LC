# Contagem de Estoque — Loja da Construção

App web (mobile) pra fazer a contagem de inventário escaneando o código de barras pelo
celular. Compara a quantidade contada com o estoque do sistema, já mostra **o ajuste a
fazer no SysPDV** e salva tudo numa planilha do Google, organizada por letra.

Página estática (React puro, sem build) hospedada no **GitHub Pages**. Funciona em
qualquer celular (Android e iPhone) — pode ser usado por vários funcionários ao mesmo tempo.

🔗 **Site:** https://yagooliveira852.github.io/Contagem-estoque-LC/

---

## Como funciona

```
Celular (GitHub Pages) → Apps Script (Web App) → Planilha "Contagens Loja da Construção"
                                                        │  (menu 🧮 Contagem)
                                                        └── "Fechar letra" → Estoque_Principal
```

- **Escanear:** lê o código (EAN, UPC, Code128, QR…) e abre o produto. Tem **lanterna**
  pra ambientes escuros (Android/Chrome; iPhone/Safari não permite) e botão **🔄 Lente**
  em celulares com várias câmeras: o app escolhe sozinho a lente principal (evita a
  ultrawide/macro, que borra de perto — caso típico dos Samsung Galaxy), e se ainda
  vier borrado é só trocar de lente; a escolha fica memorizada no aparelho.
- **Buscar:** acha o produto pelo nome **ou pelo código de barras** (digite os números da
  etiqueta — com ou sem os zeros do começo) quando não dá pra escanear.
- **Card do produto:** mostra o código de barras num chip discreto (e "+N códigos" quando
  o produto tem códigos adicionais) — dá pra conferir visualmente com a etiqueta física
  sem digitar nada, útil pra produto sem embalagem.
- Cada contagem vai pra aba **Contagens** e é atualizada (upsert) — nunca duplica.
- Offline: fica salvo no aparelho (`localStorage`) e envia sozinho quando a net volta.

---

## Menu 🧮 Contagem

| Item                                              | O que faz                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **🔍 Pesquisar produto (código ou nome)**          | Pula direto pra linha do produto na aba Contagens. Aceita o código de barras (com ou sem zeros à esquerda) ou parte do nome; com vários resultados, lista todos.                                                                                                                                                                                                                                                                     |
| **🚨 Verificar duplicados / chaves**               | Vigia: aponta produtos duplicados (com as linhas) e avisa se as chaves estão desatualizadas em relação ao `dados.json` — o sinal precoce de que duplicados poderiam surgir.                                                                                                                                                                                                                                                          |
| **Carregar letra**                                | Baixa do `dados.json` todos os produtos daquela letra e joga na aba Contagens. Os que você não escanear ficam `Não contado`, pra nenhum produto passar batido.                                                                                                                                                                                                                                                                       |
| **Ordenar por produto (A→Z)**                     | Reordena a lista alfabeticamente (útil quando o app cria linhas novas no final).                                                                                                                                                                                                                                                                                                                                                     |
| **Fechar letra (enviar p/ Estoque_Principal)**    | Grava Qtd loja/estoque na aba Estoque (casando por código/nome) e registra os ajustes (`Feito`/`Inativado`) na aba Alterações. Mostra o que não casou e marca as linhas como `Enviado`. Pode (e deve) rodar **todo dia de contagem** — só envia o que está resolvido e ainda não foi enviado. Digite `*` no lugar da letra para enviar **todas as letras** de uma vez (útil quando você conta itens avulsos fora da letra do ciclo). |
| **Atualizar estoque do sistema (via dados.json)** | Sincroniza a coluna "Estoque sistema" na Contagens e na Estoque_Principal a partir do `dados.json`. Linhas **já contadas ou resolvidas ficam congeladas** (v8.2): o Ajuste continua relatando o que você viu e fez na contagem.                                                                                                                                                                                                      |
| **Configurar / reestilizar**                      | Recria o layout: cabeçalho, larguras, zebra, cores, dropdown de Status. Roda 1x no setup e sempre que quiser reaplicar o visual.                                                                                                                                                                                                                                                                                                     |
| **Atualizar resumo**                              | Recalcula a aba Resumo (contagens gerais + progresso por letra).                                                                                                                                                                                                                                                                                                                                                                     |
| **Limpar contagens (nova letra/ciclo)**           | Zera a aba Contagens pra começar a próxima letra. Antes de apagar, **avisa se existir contagem não enviada em qualquer letra** (detalhado por letra) — rode o Fechar letra com `*` e limpe sem medo.                                                                                                                                                                                                                                 |

> As ações que tocam a Estoque_Principal (**Fechar letra**, **Atualizar estoque**) rodam
> **só pelo menu** — o endpoint público do site nunca as executa.

## Rotina de contagem

Diária (a loja gira todo dia, então a ordem importa):

1. Escaneia/conta no app → quantidades e a coluna **Ajuste** aparecem sozinhas.
2. Ajustou algo no SysPDV? Marca `Feito`. Produto que não existe mais? `Inativado`.
   Quem bateu vira `OK` sozinho.
3. Fim do dia: **Fechar letra** → grava quantidades e o histórico do que você fez na
   Estoque_Principal, e marca como `Enviado`. (Desde a v8.2 a ordem não é mais crítica —
   o Atualizar estoque não mexe em linha contada — mas fechar diariamente continua
   sendo a prática recomendada.)
4. Precisando de estoque fresco: gera o PDF novo do SysPDV → atualiza o `dados.json` →
   **Atualizar estoque do sistema**.

Por letra:

1. **Carregar letra** (ex.: C) → traz todos os produtos da letra.
2. Vai contando ao longo dos dias (rotina diária acima).
3. Acompanha no **Resumo** a coluna *Falta resolver* — quando zerar, a letra acabou.
4. **Limpar contagens** e parte pra próxima letra.

---

## Arquivos

| Arquivo                 | O que é                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `index.html`            | O app inteiro (HTML + CSS + React via CDN). Roda no celular.                                         |
| `dados.json`            | Base de produtos: `{ codigos: { "cod": id }, produtos: [{ n, e, p, u }] }`.                          |
| `apps-script/Codigo.gs` | Backend (Apps Script) da planilha: recebe o app, estiliza, "Carregar letra", "Fechar letra", Resumo. |

`dados.json` — por produto: `n` = nome · `e` = estoque no sistema · `p` = preço · `u` = unidade.

---

## Colunas da aba Contagens
`Letra · Código · Produto · Qtd loja · Qtd estoque · Total · Estoque sistema · Ajuste · Status · Atualizado em`

- **Ajuste** (automático): `Aumentar N` / `Diminuir N` / `Conferir (0 no sist.)` / `—`.
- **Status**: `Não contado` · `OK` · `Pendente` · `Feito` · `Inativado` · `Enviado`.

---

## Configuração (uma vez)

**Backend:** planilha Contagens → Extensões → Apps Script → cole `Codigo.gs`, preencha
`ESTOQUE_ID` (ID da Estoque_Principal em Google Sheets), rode `configurar`, autorize e
**Implantar → App da Web** (Executar como: eu · Acesso: qualquer pessoa). Copie a URL `/exec`.

**Site:** no `index.html`, preencha `SYNC_URL` (a URL do Web App) e `SYNC_TOKEN` (igual ao
do `Codigo.gs`). Suba no GitHub — o Pages atualiza em 1–2 min.

**Ao atualizar o `Codigo.gs` depois disso:** colar e salvar NÃO basta — o site continua
rodando a versão antiga. Vá em **Implantar → Gerenciar implantações → ✏️ → Versão: Nova
versão → Implantar** (edite a implantação existente; "Nova implantação" trocaria a URL).
Pra conferir qual versão está no ar, abra a URL `/exec` no navegador — responde algo como
`{"ok":true,"servico":"contagem-estoque-lc","versao":8.4}`.

---

## Atualizar estoque e preço quando a loja girar

1. **Feche a letra antes** (garante o histórico dos ajustes já feitos).
2. Gere a exportação nova do SysPDV (PDF "Posição de Estoque", uma linha por produto).
3. Peça a atualização do **`dados.json`** (estoque e preço mudam; nomes, ordem e os
   índices/chaves são preservados — isso é essencial pra não criar duplicados) e **suba
   o novo `dados.json`** no GitHub.
4. No menu **🧮 Contagem → Atualizar estoque do sistema (via dados.json)**.
5. No celular, recarregue a página (o app usa `no-cache`: ~1–2 min após o commit já pega
   a base nova).

---

## Notas técnicas

- **Sem servidor:** o Apps Script é o backend, de graça. Envio `no-cors` em lote com
  reenvio automático; upsert por produto evita duplicata (v8: o produto é reconhecido
  pela chave, pelo **código** — ignorando zeros à esquerda — e pelo **nome**, então nem a
  regeneração do `dados.json` cria linha repetida; v8.3: a chave sozinha nunca decide —
  código e nome mandam, evitando que chaves velhas de produtos inativados sobrescrevam
  a linha de outro produto).
- **Câmera:** o app enumera as lentes (`getCameras`) e pontua pra escolher a traseira
  principal; aplica `focusMode: continuous` + zoom 2x quando suportado (conserta o foco
  de perto nos Galaxy). Preferência de lente salva por aparelho no `localStorage`.
- **Base com `no-cache`:** o `dados.json` é revalidado a cada abertura (baixa só se mudou).
- **Sem fórmulas na planilha:** o script calcula os valores (evita erro de locale pt-BR).
- **Segurança:** o `SYNC_TOKEN` no site é só anti-acesso-casual. O endpoint público do
  Web App **só grava na aba Contagens** — não alcança a Estoque_Principal nem o resto do
  Drive. As ações que tocam a Estoque_Principal ("Fechar letra", "Atualizar estoque")
  rodam **só pelo menu**, nunca pela URL pública. Redeployar invalida a URL antiga.

---

## Stack
HTML + CSS + **React 18** (UMD) · **html5-qrcode** · **Google Apps Script** + **Google Sheets** · **GitHub Pages**.