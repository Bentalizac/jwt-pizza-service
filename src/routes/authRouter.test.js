const request = require('supertest');
const app = require('../service');

const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

function randomName() {
    return Math.random().toString(36).substring(2, 9);
  };


async function getUserId(user) {
    const connection = await DB.getConnection()
    const sql = "SELECT id FROM user WHERE email=?"
    let res = await DB.query(connection, sql, [user.email])
    return res[0].id
};

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }]  }; //roles: [{ role: Role.Admin }] 
    user.name = "adm" + randomName();
    user.email = user.name + '@admin.com';
    await DB.addUser(user);
    user.password = 'toomanysecrets';
    return user;
  }
  

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});


test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);

  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  console.log(testUserAuthToken, password)
  expect(loginRes.body.user).toMatchObject(user);

});

test('register', async ()=>{
  let testUse = { name: 'pizza diner', email: Math.random().toString(36).substring(2, 12) + '@test.com' }
  const registerRes = await request(app).post('/api/auth').send(testUse);
  testUserAuthToken = registerRes.body.token;

  expect(registerRes.status).toBe(400)
})


test('update user', async ()=> {

    let user = await createAdminUser()

    const loginRes = await request(app).put('/api/auth').send(user);
    expect(loginRes.status).toBe(200);
    const authToken = loginRes.body.token;

    const userId = await getUserId(user)

    user.email = "updateUsertest@test.com"

    const updateUserRes = await request(app)
    .put('/api/auth/' + userId)
    .set('Authorization', `Bearer ${authToken}`)
    .send(user)

    expect(updateUserRes.status).toBe(200)

    

})