FROM node:18 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i @rollup/rollup-linux-x64-gnu@4.6.1

RUN npm install
COPY . .

RUN npm run build


FROM nginx:latest

COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
