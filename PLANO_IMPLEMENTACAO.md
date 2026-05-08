# Plano de Implementação - Player de Música Angular

## Visão Geral
Auditoria completa da aplicação para corrigir fluxo de navegação, remover botões duplicados e melhorar a experiência do usuário.

---

## 1. Estrutura de Rotas

| Rota | Página | Funcionalidades |
|------|--------|-----------------|
| `/home` | Player | Play/pause, anterior, próximo, barra progresso |
| `/browse` | Explorar | Buscar/filtrar músicas e artistas |
| `/library` | Biblioteca | Abrir pasta, carregar/salvar/deletar playlist |
| `/settings` | Perfil | Configurações e login |

---

## 2. Biblioteca (LibraryComponent) - NOVO COMPONENTE

### Funcionalidades obrigatórias:
- **📂 Abrir Pasta** - Input de arquivo com `webkitdirectory`
- **📄 Carregar Playlist** - Importar playlist do localStorage/Supabase
- **💾 Salvar Playlist** - Salvar playlist atual com nome
- 🗑️ **Deletar Playlist** - Remover playlist selecionada
- **📁 Carregar Arquivos** - Input de arquivos avulsos (`accept="audio/*"`)
- **🎵 Lista de Músicas** - Exibir todas as músicas carregadas
- **🎴 Lista de Playlists** - Exibir playlists salvas

---

## 3. BrowseComponent - NOVO COMPONENTE

### Funcionalidades:
- 🔍 Busca por nome de música
- 🔍 Busca por artista
- 🔍 Filtros por tipo/formato

---

## 4. Remoções Necessárias

### 4.1 Remover Tabs do Home
**Arquivo:** `src/app/home/home.component.html`
**Linhas:** 3-12
**Conteúdo a remover:**
```html
<div class="retro-tabs-container">
  <div class="tabs-scroll">
    <button class="tab-item" ...>INÍCIO</button>
    <button class="tab-item" ...>PASTAS</button>
    <button class="tab-item" ...>PLAYLISTS</button>
    <button class="tab-item" ...>MÚSICAS</button>
    <button class="tab-item" ...>ÁLBUMS</button>
    <button class="tab-item" ...>ARTISTAS</button>
  </div>
</div>
```

### 4.2 Remover Botão Perfil Duplicado do Header
**Arquivo:** `src/app/layout/app-layout.component.html`
**Linhas:** 17-21
**Conteúdo a remover:**
```html
<div class="header-actions">
  <button class="btn-icon profile-btn" routerLink="/settings">
    <svg ...></svg>
  </button>
</div>
```

---

## 5.Player (HomeComponent) -Funcionalidades Atuais

O player já possui todos os controles necessários:
- ▶️ **Play/Pause** - Toggle de reprodução
- ⏮️ **Anterior** - Música anterior (`previous()`)
- ⏭️ **Próxima** - Próxima música (`next()`)
- 📊 **Barra de Progresso** - Seek com slider de tempo

---

## 6. Arquivos a Criar

| Arquivo | Descrição |
|--------|----------|
| `src/app/browse/browse.component.ts` | Componente Browse |
| `src/app/browse/browse.component.html` | Template Browse |
| `src/app/browse/browse.component.scss` | Estilos Browse |
| `src/app/library/library.component.ts` | Componente Library |
| `src/app/library/library.component.html` | Template Library |
| `src/app/library/library.component.scss` | Estilos Library |

---

## 7. Arquivos a Modificar

| Arquivo | Modificação |
|--------|-------------|
| `src/app/app-routing.module.ts` | Adicionar rotas para browse e library |
| `src/app/app.module.ts` | importing dos novos componentes |
| `src/app/home/home.component.ts` | Remover lógica de tabs |
| `src/app/home/home.component.html` | Remover tabs e conteúdo das tabs |
| `src/app/layout/app-layout.component.html` | Remover botão perfil duplicado |

---

## 8. Ordem de Implementação

1. **Criar BrowseComponent** - Template + lógica básica
2. **Criar LibraryComponent** - Template com todas as funcionalidades
3. **Corrigir roteamento** - app-routing.module.ts
4. **Atualizar app.module.ts** - Importar novos módulos
5. **Limpar HomeComponent** - Remover tabs
6. **Limpar AppLayout** - Remover botão duplicado
7. **Testar navegação**

---

## 9. Dependências Existentes

O projeto já utiliza:
- AudioService para controle de áudio
- SupabaseService para persistência
- MediaStore para estado global

 Novos componentes devem injetar AudioService e SupabaseService conforme necessário.

---

## 10. Checklist de Validação

- [ ] Navegação Bottom Bar funciona corretamente
- [ ] /home exibe apenas player
- [ ] /browse exibe área de busca/filtro
- [ ] /library contém todos os botões de playlist
- [ ] Botão Perfil aparece apenas no footer
- [ ] Player tem todos os controles (play/pause, anterior, próximo)
- [ ] Sem tabs visíveis no home