const app = require('./app');
const db = require('./db/connection');

const port = process.env.PORT || 4000;

db.migrate.latest().then(() => {
  app.listen(port, () => {
    console.log(`IMC backend listening on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
