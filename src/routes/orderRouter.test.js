const request = require('supertest');
const app = require('../service');


const { Role, DB } = require('../database/database.js');
function randomName() {
    return Math.random().toString(36).substring(2, 9);
  };

async function getUserId(user) {
    const connection = await DB.getConnection()
    try {
    const sql = "SELECT id FROM user WHERE email=?"
    let res = await DB.query(connection, sql, [user.email])
    console.log("***********ID: " + res)
    return res[0].id
    } finally {
        connection.end();
    }
};

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }]  }; //roles: [{ role: Role.Admin }] 
    user.name = "adm" + randomName();
    user.email = user.name + '@admin.com';
    await DB.addUser(user);
    user.password = 'toomanysecrets';
    return user;
  }