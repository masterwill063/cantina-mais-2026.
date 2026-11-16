# Cantina+ — sistema funcional

## Tecnologias
React + Vite; Node.js em funções serverless da Vercel; MySQL compatível (recomendado: TiDB Cloud).

## Funcionalidades
- Cardápio vindo do banco de dados.
- Carrinho, revisão e total calculado no servidor.
- Pedido salvo no banco, com número sequencial.
- Validação e baixa de estoque transacional.
- Acompanhamento do pedido com atualização automática.
- Painel da atendente protegido por PIN.
- Status: recebido → preparo → pronto → entregue.
- Pagamento presencial na retirada.

## 1. Banco de dados na nuvem
Crie um cluster MySQL compatível no TiDB Cloud. Copie host, porta, usuário e senha. O banco/schema `cantina` precisa existir. Ative SSL. As tabelas e produtos iniciais são criados automaticamente no primeiro acesso à API.

## 2. Rodar localmente
Instale Node.js LTS e Git. Extraia o ZIP, abra a pasta no VS Code e rode:
```bash
npm install
npm install -g vercel
```
Crie `.env` na raiz com:
```env
DB_HOST=host-do-banco
DB_PORT=4000
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=cantina
DB_SSL=true
STAFF_PIN=crie-um-pin
```
Depois rode:
```bash
vercel dev
```
Abra a URL que aparecer (geralmente http://localhost:3000). `npm run dev` sozinho não executa as rotas `/api`.

## 3. Publicar na Vercel
1. Crie um repositório no GitHub e envie todos os arquivos desta pasta.
2. Na Vercel: Add New → Project → importe o repositório.
3. Build Command: `npm run build`; Output Directory: `dist`.
4. Em Settings → Environment Variables, adicione `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true` e `STAFF_PIN`.
5. Clique em Deploy. Se alterar variáveis, faça redeploy.
6. Teste o site publicado: faça um pedido, abra o painel em outra aba/celular, atualize o status e confira o acompanhamento.

## 4. Como usar
- Estudante: adiciona produtos, revisa e confirma. O número é mostrado na tela.
- Para acompanhar depois, clique em Acompanhar pedido e digite o número sem zeros à esquerda (se aparecer 024, digite 24).
- Atendente: clique em Painel da atendente e informe o PIN definido em `STAFF_PIN`.
- O painel atualiza a lista a cada 5 segundos; acompanhamento atualiza a cada 4 segundos.

## Importante
O PIN é uma proteção simples adequada a uma demonstração acadêmica, não autenticação empresarial. Troque o PIN padrão, não publique o `.env` no GitHub e não coloque senhas do banco no código. O pagamento online não está implementado, pois a atividade prevê pagamento na retirada. O estoque inicial é de exemplo; ajuste no banco antes da apresentação.
