# Como rodar o projeto

```shell
npm install

sudo systemctl start redis

cp .env-sample .env
vi .env

npm run migrate:latest
```

dev:

```shell
npm run dev
```

production:

```shell
npm run build
```