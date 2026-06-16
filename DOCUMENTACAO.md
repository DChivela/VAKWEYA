# Documentacao do Projeto Vakwetu Weya

## 1. Visao Geral

O Vakwetu Weya e um site moderno de turismo para Angola. A aplicacao permite divulgar destinos, hoteis, restaurantes, tours e roteiros, alem de receber reservas, contactos e gerir conteudos atraves de um painel administrativo.

O projeto usa:

- React no frontend.
- Vite como ferramenta de desenvolvimento e build.
- Express no backend.
- MySQL como base de dados.
- Autenticacao simples por sessoes em memoria e tokens guardados no navegador.
- Upload de imagens para a pasta `public/uploads`.

## 2. Como Rodar o Projeto

Entre na pasta do projeto:

```powershell
cd "C:\Users\domin\OneDrive - MSFT\Documentos\CASOS DE ESTUDOS\WEB\VAKWETU WEYA\VAKWEYA"
```

Instale as dependencias:

```powershell
pnpm install
```

Se o pnpm bloquear o `esbuild`, aprove o build:

```powershell
pnpm approve-builds
```

Depois selecione `esbuild`, confirme e rode:

```powershell
pnpm install
```

Para desenvolvimento:

```powershell
pnpm run dev
```

Isto inicia:

- Frontend em `http://127.0.0.1:5173`
- Backend em `http://127.0.0.1:4000`

Para gerar build de producao:

```powershell
pnpm run build
```

Para testar o build:

```powershell
pnpm run preview
```

## 3. Credenciais de Administrador

Administrador raiz:

- Usuario: `dchivela`
- Palavra-passe: `#focus2024`

Esta conta e protegida:

- Nao pode ser eliminada.
- Nao pode ser despromovida para cliente.
- Nao pode ser renomeada pelo modal administrativo.

## 4. Estrutura Principal de Pastas

```text
VAKWEYA/
  database/
    weya.sql
  public/
    assets/
    uploads/
  server/
    index.js
  src/
    components/
    data/
    pages/
    services/
    App.jsx
    styles.css
  package.json
  vite.config.js
```

## 5. Frontend

O frontend esta em `src/`.

### 5.1 App.jsx

O ficheiro `src/App.jsx` e o centro da aplicacao React.

Ele faz:

- Carrega o catalogo do backend.
- Controla a rota atual.
- Intercepta cliques internos em links.
- Mostra a pagina correta conforme o caminho.
- Atualiza o catalogo depois de alteracoes no admin.

Rotas principais:

- `/`
- `/destinos`
- `/hoteis`
- `/restaurantes`
- `/tours`
- `/roteiros`
- `/reservas`
- `/mapa`
- `/conta`
- `/admin`
- `/contacto`
- `/sobre`

### 5.2 Header

Ficheiro: `src/components/Header.jsx`

Funcionalidades:

- Mostra o logotipo.
- Mostra o menu principal.
- Mostra botao `Reservar`.
- Se nao houver sessao, mostra a opcao `Conta`.
- Se houver sessao iniciada, esconde a opcao de login/conta normal.
- Se houver sessao de utilizador, mostra `Perfil`.
- Se houver apenas sessao administrativa, mostra `Admin`.
- Mostra botao `Sair` no menu.

O botao `Sair` remove:

- `vakwetu_user_token`
- `vakwetu_admin_token`

Tambem redireciona para a pagina inicial se o utilizador estiver em `/conta` ou `/admin`.

### 5.3 Hero e Chamada para Conta

Ficheiros:

- `src/components/Hero.jsx`
- `src/components/AccountTeaser.jsx`

Na pagina inicial ha:

- Botao para criar reserva.
- Botao para ver destinos.
- Botao para criar conta.
- Faixa de destaque para criar conta ou entrar.

Isto facilita o acesso dos utilizadores ao registo/login.

### 5.4 Pagina de Conta

Ficheiro: `src/components/AccountPanel.jsx`

Permite:

- Criar conta.
- Iniciar sessao.
- Enviar foto de perfil.
- Ver perfil depois do login.
- Abrir painel admin quando o utilizador autenticado for administrador.
- Terminar sessao.

