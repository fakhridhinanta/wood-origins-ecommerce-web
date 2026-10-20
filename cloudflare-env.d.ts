declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_EMAIL?: string;
    ADMIN_LOGIN_ID?: string;
    ADMIN_LOGIN_PASSWORD?: string;
    BUCKET?: R2Bucket;
  }
}
