FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm install
RUN npm install --prefix backend
RUN npm install --prefix frontend --legacy-peer-deps

COPY . .

RUN npm run build --prefix frontend

ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "backend/server.js"]
