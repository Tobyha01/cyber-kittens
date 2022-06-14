const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'neverTell';
const SALT_COUNT = 10;
const {JWT_SECRET} = process.env;

const app = require('./index');
const { sequelize, Kitten, User } = require('./db');
const seed = require('./db/seedFn');
const {kittens} = require('./db/seedData');


const createTestUser = async (userData) => {
    const hashed = await bcrypt.hash(userData.password, SALT_COUNT);
    user = await User.create({ username: userData.username, password: hashed });
    if(userData.catId) {
        await user.setKitten(userData.catId);
    }
    const {id, username: createdUsername} = user;
    token = jwt.sign({id, username: createdUsername}, JWT_SECRET);
    return {user, token};
}

describe('Endpoints', () => {
    const testKittenData = { username: 'Katy Purry', password: 'iamasinga' };
    const testUserData = { username: 'buster', password: 'bustthis' };
    let user;
    let token;
    let registerResponse;
    let loginResponse;
    
    beforeAll(async () => {
        await sequelize.sync({ force: true }); // recreate db
        await seed();
        registerResponse = await request(app)
            .post('/register')
            .send(testUserData)
            .catch(err => console.error(err));
        loginResponse = await request(app)
            .post('/login')
            .send(testUserData)
            .catch(err => console.error(err));
    });

    describe('GET /', () => {
        it('should return correct html', async () => {
            const registerResponse = await request(app).get('/');
            expect(registerResponse.status).toBe(200);
            expect(registerResponse.text).toBe(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/cats/1">/cats/:id</a></p>
      <p>Create a new cat at <b><code>POST /cats</code></b> and delete one at <b><code>DELETE /cats/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
        });
    });

    describe.skip('login and register', () => {

        describe('POST /register', () => {
            it('should send back success with token', async () => {
                expect(registerResponse.status).toBe(200);
                expect(registerResponse.body).toEqual({
                    message: 'success',
                    token: expect.stringMatching(/^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/)
                });
            });
            it('should create user with username', async () => {
                const foundUser = await User.findOne({ where: { username: 'bobbysmiles' } });
                expect(foundUser).toBeTruthy();
                expect(foundUser.username).toBe('bobbysmiles');
            });
            it('should hash password', async () => {
                const foundUser = await User.findOne({ where: { username: 'bobbysmiles' } });
                expect(foundUser).toBeTruthy();
                expect(foundUser.password).not.toBe(testUserData.password);
                expect(foundUser.password).toEqual(expect.stringMatching(/^\$2[ayb]\$.{56}$/));
            });
        });
    
        describe('POST /login', () => {
            it('should send back success with token', async () => {
                expect(loginResponse.status).toBe(200);
                expect(loginResponse.body).toEqual({
                    message: 'success',
                    token: expect.stringMatching(/^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/)
                });
            });
            it('if password incorrect, should send back 401 unauthorized, with message', async () => {
                const incorrectLoginResponse = await request(app)
                    .post('/login')
                    .send({
                        username: 'bobbysmiles',
                        password: 'notright'
                    })
                    .catch(err => console.error(err));
                expect(incorrectLoginResponse.status).toBe(401);
                expect(incorrectLoginResponse.text).toBe('Unauthorized');
            });
        });
    });

    describe('/cats endpoints', () => {
        beforeEach(async () => {
            await sequelize.sync({ force: true }); // recreate db
            ({token, user} = await createTestUser({...testUserData, catId: testKittenData.id}));
        });
        describe('GET /cats/:id', () => {
            it('should return a single cat', async () => {
                const response = await request(app)
                    .get('/cats/1')
                    .set('Authorization', `Bearer ${token}`);
                expect(response.status).toBe(200);
                expect(response.body).toEqual(kittens[0]);
            });
        });
    });
        


});
