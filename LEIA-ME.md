# PACO - como colocar no ar

Tempo total: cerca de 20 minutos. Você vai fazer 3 coisas: criar o banco de dados (Supabase), publicar o app (GitHub Pages) e instalar no iPhone.

Enquanto o arquivo `config.js` estiver vazio, o app funciona em **modo local**: tudo fica salvo só no aparelho, sem login. Serve para testar. Para ter backup na nuvem e usar em mais de um aparelho, siga os passos abaixo.

---

## 1. Criar o banco de dados no Supabase

1. Entre em https://supabase.com e crie uma conta (gratuita).
2. Clique em **New project**. Nome: `paco`. Escolha uma senha para o banco (guarde, mas você não vai usá-la no app). Região: **South America (São Paulo)**. Plano: Free.
3. Espere o projeto terminar de criar (1 a 2 minutos).
4. No menu lateral, abra **SQL Editor** > **New query**. Abra o arquivo `supabase/setup.sql` deste pacote, copie todo o conteúdo, cole no editor e clique em **Run**. Deve aparecer "Success. No rows returned".
5. Crie o seu usuário: menu **Authentication** > **Users** > **Add user** > **Create new user**. Preencha seu e-mail e uma senha, e marque **Auto Confirm User**. Essa será a conta que você usa para entrar no app.
6. Impeça que outras pessoas criem conta: **Authentication** > **Sign In / Providers** (em alguns projetos aparece como **Settings**) e desligue **Allow new users to sign up**.
7. Pegue os dados de conexão: **Project Settings** (engrenagem) > **API**. Copie:
   - **Project URL** (algo como `https://abcdefghijkl.supabase.co`)
   - a chave **anon public** (em projetos novos pode aparecer como **Publishable key**)

Os nomes dos menus mudam de vez em quando. Se não achar algum, procure pelo nome em inglês em negrito acima.

## 2. Preencher o config.js

Abra o arquivo `config.js` em qualquer editor de texto e cole os dois valores:

```js
window.PACO_CONFIG = window.PACO_CONFIG || {
  url: 'https://SEU-PROJETO.supabase.co',
  key: 'SUA-CHAVE-ANON'
};
```

A chave anon pode ficar no arquivo sem risco. Quem protege seus dados é o login e as regras de segurança que o `setup.sql` criou: sem entrar na sua conta, ninguém lê nem grava nada.

## 3. Publicar no GitHub Pages

1. Crie uma conta em https://github.com (gratuita) e, em **New repository**, crie um repositório chamado `paco`, marcado como **Public**. Marque **Add a README file** para ele nascer com um commit.
2. No repositório: **Add file** > **Upload files**. Arraste o **conteúdo** da pasta `paco` (não a pasta em si), incluindo as pastas `.github`, `css`, `js`, `icons`, `supabase`. Se o navegador não subir pastas ocultas como `.github`, use **Add file** > **Create new file**, digite `.github/workflows/pages.yml` no nome e cole o conteúdo do arquivo. Clique em **Commit changes**.
3. Vá em **Settings** > **Pages** > **Build and deployment** > **Source** e escolha **GitHub Actions**.
4. Abra a aba **Actions**. O fluxo "Publicar PACO" roda sozinho (1 a 2 minutos). Se não rodou, clique nele > **Run workflow**.
5. O endereço fica em `https://SEU-USUARIO.github.io/paco/`.

A partir daí, toda alteração enviada ao repositório é publicada automaticamente. Não há créditos nem selo no site.

Como o repositório é público, o código e o `config.js` ficam visíveis. Isso é seguro aqui (a chave anon é pública por desenho e seus dados só abrem com login), mas não coloque senhas nem a chave `service_role` em nenhum arquivo.

## 4. Instalar no iPhone

