const getSslConfig = () => {
    if (process.env.DB_SSL !== 'true') return undefined;

    return {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    };
};

const getDatabaseConfig = (includeDatabase = true) => {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'senac'
    };

    if (includeDatabase) {
        config.database = process.env.DB_NAME || 'gym_diary';
    }

    const ssl = getSslConfig();
    if (ssl) config.ssl = ssl;

    return config;
};

module.exports = { getDatabaseConfig };
