const fs = require('node:fs');
const ftp = require('basic-ftp');
const env = {};
for (const line of fs.readFileSync('.env.deploy', 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}
(async () => {
  const client = new ftp.Client(30_000);
  try {
    await client.access({ host: env.DEPLOY_FTP_HOST, user: env.DEPLOY_FTP_USER, password: env.DEPLOY_FTP_PASS, secure: env.DEPLOY_FTP_SECURE !== 'false', secureOptions: { rejectUnauthorized: false } });
    await client.uploadFrom(process.argv[2], '/app.mailmyra.com/apps/web/web.config');
    console.log('yuklendi:', process.argv[2]);
  } catch (e) { console.error('FTP hatasi:', e.message); process.exitCode = 1; }
  finally { client.close(); }
})();