1. Abra o endereço do site no **Safari**.
2. Toque em **Compartilhar** > **Adicionar à Tela de Início** > **Adicionar**.
3. Abra o PACO **pelo ícone da tela inicial** e faça o login lá dentro (e-mail e senha do passo 1.5). O app instalado guarda os dados separados do Safari, então o login precisa ser feito nele.
4. Deixe aberto por alguns segundos com internet. Isso baixa o app e a fonte dos títulos para funcionar sem conexão.

A partir daí você só abre pelo ícone. O primeiro login precisa de internet. Depois disso, treinar e registrar séries funciona sem sinal, e tudo sincroniza quando a conexão volta.

---

## Como usar no dia a dia

- **Hoje:** mostra o treino do dia. Toque em **Iniciar treino**.
- **Séries:** carga e repetições já vêm preenchidas com o último treino. Toque no visto para concluir. O descanso começa sozinho, com aviso sonoro no fim (mantenha o volume ligado e o celular fora do modo silencioso).
- **Prancha e farmer walk:** o botão de play faz a contagem do tempo e conclui a série sozinho.
- **Ver execução:** abre o vídeo do exercício (precisa de internet) e as dicas escritas (funcionam offline). Dá para trocar o vídeo colando outro link do YouTube.
- **Finalizar treino:** salva a duração e as séries. Informe as calorias do Apple Watch se quiser.
- **Histórico:** calendário dos dias treinados e registro manual de pilates, natação, futevôlei etc.
- **Evolução:** gráfico de carga, volume e repetições por exercício.

## Pedir um programa novo ao Claude

1. Em **Mais** > **Relatório do período**, escolha 30 dias e toque em **Gerar e copiar relatório**.
2. Em **Mais** > **Programa de treino**, toque em **Copiar programa atual (JSON)**.
3. Cole os dois na conversa com o Claude e peça a próxima fase.
4. Copie o JSON que ele devolver, cole em **Colar programa novo** e toque em **Validar e importar**. O histórico é mantido.

## Vídeos

Os vídeos de cada exercício foram escolhidos por busca automática no YouTube e **não foram assistidos**. Confira a técnica antes de confiar, principalmente nos exercícios de pernas e lombar. Para trocar, abra **Ver execução** > **Trocar vídeo deste exercício**. Alguns vídeos podem bloquear a exibição dentro de outros sites. Nesse caso o botão **Abrir no YouTube** funciona.

## Problemas comuns

- **"E-mail ou senha incorretos":** confira o usuário criado em Authentication > Users. Se esqueceu a senha, redefina por lá.
- **Fica em "Preparando seus dados":** primeira sincronização sem internet ou `config.js` com URL/chave erradas. Confira os dois valores.
- **"Erro ao sincronizar" em Mais:** a mensagem aparece abaixo. Se citar `records`, o `setup.sql` não foi executado por completo. Rode de novo (pode rodar quantas vezes quiser).
- **Depois de atualizar o site, o app antigo continua:** feche o app por completo e abra duas vezes.
- **Depois de publicar, a página não muda:** o GitHub Pages leva até 10 minutos para atualizar. Confira a aba Actions.
- **Projeto gratuito do Supabase:** é pausado após 7 dias sem uso. Como você treina toda semana, não deve acontecer. Se pausar, reative em supabase.com (1 clique).
- **Backup:** em Mais > Backup, baixe o arquivo de vez em quando.

## O que ainda não existe (próximas fases)

Peso e medidas e fotos de evolução (em espera) e importação automática dos treinos do Apple Watch por Atalhos. A aba Comida (calorias por refeição, favoritos e saldo estimado) já existe.

## Estrutura dos arquivos

- `index.html`, `css/app.css`, `js/*.js`: o app.
- `config.js`: seus dados do Supabase.
- `sw.js`, `manifest.webmanifest`, `icons/`: instalação e uso offline.
- `supabase/setup.sql`: cria a tabela e as regras de segurança.
- `.github/workflows/pages.yml`: publica o site automaticamente a cada envio.
- `config.exemplo.js`: modelo do `config.js`.
