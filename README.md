# Cultura Palotina

Site responsivo do Departamento de Cultura de Palotina, em HTML, CSS e JavaScript, sem dependências de compilação.

## Desenvolvimento

Na pasta `/workspace/Site-cultura`, execute:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

O conteúdo é estático. Publique `index.html`, `style.css`, `app.js` e a pasta `assets` em uma hospedagem estática com HTTPS.

## Conteúdo

As 27 oficinas foram transcritas do quadro fornecido. A busca ignora acentos e pode ser combinada com os filtros. Os links de consulta abrem o WhatsApp com o nome da oficina. Não há formulário de inscrição nem coleta de dados.

Endereço, telefone e atendimento foram extraídos das imagens fornecidas. O comunicado de 02/02 não indica o ano; vagas e período atual precisam ser confirmados com o departamento. As categorias das oficinas são uma organização editorial para navegação, não uma classificação oficial.

A fonte online é opcional: fontes locais substitutas são usadas quando o Google Fonts não estiver disponível. O PNG fornecido é usado como marca e favicon, sem alterações.
