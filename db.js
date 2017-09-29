const MongoClient = require('mongodb').MongoClient;

module.exports = class DB {
  constructor() {
    this.db = null;
    this.admin = null;
  }

  connect() {
    if(this.db === null) {
      return MongoClient.connect(`mongodb://${process.env.MONGODB_URI}`).then(db => {
        this.admin = db.admin();
        this.db = db;

        return Promise.resolve(db);
      });
    } else {
      return Promise.resolve(this.db);
    }
  }

  serverStatus() {
    return this.admin.serverStatus();
  }
}
