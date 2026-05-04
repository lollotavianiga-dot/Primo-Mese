import express from 'express';
import http from 'http';

const app = express();
app.get('/test', (req, res) => {
    res.json();
});
app.get('/test2', (req, res) => {
    let un;
    res.json(un);
});

const server = app.listen(3001, () => {
    http.get('http://localhost:3001/test', res => {
        let chunk = '';
        res.on('data', c => chunk+=c);
        res.on('end', () => console.log('test 1 body length:', chunk.length, 'content:', chunk));
        
        http.get('http://localhost:3001/test2', res2 => {
            let chunk2 = '';
            res2.on('data', c => chunk2+=c);
            res2.on('end', () => {
                console.log('test 2 body length:', chunk2.length, 'content:', chunk2);
                server.close();
            });
        });
    });
});
