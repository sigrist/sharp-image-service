# Stage 1: Build dependencies
FROM node:20-alpine AS builder

# Instalar dependências de build necessárias para Sharp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production

# Stage 2: Production image
FROM node:20-alpine

# Instalar curl para health check e fontes para renderização de texto
RUN apk add --no-cache \
    curl \
    fontconfig \
    ttf-dejavu \
    font-noto

WORKDIR /app

# Copiar dependências do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código fonte
COPY server.js ./
COPY package*.json ./

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Variáveis de ambiente
ENV NODE_ENV=production \
    TEMPLATES_DIR=/app/templates \
    PORT=3000

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Comando de inicialização
CMD ["node", "server.js"]
