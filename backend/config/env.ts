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

  // Midtrans Payment Gateway (sandbox unless MIDTRANS_IS_PRODUCTION=true)
  MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY || "",
  MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY || "",
  MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION === "true",

  // Mailer (Gmail SMTP)
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: Number(process.env.SMTP_PORT) || 465,
  SMTP_SECURE: process.env.SMTP_SECURE !== "false",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "FoodCourt OS <no-reply@amici.food>",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
};
