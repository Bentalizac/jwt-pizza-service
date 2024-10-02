const request = require('supertest');
const app = require('../service');


const { Role, DB } = require('../database/database.js');
const testUser = await createAdminUser()

async function clearDB() {
    const connection = await DB.getConnection()
    //DB.query(connection, "TRUNCATE TABLE * CASCADE")
    DB.query(connection, 'DROP DATABASE pizza')
    DB.initializeDatabase()
}

function randomName() {
    return Math.random().toString(36).substring(2, 6);
  }
async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }]  }; //roles: [{ role: Role.Admin }] 
  user.name = "adm" + randomName();
  user.email = user.name + '@admin.com';
  await DB.addUser(user);
  user.password = 'toomanysecrets';
  return user;
}

beforeAll(async ()=>{
    await clearDB()
    //testUser = await createAdminUser()
})

test('create franchise', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    const authToken = loginRes.body.token;

    const newFranchise = {
      name: 'pizzaPocket',
      admins: [{ email: testUser.email}]
    };
  
    const createFranchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newFranchise);
    
    expect(createFranchiseRes.status).toBe(200);
  
    expect(createFranchiseRes.body).toMatchObject({
      name: 'pizzaPocket',
      admins: [{ email: testUser.email, id: expect.any(Number), name: expect.any(String) }],
      id: expect.any(Number),
    });

    const deleteFranRes = await request(app).delete('/api/franchise/' + createFranchiseRes.body.id)
        .set('Authorization', `Bearer ${authToken}`)
    expect(deleteFranRes.status).toBe(200)
  });
