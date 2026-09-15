export const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // MySQL Database Configuration
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_NAME: process.env.DB_NAME || "food_court",

  // JWT Secret
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "super_secret_food_court_jwt_key_change_me_in_production",
};
