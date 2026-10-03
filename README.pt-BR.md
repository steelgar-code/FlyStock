# FlyStock

[English](README.md) · [Українська](README.uk.md)

Rastreador de itens offline-first para registrar entrada e saída de equipamentos e estoque, com histórico completo — sem conta, sem servidor, sem etapa de build.

## Funcionalidades

- **Rastreamento item por item** — registre cada item com sua própria descrição (ex.: um número de série ou outro detalhe identificador), em vez de uma contagem geral de quantidade.
- **Ciclo de vida Adicionar → Remover → Restaurar** — mova um item do estoque atual para uma lista separada de Itens Removidos com data/hora e motivo registrados, e restaure-o caso tenha sido removido por engano.
- **Histórico de notas** — adicione várias notas com data/hora a um item durante toda a sua vida útil (condição, localização, origem, etc.).
- **Tipos com grupos recolhíveis e coloridos** — organize os itens em tipos; a lista os agrupa e coloriza automaticamente, e cada grupo pode ser recolhido ou expandido.
- **Entrada em lote** — depois de adicionar um item, o formulário permanece aberto apenas com a descrição limpa, para que você possa registrar vários itens semelhantes em sequência sem reinserir o tipo, a data ou a nota.
- **Busca** — filtre entre itens atuais e removidos.
- **Backup e exportação** — exporte seu inventário, incluindo notas e histórico de remoções, como um arquivo de texto simples, e importe-o de volta (de forma aditiva — nada que já foi salvo é sobrescrito). Como tudo fica armazenado no navegador, exportar um backup periodicamente é a única forma de manter seus dados seguros.
- **PWA instalável** — instale na tela inicial e use offline graças a um service worker.
- **Multilíngue** — disponível em inglês, ucraniano e português (BR).
- **Armazenamento somente local** — todos os dados ficam no `localStorage` do seu navegador; nada é enviado a um servidor.

## Uso

O FlyStock é um único arquivo HTML estático, sem etapa de build ou dependências. Para executá-lo:

1. Abra `index.html` diretamente no navegador, ou
2. Sirva a pasta com qualquer servidor de arquivos estáticos (ex.: `npx serve .`) e abra no navegador.
3. Opcionalmente, instale-o como PWA pelo prompt de instalação do navegador para uso offline.

## Dados e privacidade

Todos os dados do inventário são armazenados localmente no seu navegador via `localStorage`. Nada é enviado para lugar algum. Limpar os dados do navegador removerá essas informações, então exporte regularmente para backup.

## Licença

MIT — veja [LICENSE](LICENSE).
