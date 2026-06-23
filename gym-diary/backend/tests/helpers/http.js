const createMockResponse = () => {
    const response = {
        statusCode: 200,
        body: undefined,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        set(header, value) {
            this.headers[header.toLowerCase()] = value;
            return this;
        }
    };

    return response;
};

const createMockRequest = ({
    headers = {},
    body = {},
    params = {},
    query = {},
    user = null,
    activeProfile = null
} = {}) => ({
    headers,
    body,
    params,
    query,
    user,
    activeProfile,
    get(name) {
        return this.headers[String(name).toLowerCase()];
    }
});

module.exports = {
    createMockRequest,
    createMockResponse
};
