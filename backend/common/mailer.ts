import nodemailer from "nodemailer";

export interface SendActivationEmailOptions {
  to: string;
  ownerName: string;
  tenantName: string;
  stallNumber: string;
  foodCourtName?: string;
  activationToken: string;
}

class MailerService {
  private transporter: nodemailer.Transporter | null = null;
  private lastUser: string | null = null;
  private lastPass: string | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.replace(/\s+/g, ""); // Strip any spaces from Google App Password

    if (!user || !pass) {
      return null;
    }

    // Reuse transporter if credentials haven't changed
    if (this.transporter && this.lastUser === user && this.lastPass === pass) {
      return this.transporter;
    }

    this.lastUser = user;
    this.lastPass = pass;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465", 10),
      secure: process.env.SMTP_SECURE !== "false", // true for 465, false for 587
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  async sendActivationEmail(opts: SendActivationEmailOptions): Promise<boolean> {
    const frontendBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const activationUrl = `${frontendBaseUrl}/activate-account?token=${encodeURIComponent(opts.activationToken)}`;
    const fcName = opts.foodCourtName || "Sentra Food Court";

    const transporter = this.getTransporter();

    // Fallback: If in test environment or SMTP credentials not provided in .env, log to console
    if (process.env.NODE_ENV === "test" || !transporter) {
      console.log("\n=======================================================");
      console.log("[DEV/TEST MAILER] Gmail SMTP call bypassed. Gunakan tautan berikut:");
      console.log(`Kepada         : ${opts.ownerName} <${opts.to}>`);
      console.log(`Gerai / Stan   : ${opts.tenantName} (Nomor: ${opts.stallNumber})`);
      console.log(`Food Court     : ${fcName}`);
      console.log(`Masa Berlaku   : 7 Hari`);
      console.log(`Link Aktivasi  : ${activationUrl}`);
      console.log("=======================================================\n");
      return true;
    }

    const smtpUser = process.env.SMTP_USER?.trim() || "";
    // Gmail SMTP requires sender address to match the authenticated Gmail account
    const sender = process.env.MAIL_FROM?.includes(smtpUser)
      ? process.env.MAIL_FROM
      : `"FoodCourt OS" <${smtpUser}>`;

    const mailOptions = {
      from: sender,
      to: opts.to,
      subject: `Aktivasi Akun Pemilik Gerai: ${opts.tenantName} - FoodCourt OS`,
      html: `
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 24px; color: #0a0a0a; }
              .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e5e5; padding: 32px 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
              .badge { display: inline-block; background: #0a0a0a; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
              h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #0a0a0a; letter-spacing: -0.02em; }
              p { font-size: 14px; line-height: 1.6; color: #525252; margin: 0 0 16px; }
              .card { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; margin: 20px 0; }
              .card-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
              .card-row:last-child { margin-bottom: 0; }
              .card-label { color: #737373; font-weight: 500; }
              .card-value { color: #0a0a0a; font-weight: 700; }
              .btn-wrapper { text-align: center; margin: 28px 0; }
              .btn { display: inline-block; background: #0a0a0a; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
              .footer { font-size: 11px; color: #a3a3a3; text-align: center; margin-top: 24px; border-top: 1px solid #f0f0f0; pt: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <span class="badge">FoodCourt OS</span>
              <h1>Selamat Bergabung, ${opts.ownerName}!</h1>
              <p>Stan kuliner Anda telah resmi didaftarkan di sistem manajemen food court. Untuk mulai mengelola daftar menu, pesanan, dan operasional kios, silakan aktifkan akun Anda dan buat kata sandi.</p>
              
              <div class="card">
                <div class="card-row">
                  <span class="card-label">Nama Gerai:</span>
                  <span class="card-value">${opts.tenantName}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">Nomor Stan:</span>
                  <span class="card-value">${opts.stallNumber}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">Lokasi:</span>
                  <span class="card-value">${fcName}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">Email Pemilik:</span>
                  <span class="card-value">${opts.to}</span>
                </div>
              </div>

              <div class="btn-wrapper">
                <a href="${activationUrl}" class="btn">Aktifkan Akun & Buat Kata Sandi</a>
              </div>

              <p style="font-size: 12px; color: #737373;">
                <em>Tautan ini hanya berlaku selama <strong>7 hari</strong>. Jika Anda tidak merasa didaftarkan sebagai pemilik stan, abaikan email ini.</em>
              </p>

              <div class="footer">
                &copy; ${new Date().getFullYear()} FoodCourt OS. Platform Sentra Kuliner Modern Multi-Tenant.
              </div>
            </div>
          </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[MAILER] Activation email sent successfully to ${opts.to}`);
      return true;
    } catch (err) {
      console.error(`[MAILER ERROR] Failed to send email to ${opts.to}:`, err);
      return false;
    }
  }
}

export const mailerService = new MailerService();
