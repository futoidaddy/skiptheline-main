const Pool = require("pg").Pool;
var pool; //change to const in prod
var LOCAL_DEV_FLAG = true;
if (LOCAL_DEV_FLAG){
  pool = new Pool ({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'skiptheline',
    port: 5432
  });
}
else{ 
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
}

module.exports = pool;
