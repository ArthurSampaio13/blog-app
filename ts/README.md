```shell
npm install

cp .env.sample .env
sudo systemctl start redis

cp .env-sample .env
vi .env

npm run migrate:latest
```

To run in dev mode:

```shell
npm run dev
```

To build for production:

```shell
npm run build
```
