# Plano de Transformação Android Pro: PLAYER VLS PLUS

Este plano atualizado foca em automação via CI/CD e uma arquitetura de autenticação proprietária e segura.

## 🎯 Objetivos Principais
1.  **Build Automatizado:** Uso de **GitHub Actions** para gerar o APK (sem necessidade de Android Studio local).
2.  **Autenticação Real (Proprietária):** Sistema de Login/Cadastro seguro usando Node.js, JWT e Bcrypt.
3.  **Armazenamento Nativo:** Persistência de dados na pasta raiz `/VLSPLUS_TEMP/`.
4.  **Segurança Avançada:** Proteção de rotas com Angular Auth Guards e interceptores para Tokens.

---

## 🛠️ Arquitetura de Sistemas

### 1. CI/CD (GitHub Actions)
Configuraremos um workflow `.yml` que:
- Dispara ao realizar `git push`.
- Instala o Node.js e o Java no ambiente do GitHub.
- Executa o build do Angular.
- Usa o Capacitor para gerar o projeto Android.
- Compila o APK usando `gradlew`.
- Disponibiliza o APK como um "Artifact" para download.

### 2. Autenticação e Nuvem (Supabase + Angular)
**Backend (Supabase):**
- **Auth:** Uso direto do Supabase Auth no Angular.
- **Database:** Sincronização automática via `SupabaseService`.
- **Segurança:** Políticas de RLS (Row Level Security) no Supabase.

**Frontend (Angular):**
- **Auth Service:** Gerencia o fluxo de login e sincronia híbrida.
- **Auth Guard:** Protege rotas nativas e web.
- **Auth Service:** Gerencia o fluxo de login e armazena o JWT no `Capacitor Preferences`.
- **Auth Guard:** Impede o acesso às rotas `/home`, `/library`, etc., se o usuário não estiver autenticado.
- **Interceptor:** Adiciona automaticamente o Token no cabeçalho de todas as requisições.

---

## 📂 Gerenciamento da Pasta `VLSPLUS_TEMP`

A aplicação utilizará o plugin `@capacitor/filesystem` para gerenciar tudo o que é local:
- `/VLSPLUS_TEMP/.user_session`: Armazena o token e dados básicos do perfil para acesso offline.
- `/VLSPLUS_TEMP/playlists/`: Pasta contendo os arquivos JSON das playlists.
- `/VLSPLUS_TEMP/config.json`: Preferências do player.

---

## 🚀 Etapas da Implementação

### Fase 1: Backend de Autenticação
- Criar a pasta `/server` na raiz do projeto.
- Implementar a API Express com JWT e Bcrypt.
- Testar o fluxo de cadastro e login.

### Fase 2: Integração Angular
- Criar o `AuthService` no Angular.
- Implementar a tela de Login/Cadastro (UI Premium).
- Configurar os Guards para proteger o Player.

### Fase 3: Capacitor & Filesystem
- Instalar Capacitor e configurar o diretório nativo.
- Migrar o salvamento de dados para a pasta `VLSPLUS_TEMP`.

### Fase 4: Automação GitHub
- Criar o arquivo `.github/workflows/android-build.yml`.
- Configurar os segredos (keystores) no GitHub para assinatura do APK.

---

## 📋 Próximos Passos
1.  **Subir o código para um repositório GitHub.**
2.  **Configurar o servidor Node.js** (Pode ser local para testes ou em uma VPS).
3.  **Gerar o fluxo de Login** no Angular.

**Deseja que eu comece a criar o código do Servidor de Autenticação em Node.js para você?**
