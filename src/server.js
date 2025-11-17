require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Connect to the database before starting the server
connectDB()

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});