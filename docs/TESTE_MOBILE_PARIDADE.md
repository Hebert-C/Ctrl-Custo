# Guia de Testes — Mobile Paridade com Web

> **Branch:** `feature/mobile-parity`
> **Data:** 2026-05-09
> **Versão:** 1.0

---

## Conta de teste

| Campo  | Valor               |
| ------ | ------------------- |
| E-mail | `seunome@teste.com` |
| Senha  | `Teste@1234`        |

> Substitua `seunome` pelo seu nome. Cada tester tem sua conta individual com os dados já cadastrados.

---

## Pré-requisitos antes de testar

- App instalado e rodando em dispositivo real ou emulador
- Login realizado com uma das contas acima
- A conta deve ter ao menos: 1 banco, 1 cartão, 1 meta, 1 categoria e algumas transações cadastradas
- Se a conta estiver vazia, cadastre os dados mínimos antes de iniciar

---

## Seção 1 — Transações: Editar e Excluir

| #   | Ação                                           | Resultado esperado                                                              | OK? |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------- | --- |
| 1.1 | Aba Transações → tap em qualquer item da lista | Formulário abre pré-preenchido (descrição, valor, tipo, banco, categoria, data) | ☐   |
| 1.2 | Alterar o valor → tocar "Atualizar"            | Sheet fecha; item atualizado na lista; saldo no Dashboard muda                  | ☐   |
| 1.3 | Long-press em qualquer item                    | Alert "Excluir transação" aparece com botão vermelho "Excluir"                  | ☐   |
| 1.4 | Confirmar exclusão                             | Item some da lista; saldo do Dashboard atualiza                                 | ☐   |
| 1.5 | Long-press → tocar "Cancelar"                  | Nada acontece; item permanece                                                   | ☐   |

---

## Seção 2 — Transações: Tipo Transferência

| #   | Ação                                             | Resultado esperado                                                             | OK? |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------ | --- |
| 2.1 | FAB (+) → abrir formulário de nova transação     | Três toggles visíveis: **Despesa / Receita / Transf.**                         | ☐   |
| 2.2 | Tocar em "Transf."                               | Campo "Banco de destino" aparece abaixo de "Banco de origem"                   | ☐   |
| 2.3 | Selecionar bancos diferentes e salvar            | Transação aparece na lista com "↔" no valor; saldo de ambos os bancos atualiza | ☐   |
| 2.4 | Verificar no Dashboard — card "Saldo nos Bancos" | Origem debitou; destino creditou; total geral inalterado                       | ☐   |

---

## Seção 3 — Transações: Campo Observações

| #   | Ação                                                | Resultado esperado                                            | OK? |
| --- | --------------------------------------------------- | ------------------------------------------------------------- | --- |
| 3.1 | Abrir formulário de nova transação                  | Campo "Observações (opcional)" visível no final do formulário | ☐   |
| 3.2 | Preencher observação → salvar → reabrir para editar | Observação aparece pré-preenchida no campo                    | ☐   |
| 3.3 | Salvar sem preencher observação                     | Funciona normalmente — campo é opcional                       | ☐   |

---

## Seção 4 — Transações: Filtros

| #   | Ação                                                                | Resultado esperado                                                                      | OK? |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --- |
| 4.1 | Header da tela → tocar botão de filtro (ícone "⊞" no canto direito) | Bottom sheet de filtros abre                                                            | ☐   |
| 4.2 | Selecionar tipo "Despesa" → "Aplicar filtros"                       | Lista exibe só despesas; botão de filtro fica **azul** com badge "1"                    | ☐   |
| 4.3 | Abrir filtros novamente → selecionar uma categoria                  | Badge vira "2"; lista filtra por tipo **e** categoria ao mesmo tempo                    | ☐   |
| 4.4 | Abrir filtros → digitar texto na busca → aplicar                    | Lista filtra por descrição                                                              | ☐   |
| 4.5 | Abrir filtros → tocar "Limpar tudo"                                 | Sheet fecha; badge some; botão volta ao cinza; lista volta completa                     | ☐   |
| 4.6 | Com filtros ativos → navegar mês com ◄ ►                            | Filtros de tipo/categoria mantidos; apenas o range de datas muda                        | ☐   |
| 4.7 | Aplicar filtro que resulta em lista vazia                           | Mensagem **"Nenhuma transação com esses filtros"** (diferente da mensagem de mês vazio) | ☐   |

