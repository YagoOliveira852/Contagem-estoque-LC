# Contagem de Estoque — Loja da Construção

App web (mobile) pra fazer a contagem de inventário escaneando o código de barras pelo
celular. Compara a quantidade contada com o estoque do sistema, já mostra **o ajuste a
fazer no SysPDV** e salva tudo numa planilha do Google, organizada por letra.

Página estática (React puro, sem build) hospedada no **GitHub Pages**.

🔗 **Site:** https://yagooliveira852.github.io/Contagem-estoque-LC/

---

## Como funciona

```
Celular (GitHub Pages) → Apps Script (Web App) → Planilha "Contagens Loja da Construção"
                                                        │  (menu 🧮 Contagem)
                                                        └── "Fechar letra" → Estoque_Principal
```

- **Escanear:** lê o código (EAN, UPC, Code128, QR…) e abre o produto. Tem **lanterna**
  pra ambientes escuros (Android/Chrome; iPhone/Safari não permite).
- **Buscar:** acha o produto pelo nome quando não dá pra escanear.
- Cada contagem vai pra aba **Contagens** e é atualizada (upsert) — nunca duplica.
- Offline: fica salvo no aparelho (`localStorage`) e envia sozinho quando a net volta.

---

## Menu 🧮 Contagem

| Item                                              | O que faz                                                                                                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Carregar letra**                                | Baixa do `dados.json` todos os produtos daquela letra e joga na aba Contagens. Os que você não escanear ficam `Não contado`, pra nenhum produto passar batido.                          |
| **Ordenar por produto (A→Z)**                     | Reordena a lista alfabeticamente (útil pra dados antigos fora de ordem).                                                                                                                |
| **Fechar letra (enviar p/ Estoque_Principal)**    | Grava Qtd loja/estoque na aba Estoque (casando por código/nome) e registra os ajustes (`Feito`/`Inativado`) na aba Alterações. Mostra o que não casou e marca as linhas como `Enviado`. |
| **Atualizar estoque do sistema (via dados.json)** | Sincroniza a coluna "Estoque sistema" na Contagens e na Estoque_Principal a partir do `dados.json`, sem tocar nas contagens.                                                            |
| **Configurar / reestilizar**                      | Recria o layout: cabeçalho, larguras, zebra, cores, dropdown de Status. Roda 1x no setup e sempre que quiser reaplicar o visual.                                                        |
| **Atualizar resumo**                              | Recalcula a aba Resumo (contagens gerais + progresso por letra).                                                                                                                        |
| **Limpar contagens (nova letra/ciclo)**           | Zera a aba Contagens pra começar a próxima letra (faça só depois de fechar/enviar a atual).                                                                                             |

> As ações que tocam a Estoque_Principal (**Fechar letra**, **Atualizar estoque**) rodam
> **só pelo menu** — o endpoint público do site nunca as executa.

## Rotina de contagem (por letra)

1. **Carregar letra** (ex.: C) → traz todos os produtos "C".
2. Escaneia a loja no app → quantidades e a coluna **Ajuste** aparecem sozinhas.
3. Resolve os `Não contado` (digita a quantidade ou marca o Status na mão).
4. Marca o **Status**: `Feito` (ajustou no SysPDV) ou `Inativado`. Quem bateu vira `OK` sozinho.
5. **Fechar letra** → envia tudo pra Estoque_Principal. Revê o que "não casou", se houver.
6. **Limpar contagens** e parte pra próxima. Acompanha no **Resumo** a coluna *Falta resolver*
   por letra — quando zera, a letra acabou.

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

---

## Atualizar o estoque quando a loja girar

1. Gere a exportação nova do SysPDV (PDF "Posição de Estoque", uma linha por produto).
2. Peça a atualização do **`dados.json`** (só o campo de estoque muda; nome/preço/ordem
   e os índices ficam iguais) e **suba o novo `dados.json`** no GitHub.
3. No menu **🧮 Contagem → Atualizar estoque do sistema (via dados.json)**: sincroniza o
   "Estoque sistema" na aba Contagens e na Estoque_Principal, sem tocar nas suas contagens.

---

## Notas técnicas

- **Sem servidor:** o Apps Script é o backend, de graça. Envio `no-cors` em lote com
  reenvio automático; upsert por produto evita duplicata.
- **Sem fórmulas na planilha:** o script calcula os valores (evita erro de locale pt-BR).
- **Segurança:** o `SYNC_TOKEN` no site é só anti-acesso-casual. O endpoint público do
  Web App **só grava na aba Contagens** — não alcança a Estoque_Principal nem o resto do
  Drive. As ações que tocam a Estoque_Principal ("Fechar letra", "Atualizar estoque")
  rodam **só pelo menu**, nunca pela URL pública. Redeployar invalida a URL antiga.

---

## Stack
HTML + CSS + **React 18** (UMD) · **html5-qrcode** · **Google Apps Script** + **Google Sheets** · **GitHub Pages**.