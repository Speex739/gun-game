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
    // 1. Создаем уникальный ID для каждого подключившегося игрока
    ws.id = Math.random().toString(36).substring(2, 9);
    clients.add(ws);
    console.log(`Игрок подключился (ID: ${ws.id}). Всего игроков: ${clients.size}`);

    // Отправляем игроку его собственный ID при подключении
    ws.send(JSON.stringify({ type: 'SYSTEM_INIT', myId: ws.id }));

    // 2. Новый объединенный обработчик сообщений
    ws.on('message', (message) => {
        try {
            // Пробуем прочитать сообщение как JSON объект
            const data = JSON.parse(message.toString());

            // --- ЛОГИКА ГОЛОСОВОГО ЧАТА ---
            
            // Если игрок готов к голосу, сообщаем всем остальным его ID
            if (data.type === 'VOICE_READY') {
                for (let client of clients) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'VOICE_READY', id: ws.id }));
                    }
                }
                return; // Выходим, чтобы код ниже не дублировал отправку
            }

            // Пересылка приватных сигналов WebRTC конкретному игроку (target)
            if (['OFFER', 'ANSWER', 'CANDIDATE'].includes(data.type)) {
                for (let client of clients) {
                    if (client.id === data.target && client.readyState === WebSocket.OPEN) {
                        data.sender = ws.id; // Дописываем, кто автор звука
                        client.send(JSON.stringify(data));
                    }
                }
                return; // Выходим
            }

            // --- ЛОГИКА ИГРЫ (Обычные действия: MOVE, SHOOT и т.д.) ---
            // Если это не голосовой чат, просто рассылаем пакет всем остальным
            for (let client of clients) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            }

        } catch (err) {
            // Если пришел не JSON (например, простая строка), просто рассылаем всем как раньше
            for (let client of clients) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            }
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log(`Игрок ${ws.id} отключился. Осталось: ${clients.size}`);
    });
});

// Запускаем всё на динамическом порту для облака Render или 8080 для ПК
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Игра и сервер успешно запущены на порту ${PORT}!`);
});
