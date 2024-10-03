const request = require('supertest');
const app = require('../service');


const { Role, DB } = require('../database/database.js');


//async function clearDB() {
//    const connection = await DB.getConnection()
    //DB.query(connection, "TRUNCATE TABLE * CASCADE")
//    DB.query(connection, 'DROP DATABASE pizza')
//    DB.initializeDatabase()
//}

function randomName() {
    return Math.random().toString(36).substring(2, 9);
  };

async function getUserId(user) {
    const connection = await DB.getConnection()
    const sql = "SELECT id FROM user WHERE email=?"
    let res = await DB.query(connection, sql, [user.email])
    return res[0].id
};

async function getFranchiseId(franchiseName) {
    const connection = await DB.getConnection()
    const sql = "SELECT id FROM franchise WHERE name=?"
    let res = await DB.query(connection, sql, [franchiseName])
    return res[0].id
};

async function getStoreId(storeName) {
    const connection = await DB.getConnection()
    const sql = "SELECT id FROM store WHERE name=?"
    let res = await DB.query(connection, sql, [storeName])
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

async function createFranchise(franchiseName, auth, testUser) {
    const newFranchise = {
        name: franchiseName,
        admins: [{ email: testUser.email}]
      };

      const createFranchiseRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${auth}`)
      .send(newFranchise);

    //expect(createFranchiseRes.status).toBe(200);
    return createFranchiseRes
}


test('create franchise', async () => {
    let testUser = await createAdminUser()

    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    const authToken = loginRes.body.token;

    const name = "single franchise test"
    const response = await createFranchise(name, authToken, testUser)
    expect(response.status).toBe(200);
  
    expect(response.body).toMatchObject({
      name: name,
      admins: [{ email: testUser.email, id: expect.any(Number), name: expect.any(String) }],
      id: expect.any(Number),
    });

    const deleteFranRes = await request(app).delete('/api/franchise/' + response.body.id)
        .set('Authorization', `Bearer ${authToken}`)
    expect(deleteFranRes.status).toBe(200)
  });

test("get user's franchises", async ()=> {
    // Setup three franchises owned by the same user
    const testUser = await createAdminUser()

    const names = ['f1', 'f2', 'f3']
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);

    const authToken = loginRes.body.token;    
    const responses = [
        await createFranchise(names[0], authToken, testUser),
        await createFranchise(names[1], authToken, testUser),
        await createFranchise(names[2], authToken, testUser),
    ]
    let userid = await getUserId(testUser)
    console.log(userid)
    expect(responses[0].status).toBe(200)
    expect(responses[1].status).toBe(200)
    expect(responses[2].status).toBe(200)
    
    const url = '/api/franchise/' + userid
    const getUserFranRes = await request(app).get(url)
    .set('Authorization', `Bearer ${authToken}`);

    expect(getUserFranRes.status).toBe(200)

    //Cleanup all three franchises
    const deleteFran1Res = await request(app).delete('/api/franchise/' + responses[0].body.id)
        .set('Authorization', `Bearer ${authToken}`)
        
    const deleteFran2Res = await request(app).delete('/api/franchise/' + responses[1].body.id)
        .set('Authorization', `Bearer ${authToken}`)

    const deleteFran3Res = await request(app).delete('/api/franchise/' + responses[2].body.id)
        .set('Authorization', `Bearer ${authToken}`)
    
    expect(deleteFran1Res.status).toBe(200)
    expect(deleteFran2Res.status).toBe(200)
    expect(deleteFran3Res.status).toBe(200)
});

async function createStore(authToken,testUser, storeName) {
    await createFranchise("storeTest", authToken, testUser)
    const franchiseId = await getFranchiseId("storeTest")
    const url = '/api/franchise/' + franchiseId + "/store"
    const store = {
        "franchiseId" : franchiseId,
        "name" : storeName
    }
    const createStoreRes = await request(app)
        .post(url)
        .send(store)
        .set('Authorization', `Bearer ${authToken}`)
    return createStoreRes
}

test('create store', async ()=> {

    const testUser = await createAdminUser()
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    const authToken = loginRes.body.token; 

    const storeName = "createStoreTest"

    const res = await createStore(authToken, testUser, storeName)
    expect(res.status).toBe(200)

    const franchiseId = await getFranchiseId("storeTest")
    const storeId = getStoreId(storeName)
    const delUrl = '/api/franchise/' + franchiseId + '/store/' + storeId
    const deleteStoreRes = await request(app)
        .delete(delUrl)
        .set('Authorization', `Bearer ${authToken}`)

    expect(deleteStoreRes.status).toBe(200)
})