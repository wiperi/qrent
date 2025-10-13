import mysql from 'mysql2/promise';

async function fetchUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'qrent',
  });

  const [rows] = await connection.execute('SELECT * FROM user');
  console.log(rows);

  await connection.end();
}

fetchUsers();
