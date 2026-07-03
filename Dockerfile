FROM nginx:1.27-alpine

COPY index.html styles.css script.js Gemini_Generated_Image_.png favicon.svg apple-touch-icon.png icon-192.png icon-512.png site.webmanifest robots.txt sitemap.xml /usr/share/nginx/html/
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
