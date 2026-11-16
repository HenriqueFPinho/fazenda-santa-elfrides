# Fazenda Santa Elfrides

Sistema de cadastro e manejo do rebanho em HTML, CSS e JavaScript, sem dependências de execução ou compilação.

## Executar

```sh
python -m http.server 8000 --directory dist
```

Abra http://localhost:8000. Em produção, utilize HTTPS.

## Estrutura

- `dist/index.html`: login e navegação.
- `dist/style.css`: tema e adaptação para celular e computador.
- `dist/js/config.js`: estado e configuração local.
- `utils.js`, `rules.js`: utilitários e regras de negócio.
- `ui.js`, `records.js`: interface, cadastro e pesagem em sequência.
- `consult.js`, `campo.js`: consulta, administração e histórico somente leitura.
- `lots.js`: cadastro, seleção, vínculos e exclusão de lotes.
- `exits.js`, `returns.js`: saídas e retornos.
- `auth.js`, `files.js`, `app.js`: autorização, backup e inicialização.
- `tests/`: testes automatizados e dados fictícios isolados em `fixtures/`.

Os scripts compartilham o escopo da página; mantenha a ordem presente no HTML.
Nenhum animal de exemplo é criado ou excluído automaticamente em produção.

## Verificação

```sh
node --test tests/*.test.cjs
```

As suítes verificam cadastro parcial, bloqueio sem verificação do brinco,
autorização, vacinação, banho, preferências de sessão, lotes, saídas,
retornos, exclusões, login e backup. A interface é simulada e os dados
são isolados: os testes não alteram os registros reais do navegador.
A validação automatizada não substitui testes em aparelhos reais,
especialmente impressão/PDF e download/restauração de arquivos.

## Armazenamento e limites

Os registros ficam no localStorage deste navegador, sob a chave `campo-v1`.
Outro endereço ou aparelho terá armazenamento independente. Para transferir
registros, baixe e restaure uma cópia em Dados e segurança.

Login local: `admin` / `1234`. Verificação de edição: `220405`.
Esses controles locais não são autenticação de servidor e não protegem
os dados contra alguém com acesso ao navegador. Não reutilize essas senhas.

Não há sincronização, backup automático, integração com balança nem funcionamento
offline garantido. Excel usa CSV; PDF usa a impressão do navegador.
Dados locais inválidos bloqueiam a entrada e podem ser baixados para recuperação,
sem serem substituídos por um cadastro vazio.
