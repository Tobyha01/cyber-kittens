const express = require('express');
const app = express();
const { User, Kitten } = require('./db');
const jwt = require("jsonwebtoken")

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error)
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware
app.use(function(request, response, next){
  const header = request.get("Authorization")
  if(!header){
    console.error("Missing Authorization Header")
    response.set("WWW-Authenticate", "Bearer")
    response.sendStatus(401)
    return
  }
  
  const [type, token] = header.split(" ")

  if(type.toLowerCase() !== "bearer" || !token){
    console.error("Invalid token")
    response.sendStatus(401)
    return
  }
  
  try{
    const user = jwt.verify(token, process.env.JWT_SECRET)
    request.user = user
    next()
  }
  catch(error){
    console.error(error)
    response.sendStatus(401)
  }
})
// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id
app.get("/kittens/:id", async function(request, response, next){
  // const {id} = request.params
  try{
    const kitten = await Kitten.findByPk(request.params.id)
    if(!kitten){
      response.sendStatus(404)
    }

    if(kitten.ownerId !== request.user.id){
      response.sendStatus(403)
    }
    else{
      response.send({name: kitten.name, age: kitten.age, color: kitten.color})
    } 
  }
  catch(error){
    next(error)
  }
})
// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color
app.post("/kittens", async function(request, response, next){
  try{
    if(!request.user){
      response.sendStatus(401)
    }
    else{
      const kitten = await Kitten.create({name: request.body.name, age: request.body.age, color: request.body.color, ownerId: request.user.id})
      response.status(201).send({name: kitten.name, age: kitten.age, color: kitten.color})
    }
  }
  catch(error){
    next(error)
  }
})

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id
app.delete("/kittens/:id", async function(request, response, next){
  try{
    const kitten = await Kitten.findByPk(request.params.id)
    if(!kitten){
      response.sendStatus(404)
    }
    if(kitten.ownerId !== request.user.id){
      response.sendStatus(403)
    }
    else{
      await kitten.destroy()
      response.sendStatus(204)
    }
  }
  catch(error){
    next(error)
  }
})

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
