// Standalone dev-only MongoDB instance (no local MongoDB install required). Binds to the
// fixed port the app's MONGODB_URI expects (127.0.0.1:27117) and keeps running until this
// process is killed, so `node src/server.js` / `node src/seed.js` can connect to it directly.
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27117, dbName: 'rentease' },
  });
  console.log(`Mongo (in-memory) listening at ${mongod.getUri()}`);

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start in-memory MongoDB:', err);
  process.exit(1);
});
