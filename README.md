# Verifica Cidadão

Plataforma de apoio à verificação de informações de interesse público. O produto analisa alegações textuais ou conteúdo de URLs públicas, consulta fontes externas, valida evidências literais e apresenta uma classificação explicável.

O sistema não acusa pessoas ou instituições. Ele descreve apenas o grau de sustentação da informação pelas fontes efetivamente consultadas.

## Estado atual

- Pipeline: `0.3.0`
- Backend: Express + TypeScript
- Frontend: React + Vite
- Verificação por texto e por URL pública
- Proteções para SSRF, autorreferência da URL analisada, contexto temporal e budget global de execução

## Classificações

- `confirmada`
- `parcialmente-confirmada`
- `sem-evidencias`
- `contradita`
- `analise-humana`

## Estrutura

```text
app/       Frontend React/Vite
server/    API Express e pipeline de verificação
docs/      Contexto, auditorias e documentação técnica
```

## Requisitos locais

- Node.js 22 LTS recomendado
- npm
- Chave de um provedor compatível com a API OpenAI

## Execução local

### Backend

```bash
cd server
cp .env.example .env
npm ci
npm run dev
```

A API inicia, por padrão, em `http://localhost:8787`.

### Frontend

Em outro terminal:

```bash
cd app
cp .env.example .env
npm ci
npm run dev
```

O Vite usa proxy local para `/api`. Mantenha `VITE_USE_MOCK_VERIFICATION=false` para consultar o backend real.

## Variáveis de ambiente

As referências de configuração estão em:

- [`server/.env.example`](server/.env.example)
- [`app/.env.example`](app/.env.example)

Nunca versione arquivos `.env` nem chaves de API. Para uso em produção com Brave Search, configure `SEARCH_PROVIDER=brave` e `BRAVE_API_KEY` no backend.

## Testes e builds

```bash
# backend
cd server
npm test
npm run build
npm run test:golden

# frontend
cd ../app
npm test
npm run build
```

Também há baterias externas, que dependem de rede e credenciais configuradas:

```bash
cd server
npm run test:real
npm run test:url:real
```

## API

- `GET /api/health`
- `POST /api/verify`

Exemplo de corpo para texto:

```json
{
  "inputType": "text",
  "input": "O Senado Federal possui 81 senadores."
}
```

Para URL, use `"inputType": "url"` e informe uma URL pública HTTP ou HTTPS. URLs privadas, locais e formatos não suportados são rejeitados.

## Produção

A arquitetura recomendada é Nginx servindo `app/dist` e encaminhando `/api/*` ao backend local em `127.0.0.1:8787`, gerenciado por systemd. Consulte a documentação em [`docs/`](docs/) antes do deploy.

## Documentação

- [Contexto mestre](docs/CONTEXTO_MESTRE_VERIFICA_CIDADAO.md)
- [Auditoria técnica](docs/AUDITORIA_MVP_MANUS_VERIFICA_CIDADAO.md)
