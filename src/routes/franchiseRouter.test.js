const request = require('supertest');
const app = require('../service');


const { Role, DB } = require('../database/database.js');


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
    testUser = await createAdminUser()
})

test('create franchise', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    const authToken = loginRes.body.token;
  
    // Step 2: Define the franchise payload
    const newFranchise = {
      name: 'pizzaPocket',
      admins: [{ email: testUser.email}]
    };
  
    // Step 3: Send a POST request to create the franchise
    const createFranchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newFranchise);
    
    // Step 4: Check that the response status is 200 OK
    expect(createFranchiseRes.status).toBe(200);
  
    // Step 5: Check the response body to ensure the franchise is created correctly
    expect(createFranchiseRes.body).toMatchObject({
      name: 'pizzaPocket',
      admins: [{ email: testUser.email, id: expect.any(Number), name: expect.any(String) }],
      id: expect.any(Number),
    });

    const deleteFranRes = await request(app).delete('/api/franchise/' + createFranchiseRes.body.id)
        .set('Authorization', `Bearer ${authToken}`)
    expect(deleteFranRes.status).toBe(200)
  });
