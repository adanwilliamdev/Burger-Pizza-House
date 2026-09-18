# Rebuild do CSS (opcional)

O CSS já compilado está em `../static/css/app.css` — não é necessário
rodar nada para usar o projeto. Isso aqui só é necessário se você for
customizar cores/estilos do `input.css` ou `tailwind.config.js`.

```bash
cd tailwind_build
npm install
npx tailwindcss -i input.css -o ../static/css/app.css --minify
```
