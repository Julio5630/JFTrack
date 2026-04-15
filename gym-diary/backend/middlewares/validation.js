// Validação simples (sem lib externa)

const validateRegister = (req, res, next) => {
    const { name, email, password } = req.body;

    if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Nome inválido' });
    }

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Email inválido' });
    }

    if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Senha muito curta' });
    }

    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha obrigatórios' });
    }

    next();
};

module.exports = {
    validateRegister,
    validateLogin
};