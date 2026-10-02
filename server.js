const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Отдаем файл index.html, когда кто-то заходит на сайт
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const clients = new Set();
wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('message', (message) => {
        for (let client of clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        }
    });
    ws.on('close', () => clients.delete(ws));
});

// Запускаем всё на порту 8080
server.listen(8080, () => {
    console.log('Игра и сервер запущены на порту 8080!');
});
