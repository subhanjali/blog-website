//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const multer = require('multer');
let file_name,file_name2,file_name3;
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/upload/');
  },
  filename: function(req, file, cb) {
var c=[],a,b,d,str=file.originalname;
a=str.substring(str.indexOf("."),str.length+1);

    file_name=new Date().toISOString() + req.user._id + a;
  cb(null, file_name);

// if( file_name2==undefined && file_name3==undefined && file_name!=undefined)
// file_name3=file_name;
// if( file_name3!=undefined && file_name2==undefined && file_name!=undefined)
// file_name2=file_name;
    // console.log("====" + file_name + " here in multer storage");

    // if(file_name!=file_name2 && file_name2===file_name3)
    // file_name2=file_name;

  }
});
const upload = multer({storage: storage});

var fs = require('fs');
const cors = require('cors');
var path = require('path');



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  displayname: String,
  about: String,
  secret: [{title: String, content: String,blogImg:  String, blogImg2:  String, blogImg3:  String }],
  profilepic: String
 //  ,
 //  //img
 // img: String
 //    //img

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

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
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log("google profile accessed succesfully \n");

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/me", function(req, res){
  if (req.isAuthenticated()){
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {

          res.render("me", {usersWithSecrets: foundUser});

        }
      }
    });
  } else {
    res.redirect("/login");
  }


});

//imgtest
//imgtest

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});
//img
app.get('/imgtest', (req, res) => {
    User.find({}, (err, items) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred', err);
        }
        else {
            res.render('imgtest', { items: items });
        }
    });
});



app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/lookfor", function(req, res){
  const requestedPostId = req.body.lookfor;

      User.find({ "secret.title": requestedPostId}, function(err, posts){

        res.render("post", {
        posts: posts,
        searched:requestedPostId
        });
      });
});

app.post("/submit",upload.array('blogImg',3), function(req, res){
  const submittedTitle = req.body.stitle;
  const submittedContent = req.body.scontent;
  var submittedImg,submittedImg2,submittedImg3;
  console.log(req.files);

    if(req.files[0]!=undefined){
    submittedImg = req.files[0].filename;}
    if(req.files[1]!=undefined){
    submittedImg2 = req.files[1].filename;}
    if(req.files[2]!=undefined){
    submittedImg3 = req.files[2].filename;}
// console.log("====" + submittedImg+ " here in submit");
//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {

        var friend = { title: submittedTitle, content: submittedContent, blogImg: submittedImg, blogImg2: submittedImg2, blogImg3: submittedImg3};
console.log(friend );
        foundUser.secret.push(friend);
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});


app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.get("/myprofile", function(req, res){

  if (req.isAuthenticated()){
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {

          res.render("myprofile", {usersWithSecrets: foundUser});

        }
      }
    });
  } else {
    res.redirect("/login");
  }


});

app.post("/myprofile",upload.single('profilepic'), function(req,res){
  const displayname = req.body.displayname;
  const about = req.body.about;
  const profilepic = req.file;
  console.log(profilepic);
  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.displayname=displayname;
        foundUser.about=about;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});





app.get("/eachpost/:postId", function(req, res){

const requestedPostId = req.params.postId;

  User.findOne({ "secret._id": requestedPostId}, function(err, posts){
    console.log(posts+"==posts");
    res.render("eachpost", {
      title: posts.title,
      content: posts.content
    });
  });




    // Post.findOne({title: requestedPostId}, function(err, post){
    //   console.log(post);
    //   res.render("post", {
    //     title: post.title,
    //     content: post.content
    //   });
    // });

    // Post.find({title: requestedPostId}, function(err, posts){
    //
    //   res.render("post", {
    //   posts: posts
    //   });
    // });

});






app.listen('3000' || process.env.PORT, function() {
  console.log("Server started on port 3000.");
});
