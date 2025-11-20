const jwt = require('jsonwebtoken');

const generateToken = (id, email) => {
    return jwt.sign({
        id: id,
        email: email
    }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

module.exports = generateToken;