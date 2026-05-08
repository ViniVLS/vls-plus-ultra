# Plano de Implementação: Player App Premium & Supabase

## Goal
Transformar a aplicação Angular atual em um Player com design UX/UI Premium focado em Mobile (Dark Mode, animações fluidas) e preparar a arquitetura de estado e serviços para sincronização em tempo real com o Supabase.

## Tasks
- [ ] Task 1: Instalar dependências necessárias do Supabase (`@supabase/supabase-js`) → Verify: Verificar no `package.json` se a dependência foi instalada.
- [ ] Task 2: Configurar o `SupabaseService` e `environments` com placeholders para URL e Key → Verify: Inicializar a aplicação sem erros no console sobre a injeção do serviço.
- [ ] Task 3: Corrigir o `angular.json` (truncado/incompleto conforme análise do VLS4) e adicionar estilos globais premium (fonte Inter, variáveis CSS de tema escuro). → Verify: Rodar `ng build` sem erros e verificar aplicação visual no navegador.
- [x] Task 4: Instalar e configurar PWA com Service Worker (ngsw-worker.js) → Verify: Executar `ng build --prod` e verificar se o service worker é gerado corretamente.
- [ ] Task 5: Criar a arquitetura de estado para Gerenciamento de Mídia e Reprodução (Play, Pause, Progress) → Verify: Componentes base conseguem ler e atualizar o estado.
- [x] Task 6: Refatorar o Layout Principal aplicando princípios de *Mobile Design*: navegação inferior, SafeArea, e touch targets de 48px → Verify: Inspecionar responsividade e alvos de toque na visualização mobile.
- [x] Task 7: Implementar o Componente Player de Vídeo com controles premium (overlay com leve glassmorphism, sliders grandes) → Verify: Tocar um vídeo mock, interagir com controles na tela mobile.
- [ ] Task 8: Integrar a lógica de sincronização: Despachar a atualização de progresso de vídeo assíncrona para o `SupabaseService` → Verify: Console log evidenciando envio do payload do estado.
- [ ] Task 9: Auditar a acessibilidade e responsividade Mobile usando as diretrizes de Frontend Design → Verify: Passar por auditoria visual sem falhas graves.

## Done When
- [ ] O pacote do Supabase está instalado e o serviço está estruturado e pronto.
- [x] O PWA está configurado com service worker funcionando corretamente.
- [x] A interface exibe um tema escuro e controles otimizados para toque (Mobile-first, Premium feel).
- [ ] O projeto Angular compila e executa sem os erros identificados de configuração.

## Notes
- A análise do VLS4 apontou que o background verde claro e problemas de UX/SEO prejudicam o app. O layout será refatorado focando em consumo de mídia (cores profundas e amigáveis para baixa luz).
- As decisões de UI foram guiadas pelas skills `mobile-design` e `frontend-design`.
