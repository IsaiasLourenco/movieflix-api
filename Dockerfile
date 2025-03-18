#Define a ver~so no Node.js
FROM node:20

#Define o diretório de trabalho do container
WORKDIR /app

# Copia o arquivo de dependências pra dentro do container
COPY package.json .

#Instala as dependências
RUN npm install

#Copia o restante dos arquivos pra dentro do container
COPY . .

#Expor a porta 3000 que será a porta usada pela aplicação
EXPOSE 3000

#Define o comando para incializar a aplilcação
CMD ["npm", "start"]