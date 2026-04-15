const express = require('express');
const cors = require('cors');

const routes = require('./routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api', routes);

// Rota teste
app.get('/', (req, res) => {
    res.json({ message: 'Gym Diary API funcionando ' });
});

module.exports = app;