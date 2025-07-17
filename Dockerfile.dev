FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
COPY . .

RUN npx prisma generate

EXPOSE 3000

# The command is now in docker-compose.yml
CMD ["npm", "run", "start:dev"]