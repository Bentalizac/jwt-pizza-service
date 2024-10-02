const request = require('supertest');
const app = require('../service');

const { DB } = require('../database/database.js');
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

//async function clearDB() {
//    const connection = await DB.getConnection()
    //DB.query(connection, "TRUNCATE TABLE * CASCADE")
//    DB.query(connection, 'DROP DATABASE pizza')
//    DB.initializeDatabase()
//}


beforeAll(async () => {

  //clearDB()

  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});


test('login', async () => {
    console.log(testUser)
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);

  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  console.log(testUserAuthToken, password)
  expect(loginRes.body.user).toMatchObject(user);

});

