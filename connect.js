const {Pool} = require("pg");
const Redis = require("ioredis");

const db = new Pool ({
    user: "postgres",
    host : "localhost",
    database: "database_kamu",
    password: "password_kamu",
    port: 5432,
});

const Redis = new Redis();
module.exports = {db, Redis};