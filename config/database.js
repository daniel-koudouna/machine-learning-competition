// module exports the database for storing the user data
module.exports = {
    host: process.env.DB_HOST || "localhost",
    user: "root",
    password: process.env.DB_PASSWORD || "learning",
    connectionLimit: 5,
    database: "competition",
    port: process.env.DB_PORT || 3306
}