---

## Seção 5 — Cartões: Excluir e Fatura

| #   | Ação                                              | Resultado esperado                                                                     | OK? |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------- | --- |
| 5.1 | Aba Cartões → tocar ícone de lixeira de um cartão | Alert de confirmação aparece                                                           | ☐   |
| 5.2 | Confirmar exclusão                                | Cartão removido da lista                                                               | ☐   |
| 5.3 | Tocar no **corpo** do cartão (não na lixeira)     | Bottom sheet de fatura abre: mês atual, total da fatura, limite disponível, transações | ☐   |
| 5.4 | Tocar ◄ ou ► dentro da fatura                     | Mês navega corretamente; valores do período selecionado atualizam                      | ☐   |
| 5.5 | Abrir fatura de cartão sem transações no mês      | Fatura R$ 0,00; lista vazia ou mensagem "Nenhuma transação"                            | ☐   |

---

## Seção 6 — Metas: Excluir

| #   | Ação                                           | Resultado esperado                         | OK? |
| --- | ---------------------------------------------- | ------------------------------------------ | --- |
| 6.1 | Aba Metas → tocar ícone de lixeira de uma meta | Alert de confirmação aparece               | ☐   |
| 6.2 | Confirmar exclusão                             | Meta removida da lista                     | ☐   |
| 6.3 | Tocar "Depositar" em outra meta                | Bottom sheet de depósito abre normalmente  | ☐   |
| 6.4 | Fazer depósito → confirmar                     | Barra de progresso e valor atual atualizam | ☐   |

---

## Seção 7 — Configurações: Excluir Banco e Categoria

| #   | Ação                                                          | Resultado esperado                                                             | OK? |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | --- |
| 7.1 | Configurações → Bancos → tap em um banco para editar          | Formulário abre em modo edição com botão **"Excluir conta"** vermelho no final | ☐   |
| 7.2 | Tocar "Excluir conta" → confirmar                             | Banco removido da lista                                                        | ☐   |
| 7.3 | Configurações → Categorias → tap em uma categoria para editar | Formulário abre com botão **"Excluir categoria"** vermelho                     | ☐   |
| 7.4 | Tocar "Excluir categoria" → confirmar                         | Categoria removida da lista                                                    | ☐   |

---

## Seção 8 — Dashboard: Hero Fluxo Mensal + Donut

| #   | Ação                                                     | Resultado esperado                                                                       | OK? |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --- |
| 8.1 | Abrir aba Dashboard                                      | Card **"Fluxo do Mês"** ocupa o topo: mostra Receitas, Despesas e Saldo do mês           | ☐   |
| 8.2 | Saldo do mês negativo                                    | Valor exibido em **vermelho claro** (não branco)                                         | ☐   |
| 8.3 | Tocar no hero card                                       | Donut **nível 1** aparece: Receitas (verde) vs Despesas (vermelho) com legenda e valores | ☐   |
| 8.4 | Tocar novamente no hero card                             | Donut fecha                                                                              | ☐   |
| 8.5 | Abrir donut nível 1 → tocar "Ver Despesas por categoria" | Donut **nível 2** exibe fatias por categoria de despesa                                  | ☐   |
| 8.6 | No nível 2 → tocar "← Voltar"                            | Retorna ao donut nível 1                                                                 | ☐   |
| 8.7 | No nível 1 → tocar "Ver Receitas por categoria"          | Donut nível 2 exibe fatias por categoria de receita                                      | ☐   |

---

## Seção 9 — Dashboard: Card "Saldo nos Bancos"

| #   | Ação                                               | Resultado esperado                                                                 | OK? |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------- | --- |
| 9.1 | Dashboard → localizar card "Saldo nos Bancos"      | Card exibe saldo total e ícone "▼"                                                 | ☐   |
| 9.2 | Tocar no card                                      | Lista expande mostrando cada banco: nome, tipo (Conta corrente, Poupança…) e saldo | ☐   |
| 9.3 | Banco com saldo negativo                           | Valor individual exibido em **vermelho**                                           | ☐   |
| 9.4 | Tocar no card novamente                            | Lista colapsa                                                                      | ☐   |
| 9.5 | Tocar no ícone de olho (👁) no header do Dashboard | Todos os valores nas seções hero e bancos viram "••••••"                           | ☐   |

---

