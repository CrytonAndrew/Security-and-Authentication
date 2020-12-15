//jshint esversion:6
require('dotenv').config();

const bodyParser = require('body-parser');
const ejs = require('ejs');

const express = require('express');
const app = express();
const port = 8000;

const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
const encrypt = require('mongoose-encryption');


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});




// Encrytion using mongoose-encrytion
// This will automatically encrypt and decrypt when save() and find() are called
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});


const User = new mongoose.model("User", userSchema);

app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.render("home");
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.get('/register', (req, res) => {
    res.render("register");
});

app.post("/register", function(req, res){
    const userEmail = req.body.username;
    const userPassword = req.body.password;

    const newUser = new User({
        email: userEmail,
        password: userPassword
    });
    newUser.save(function(err){
        if(!err){
            res.render("secrets");
        }
        else {
           console.log("error occured while registering user") 
        }
    });
});

app.post("/login", function(req, res){
    const userEmail = req.body.username;
    const userPassword = req.body.password;

    User.findOne({email: userEmail}, function(err, user){
        if (!err) {
            if (user){
                if (user.password === userPassword){
                    res.render("secrets");
                }
                else {
                    console.log("Error loading secrets wrong password");
                }
            }
        }
        else {
            console.log("Error while finding account");
        }
    })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
