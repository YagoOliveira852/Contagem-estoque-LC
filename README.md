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

### Fluxo de trabalho (por letra)
1. Menu **🧮 Contagem → Carregar letra** traz todos os produtos daquela letra (os não
   escaneados ficam `Não contado`).
2. Você escaneia a loja → quantidades preenchem sozinhas, com a coluna **Ajuste** pronta.
3. Resolve os `Não contado`, marca o **Status** (Feito / Inativado).
4. Menu **→ Fechar letra** grava as contagens na Estoque_Principal (aba Estoque) e
   registra os ajustes na aba Alterações. Marca as linhas como `Enviado`.
5. **→ Limpar contagens** e parte pra próxima letra. A aba **Resumo** mostra o progresso.

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