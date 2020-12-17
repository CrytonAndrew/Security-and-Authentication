//jshint esversion:6
require('dotenv').config();

const bodyParser = require('body-parser');
const ejs = require('ejs');

const express = require('express');
const app = express();
const port = 8000;

const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const { use, Passport } = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

// Setting up the session
app.use(session({
    secret: process.env.GOOGLE_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize()); //Starting passport
app.use(passport.session()); //Telling the app to use passport for sessions

mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose); // Using passport local mongoose
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// Passport serializaing and deserializing
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK,
  userProfileURL: process.env.USER_PROFILE_URL
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
} 
));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/auth/google", 
  passport.authenticate("google", {scope: ["profile"]})
  );

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", function(req, res){
  // Check if a user has a secret 
  // We are populating the home page with any secret any user has ever submitted
  User.find({"secret": {$ne: null}}, function(err, foundUser){
    if(!err){
      if(foundUser){
        res.render("secrets", {usersWithSecrets: foundUser});
      }
    }
    else {
      console.log(err);
    }
  })
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  }
  else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});


app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (!err){
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
    else {
      console.log(err);
      res.redirect('/register');
    }
  })
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    passport: req.body.password
  });

  req.login(user, function(err){
    if (!err){
      // Create a cookie that is used for authentication 
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
    else {
      console.log(err);
      res.redirect("/login");
    }
  })
});

app.post("/submit", function(req, res){
  const postSecret = req.body.secret;

  User.findById(req.user.id, function(err, foundUser){
    if(!err){
      foundUser.secret = postSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      })
    }
    else {
      console.log(err);
    }
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
