# Contagem de Estoque — Loja da Construção

App web (mobile) pra fazer a contagem de inventário da loja escaneando o código de
barras pelo celular. Compara a quantidade contada com o estoque do sistema, mostra a
diferença na hora e **salva cada contagem automaticamente numa planilha do Google**.

É uma página estática (React puro, sem build) hospedada no **GitHub Pages**.

🔗 **Site:** https://yagooliveira852.github.io/Contagem-estoque-LC/

---

## Como funciona

```
Celular (GitHub Pages)  →  Google Apps Script (Web App)  →  Planilha "Contagens Loja da Construção"
```

- **Escanear:** lê o código de barras (EAN, UPC, Code128, QR…) e abre o produto.
- **Buscar:** acha o produto pelo nome quando não dá pra escanear.
- **Contagens:** lista tudo que já foi contado, com a diferença (sobra / falta / OK).
- As contagens ficam salvas **no aparelho** (`localStorage`) e são enviadas pra
  planilha do Google. Sem internet, o envio acontece sozinho quando a conexão volta.
- Cada produto ocupa **uma linha** na planilha; recontar o mesmo produto **atualiza**
  a linha em vez de duplicar.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O app inteiro (HTML + CSS + React via CDN). É o que roda no celular. |
| `dados.json` | Base de produtos: `{ codigos: { "cod": id }, produtos: [{ n, e, p, u }] }`. |
| `apps-script/Codigo.gs` | Backend (Google Apps Script) que grava as contagens na planilha. |

**dados.json — campos de cada produto:**
`n` = nome · `e` = estoque no sistema · `p` = preço · `u` = unidade.

---

## Configuração (uma vez só)

### 1. Publicar o backend (Apps Script)
1. Abra a planilha **Contagens Loja da Construção** → **Extensões → Apps Script**.
2. Cole o conteúdo de `apps-script/Codigo.gs` e salve.
3. **Implantar → Nova implantação → App da Web.**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
4. Autorize e copie a **URL** (termina em `/exec`).
5. Teste abrindo a URL no navegador — deve mostrar `{"ok":true,...}`.

### 2. Ligar o site na planilha
No `index.html`, preencha:
```js
const SYNC_URL = 'https://script.google.com/macros/s/.../exec'; // sua URL
const SYNC_TOKEN = 'lc-2026'; // precisa ser igual ao do Codigo.gs
```

### 3. Publicar
Suba o `index.html` no repositório. O GitHub Pages atualiza em 1–2 min.

> Passo a passo detalhado em `INSTRUCOES.md`.

---

## Colunas da planilha de contagens
`Código · Produto · Qtd loja · Qtd estoque · Total · Estoque sistema · Diferença · Observação · Atualizado em`

---

## Notas técnicas

- **Sem servidor próprio:** o Apps Script faz o papel de backend, de graça.
- **Envio (`no-cors`):** o app manda as contagens em lote e reenvia em caso de falha;
  como o backend faz *upsert* por produto, reenviar não gera duplicata.
- **Selo de status** no topo: `☁️ salvo`, `☁️ N p/ enviar`, `📴 pendentes`.
- **Exportar CSV** continua disponível como backup extra.
- **Segurança:** o `SYNC_TOKEN` no código do site é apenas anti-acesso-casual, não um
  segredo real. O Web App só consegue escrever na planilha de contagens — não acessa o
  resto do Drive. Se precisar, é só redeployar o Apps Script pra invalidar a URL antiga.
- **Atualizar a base de produtos:** substitua o `dados.json`.

---

## Stack
HTML + CSS + **React 18** (UMD, sem build) · **html5-qrcode** (leitura de código de barras) ·
**Google Apps Script** + **Google Sheets** (persistência) · **GitHub Pages** (hospedagem).
