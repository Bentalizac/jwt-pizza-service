const request = require('supertest');
const app = require('../service');


const { Role, DB } = require('../database/database.js');

function randomName() {
    return Math.random().toString(36).substring(2, 12);
};

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


async function getMenuId(title) {
    const connection = await DB.getConnection()
    const sql = "SELECT id FROM menu WHERE title=?"
    let res = await DB.query(connection, sql, [title])
    return res[0].id
};


async function removeItem(itemName) {
    const connection = await DB.getConnection()
    const sql = "DELETE FROM menu WHERE title =?"
    await DB.query(connection, sql, [itemName])
}



async function setupStore(authToken, testUser) {
    await createFranchise("orderTest", authToken, testUser)
    const franchiseId = await getFranchiseId("orderTest")
    const url = '/api/franchise/' + franchiseId + "/store"
    const store = {
        "franchiseId" : franchiseId,
        "name" : "orderTest"
    }
    await request(app)
        .post(url)
        .send(store)
        .set('Authorization', `Bearer ${authToken}`)
    return [await getFranchiseId("orderTest"), await getStoreId("orderTest")]
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }]  };
    user.name = "adm" + randomName();
    user.email = user.name + '@admin.com';
    await DB.addUser(user);
    user.password = 'toomanysecrets';
    return user;
};

test('add menu item', async ()=> {
    const testUser = await createAdminUser()
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    const authToken = loginRes.body.token; 

    const newItem = { 
        "title":"Testing", 
        "description": "Solid gold crust, with gold leaf",
        "image":"pizza9.png", 
        "price": 1.000 
    }

    const addItemRes = await request(app)
        .put('/api/order/menu')
        .send(newItem)
        .set('Authorization', `Bearer ${authToken}`)

    expect(addItemRes.status).toBe(200)
    await removeItem(newItem.title)
});



test('create order', async ()=> {

    const testUser = await createAdminUser()
    const loginRes = await request(app).put('/api/auth').send(testUser);
    expect(loginRes.status).toBe(200);
    const authToken = loginRes.body.token;

    const newItem = { 
        "title":"Testing", 
        "description": "Solid gold crust, with gold leaf",
        "image":"pizza9.png", 
        "price": 1.000 
    }

    const addItemRes = await request(app)
        .put('/api/order/menu')
        .send(newItem)
        .set('Authorization', `Bearer ${authToken}`)

    expect(addItemRes.status).toBe(200)

    const IDs = await setupStore(authToken, testUser)
    const franID = IDs[0]
    const storeID = IDs[1]
    const order = {
        "franchiseId": franID, 
        "storeId":storeID, 
        "items":
            [{
                "menuId":await getMenuId("Testing"), 
                "description": "Solid gold crust, with gold leaf",
                "price": 1.000  
            }]
    }

    const orderRes = await request(app)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send(order)

    expect(orderRes.status).toBe(200)

})