## Seção 10 — Tela de Relatórios

| #     | Ação                                                               | Resultado esperado                                                                             | OK? |
| ----- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --- |
| 10.1  | Tocar na aba **"Relatórios"** (6ª aba, ícone de gráfico de barras) | Tela carrega com período padrão de **6 meses**                                                 | ☐   |
| 10.2  | Tocar "3m"                                                         | Gráficos e tabela recalculam para os últimos 3 meses; seletor "3m" fica azul                   | ☐   |
| 10.3  | Tocar "12m"                                                        | Dados para os últimos 12 meses                                                                 | ☐   |
| 10.4  | Verificar cards de resumo no topo                                  | Três cards: **Receitas** (verde) · **Despesas** (vermelho) · **Saldo** (verde/vermelho)        | ☐   |
| 10.5  | Verificar BarChart "Receitas por mês"                              | Barras verdes com alturas proporcionais; rótulos de mês no eixo X                              | ☐   |
| 10.6  | Verificar BarChart "Despesas por mês"                              | Barras vermelhas                                                                               | ☐   |
| 10.7  | Verificar LineChart "Evolução do saldo acumulado"                  | Linha com pontos; sobe quando receitas > despesas, desce no contrário                          | ☐   |
| 10.8  | Verificar tabela "Detalhamento mensal"                             | Mês atual tem badge **"atual"** com fundo levemente colorido                                   | ☐   |
| 10.9  | Tocar **"CSV"** no header                                          | Dialog nativo de compartilhamento abre; conteúdo CSV com cabeçalho Mês;Receitas;Despesas;Saldo | ☐   |
| 10.10 | Período sem transações                                             | Gráficos exibem "Nenhuma receita no período" / "Sem dados no período"                          | ☐   |

---

## Seção 11 — Regressão (funcionalidades existentes)

| #    | Área        | O que verificar                                                        | OK? |
| ---- | ----------- | ---------------------------------------------------------------------- | --- |
| 11.1 | Login       | Login funciona normalmente; sessão persiste ao fechar e reabrir o app  | ☐   |
| 11.2 | Dashboard   | Últimas 5 transações do mês aparecem na lista                          | ☐   |
| 11.3 | Transações  | Criar Despesa e Receita simples — ambas aparecem na lista corretamente | ☐   |
| 11.4 | Cartões     | Criar novo cartão → aparece na lista                                   | ☐   |
| 11.5 | Metas       | Criar nova meta → depósito → barra de progresso reflete o valor        | ☐   |
| 11.6 | Tema        | Configurações → alternar claro/escuro → toda a UI muda                 | ☐   |
| 11.7 | Modo oculto | Ícone de olho → valores viram "••••" em **todas** as telas             | ☐   |
| 11.8 | Navegação   | Navegar entre todas as 6 abas sem crash ou tela branca                 | ☐   |

---

## Casos de Borda

| #   | Cenário                                                      | Resultado esperado                                                        | OK? |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------- | --- |
| B.1 | Filtrar por categoria sem transações no mês                  | Lista vazia com mensagem "Nenhuma transação com esses filtros"            | ☐   |
| B.2 | Excluir transação enquanto há filtros ativos                 | Item some; lista mantém os demais filtros                                 | ☐   |
| B.3 | Relatórios com conta sem nenhuma transação                   | Todos os gráficos exibem mensagem vazia; cards de resumo mostram R$ 0     | ☐   |
| B.4 | Saldo total negativo no card "Saldo nos Bancos"              | Total do card em vermelho; ao expandir, banco negativo também em vermelho | ☐   |
| B.5 | Transferência: verificar saldo de ambos os bancos após criar | Origem debita; destino credita; total geral do Dashboard inalterado       | ☐   |
| B.6 | Donut nível 1 sem receitas (só despesas no mês)              | Botão "Ver Receitas por categoria" não aparece                            | ☐   |

---

## Como reportar um bug

Ao encontrar comportamento inesperado, anote:

1. **Seção e número** do caso de teste (ex: "4.3")
2. **Dispositivo/SO** (ex: Samsung A54 Android 14 / iPhone 13 iOS 17)
3. **O que aconteceu** vs **o que era esperado**
4. **Print** da tela, se possível

Encaminhe para o desenvolvedor via WhatsApp ou e-mail com as informações acima.

---

_Guia gerado em 2026-05-09 — branch `feature/mobile-parity`_