Campos de registo:

- Nome
- Usuario
- Email
- Telefone
- Palavra-passe
- Foto de perfil

Um utilizador criado pelo site recebe sempre a role `cliente`.

### 5.5 Upload de Imagens

Ficheiro: `src/components/FileUploadField.jsx`

Este componente substitui campos manuais de caminho de imagem.

Ele permite:

- Abrir a janela de ficheiros do dispositivo.
- Selecionar uma imagem.
- Fazer preview da imagem.
- Enviar imagem para o backend.
- Guardar o URL retornado pelo backend.

Tipos aceites:

- PNG
- JPG/JPEG
- WebP

Limite no backend:

- 5 MB por imagem.

### 5.6 PWA e Instalacao Mobile

Ficheiros principais:

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/pwa/icon-192.png`
- `public/pwa/icon-512.png`
- `public/pwa/maskable-512.png`
- `src/components/PWAInstallPrompt.jsx`
- `src/main.jsx`

O projeto esta preparado como Progressive Web App.

Funcionalidades:

- Manifesto com nome, icones, cor de tema e atalhos.
- Icones para Android/Chrome e modo maskable.
- Service worker para cache basico da interface.
- Botao `Instalar app` quando o navegador permitir.
- Modo standalone quando instalado no dispositivo.

Notas importantes:

- Em desenvolvimento local, o service worker so e registado no build de producao.
- Para funcionar como PWA fora do localhost, o site precisa estar em HTTPS.
- As rotas `/api/*` nao sao cacheadas para evitar dados antigos de login, reservas e painel administrativo.

## 6. Paginas Publicas

Ficheiro: `src/pages/PublicPages.jsx`

### 6.1 Pagina Inicial

Mostra:

- Hero
- Chamada para conta
- Destinos
- Servicos
- Mapa interativo
- Depoimentos

### 6.2 Destinos

Lista destinos com:

- Imagem
- Provincia
- Resumo
- Preco desde
- Rating
- Botao de reserva contextual

### 6.3 Hoteis

Lista hoteis com:

- Nome
- Destino
- Preco por noite
- Comodidades
- Botao `Reservar quarto`

### 6.4 Restaurantes

Lista restaurantes com:

- Nome
- Destino
- Cozinha
- Preco medio
- Botao `Reservar mesa`

### 6.5 Tours

Lista tours com:

- Tipo
- Duracao
- Preco
- Botao `Reservar tour`

### 6.6 Roteiros

Lista modelos de roteiros com:

- Dias
- Mood
- Orcamento textual
- Paragens
- Inclusoes
- Botao para pedir roteiro

### 6.7 Reservas

Mostra o formulario de reserva.

Se o utilizador vier de um hotel, restaurante, tour ou destino, a reserva ja abre preenchida com o tipo e item selecionado.

Exemplo:

```text
/reservas?tipo=hotel&id=1
```

## 7. Sistema de Reservas

Ficheiro: `src/components/BookingForm.jsx`

Permite:

- Escolher tipo de servico.
- Escolher item especifico.
- Preencher nome, email e telefone.
- Definir numero de pessoas.
- Definir chegada e saida.
- Ver orcamento sugerido.
- Alterar orcamento manualmente.
- Enviar reserva.
- Associar automaticamente a reserva ao utilizador logado.

### 7.1 Calculo Automatico de Orcamento

Hotel:

```text
preco por noite x numero de noites x quartos estimados
```

Restaurante:

```text
preco medio x pessoas
```

Tour:

```text
preco x pessoas
```

Destino:

```text
preco desde x pessoas
```

Roteiro:

- Nao calcula automaticamente se o orcamento for textual, como `Medio` ou `Flexivel`.

O cliente pode alterar o valor sugerido.

### 7.2 Historico do Cliente

Quando o visitante cria uma reserva com sessao iniciada, o sistema guarda o `user_id` na tabela `reservations`.

Na pagina `/conta`, o utilizador autenticado consegue consultar:

- Reservas criadas pela propria conta.
- Reservas antigas com o mesmo email do perfil.
- Estado da reserva.
- Datas, numero de pessoas e orcamento.
- Observacoes enviadas no formulario.

Isto permite que o cliente acompanhe o proprio historico sem acesso ao painel administrativo.

## 8. Assistente Virtual FAQ

Ficheiros principais:

- `src/components/VirtualAssistant.jsx`
- `server/index.js`
- `src/services/api.js`

O site possui um assistente virtual proprio, gratuito e baseado em perguntas frequentes.

Funciona assim:

- O utilizador abre o botao flutuante no canto inferior direito.
- Pode clicar em sugestoes ou escrever uma pergunta.
- O backend procura a melhor resposta na tabela `assistant_faqs`.
- Quando encontra resposta segura, devolve a resposta cadastrada.
- Quando nao encontra, responde de forma honesta e grava a pergunta em `assistant_logs`.

### 8.1 Treinamento do Assistente

O treinamento e feito pelo painel administrativo, sem depender de IA externa.

O administrador pode:

- Criar perguntas frequentes.
- Editar perguntas, respostas, categorias e palavras-chave.
- Eliminar FAQs do assistente.
- Ver perguntas sem resposta para transformar em novas FAQs.

Tabelas:

- `assistant_faqs`: base de conhecimento do assistente.
- `assistant_logs`: historico de perguntas feitas pelos utilizadores.

Endpoints publicos:

- `GET /api/assistant/suggestions`
- `POST /api/assistant/chat`

Endpoints administrativos:

- `GET /api/admin/assistant/faqs`
- `POST /api/admin/assistant/faqs`
- `PUT /api/admin/assistant/faqs/:id`
- `DELETE /api/admin/assistant/faqs/:id`
- `GET /api/admin/assistant/logs`

## 9. Mapa Interativo

Ficheiro: `src/components/InteractiveMap.jsx`

Funcionalidades:

- Mostra o contorno real de Angola, incluindo Cabinda.
- Renderiza pontos conforme coordenadas dos destinos.
- Mostra etiquetas de provincias a partir dos destinos carregados.
- Destinos criados no admin tambem aparecem no mapa se tiverem provincia e coordenadas.
- Botao de reserva contextual para o destino selecionado.

## 10. Painel Administrativo

Ficheiro: `src/components/AdminPanel.jsx`

Acesso:

```text
/admin
```

So utilizadores com role `admin` podem alterar conteudos.

### 10.1 Metricas

Mostra:

- Reservas
- Contactos
- Pendentes
- Duvidas sem resposta do assistente
- Utilizadores
- Conteudos

### 10.2 Consulta de Reservas

O painel administrativo tem uma area separada para consultar todas as reservas.

Permite filtrar por:

- Todas
- Pendentes
- Confirmadas
- Canceladas
- Concluidas

Cada reserva mostra:

- Nome do cliente
- Email e telefone
- Tipo de servico
- Datas
- Numero de pessoas
- Orcamento
- Estado
- Observacoes

### 10.3 Reservas Recentes

Mostra pedidos recentes de reserva:

- Nome do cliente
- Tipo de servico
- Numero de pessoas
- Estado

### 10.4 Contactos Recentes

Mostra mensagens recebidas:

- Nome
- Assunto
- Estado

### 10.5 Gestao de Conteudos

Permite criar, editar e eliminar:

- Destinos
- Hoteis
- Restaurantes
- Tours
- Roteiros
- Depoimentos

Campos de imagem usam seletor de ficheiro.

### 10.6 Edicao de Conteudos

Ao selecionar `Editar`, o formulario administrativo e preenchido com os dados atuais.

Depois de guardar:

- O backend atualiza a base de dados.
- O frontend recarrega o catalogo.
- O conteudo publico e atualizado.

### 10.7 Eliminacao de Conteudos

O sistema usa eliminacao logica para conteudos na base de dados:

- `active = 0`

Assim o item deixa de aparecer no site publico sem apagar fisicamente a linha.

## 11. Gestao de Utilizadores

No painel admin existe uma section para utilizadores.

Permite:

- Ver utilizadores.
- Abrir modal de edicao.
- Alterar nome.
- Alterar usuario, exceto `dchivela`.
- Alterar email.
- Alterar telefone.
- Alterar foto de perfil.
- Alterar tipo de utilizador por combobox.
- Definir nova palavra-passe opcional.
- Eliminar utilizadores comuns.

### 11.1 Modal de Edicao

O modal foi criado para ser elegante e focado.

Campos:

- Foto de perfil
- Nome
- Usuario
- Email
- Telefone
- Tipo
- Nova palavra-passe

Tipos:

- Cliente
- Administrador

### 11.2 Protecao do dchivela

A conta `dchivela` e especial.

Ela nao pode:

- Ser eliminada.
- Ser renomeada.
- Ser despromovida.

Esta protecao existe no frontend e no backend.

## 12. Backend

Ficheiro: `server/index.js`

Responsabilidades:

- Criar servidor Express.
- Ligar ao MySQL.
- Criar schema quando necessario.
- Criar admin raiz.
- Servir uploads.
- Receber reservas.
- Receber contactos.
- Autenticar utilizadores.
- Validar permissoes administrativas.
- Criar/editar/eliminar conteudos.
- Gerir utilizadores.
- Responder perguntas do assistente FAQ.
- Gerir a base de conhecimento do assistente.

## 13. Base de Dados

Ficheiro: `database/weya.sql`

Tabelas principais:

- `users`
- `destinations`
- `hotels`
- `restaurants`
- `tours`
- `itineraries`
- `reservations`
- `contacts`
- `assistant_faqs`
- `assistant_logs`
- `testimonials`

### 13.1 users

Campos importantes:

- `username`
- `name`
- `email`
- `phone`
- `avatar`
- `password_hash`
- `role`

Roles:

- `admin`
- `cliente`

### 13.2 reservations

Guarda:

- Tipo de servico
- ID do servico
- Nome do cliente
- Email
- Telefone
- Pessoas
- Datas
- Orcamento
- Notas
- Estado

### 13.3 assistant_faqs

Guarda a base de conhecimento do assistente:

- Categoria
- Pergunta
- Resposta
- Palavras-chave
- Estado ativo/inativo

### 13.4 assistant_logs

Guarda perguntas feitas ao assistente:

- Pergunta do utilizador
- Resposta dada
- FAQ associada
- Nivel de confianca
- Se foi respondida com sucesso

## 14. Endpoints Principais

### Publicos

```http
GET /api/health
GET /api/catalog
POST /api/uploads
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
GET /api/assistant/suggestions
POST /api/assistant/chat
POST /api/reservations
POST /api/contacts
```

### Admin

Requer token de admin.

```http
POST /api/admin/login
GET /api/admin/overview
GET /api/admin/users
PUT /api/admin/users/:id
PATCH /api/admin/users/:id/role
DELETE /api/admin/users/:id
GET /api/admin/assistant/faqs
POST /api/admin/assistant/faqs
PUT /api/admin/assistant/faqs/:id
DELETE /api/admin/assistant/faqs/:id
GET /api/admin/assistant/logs
POST /api/admin/content/:resource
PUT /api/admin/content/:resource/:id
DELETE /api/admin/content/:resource/:id
```

## 15. Autenticacao

Tokens guardados no navegador:

- `vakwetu_user_token`
- `vakwetu_admin_token`

O login aceita duas formas de identificacao no mesmo campo:

- Nome de utilizador, por exemplo `dchivela`.
- Email, por exemplo `admin@vakwetuweya.ao`.

O header observa estes tokens.

Quando ha sessao:

- A opcao de login/conta normal e ocultada.
- Aparece `Perfil` ou `Admin`.
- Aparece `Sair`.

Quando o utilizador clica em `Sair`:

- Os tokens sao removidos.
- O menu atualiza.
- Se estiver em `/admin` ou `/conta`, volta para `/`.

## 16. Conceitos JavaScript e React Usados

### 16.1 Componentes

Um componente React e uma funcao que devolve JSX.

Exemplo:

```jsx
export function Header() {
  return <header>...</header>;
}
```

### 16.2 Estado

Estado e uma memoria interna do componente.

Exemplo:

```jsx
const [menuOpen, setMenuOpen] = useState(false);
```

`menuOpen` guarda o valor atual.

`setMenuOpen` altera esse valor.

### 16.3 Efeitos

`useEffect` executa logica quando algo muda.

Exemplo:

```jsx
useEffect(() => {
  carregarDados();
}, []);
```

Com `[]`, executa apenas quando o componente aparece.

### 16.4 Props

Props sao dados passados de um componente pai para um componente filho.

Exemplo:

```jsx
<Header currentPath={currentPath} />
```

### 16.5 Eventos

Eventos respondem a interacoes do utilizador.

Exemplo:

```jsx
<button onClick={logout}>Sair</button>
```

### 16.6 Fetch/API

O frontend comunica com o backend atraves de chamadas HTTP.

No projeto, isto fica centralizado em:

```text
src/services/api.js
```

### 16.7 localStorage

O `localStorage` guarda dados no navegador.

Neste projeto, guarda tokens de sessao.

Exemplo:

```js
localStorage.setItem('vakwetu_user_token', token);
```

## 17. Ficheiros Mais Importantes

### Frontend

- `src/App.jsx`
- `src/components/Header.jsx`
- `src/components/Hero.jsx`
- `src/components/AccountPanel.jsx`
- `src/components/AdminPanel.jsx`
- `src/components/BookingForm.jsx`
- `src/components/PWAInstallPrompt.jsx`
- `src/components/VirtualAssistant.jsx`
- `src/components/InteractiveMap.jsx`
- `src/components/FileUploadField.jsx`
- `src/pages/PublicPages.jsx`
- `src/services/api.js`
- `src/styles.css`

### Backend

- `server/index.js`

### Base de Dados

- `database/weya.sql`

### PWA

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/pwa/icon-192.png`
- `public/pwa/icon-512.png`
- `public/pwa/maskable-512.png`

## 18. Problemas Comuns

### 18.1 Cannot PUT /api/admin/users/:id

Significa que o frontend esta novo, mas a API ativa e antiga.

Resolucao:

```powershell
Stop-Process -Id ID_DO_PROCESSO -Force
pnpm run dev
```

Para ver quem esta na porta `4000`:

```powershell
cmd /c netstat -ano | findstr :4000
```

### 18.2 EPERM ao criar uploads

Pode acontecer se a API estiver a apontar para a pasta antiga.

Resolucao:

- Parar servidores antigos.
- Rodar o projeto na pasta correta.
- Verificar se `.env` nao tem `UPLOAD_DIR` apontando para a pasta errada.

### 18.3 esbuild bloqueado pelo pnpm

Resolucao:

```powershell
pnpm approve-builds
```

Depois selecione `esbuild`.

### 18.4 Alteracoes nao aparecem

Tente:

```powershell
Ctrl + C
pnpm run dev
```

No navegador:

```text
Ctrl + F5
```

## 19. Melhorias Futuras

Ideias naturais para as proximas fases:

- Eliminacao de conta pelo proprio utilizador, parecida com Laravel Jetstream.
- Recuperacao de palavra-passe.
- Confirmacao de email.
- Dashboard do cliente.
- Estados editaveis para reservas.
- Upload multiplo de imagens por estabelecimento.
- Galeria por hotel/restaurante/tour.
- Paginacao no painel admin.
- Filtros por provincia, preco e tipo.
- Permissoes mais granulares, como editor, operador e administrador.

## 20. Resumo Rapido

O projeto ja possui:

- Site publico responsivo.
- PWA instalavel em dispositivos compativeis.
- Rotas separadas.
- Catalogo de destinos, hoteis, restaurantes, tours e roteiros.
- Mapa interativo de Angola.
- Reservas contextuais.
- Historico de reservas por cliente.
- Consulta administrativa de todas as reservas.
- Orcamento automatico.
- Assistente virtual FAQ.
- Gestao administrativa de perguntas e respostas do assistente.
- Historico de perguntas sem resposta para treino.
- Conta de utilizador.
- Foto de perfil.
- Login/logout.
- Painel administrativo.
- CRUD de conteudos.
- Upload de imagens.
- Gestao de utilizadores.
- Modal de edicao de utilizadores.
- Protecao da conta raiz `dchivela`.
