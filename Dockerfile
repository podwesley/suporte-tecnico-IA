FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base AS frontend
RUN npm run build
EXPOSE 8508
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8508"]

FROM base AS backend
EXPOSE 8509
CMD ["npm", "run", "server"]