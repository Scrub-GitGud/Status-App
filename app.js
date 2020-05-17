const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');

const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const PORT = process.env.PORT || 5000
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static("public"));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize()); // Setup passport
app.use(passport.session());    // telling passport to also set up session

mongoose.connect('mongodb://localhost:27017/STATUS_APP_DB', {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.set('useCreateIndex', true); // TO AVOID DeprecationWarning

const userSchema = new mongoose.Schema({
    Username: String,
    Password: String
})

userSchema.plugin(passportLocalMongoose);
const UserCollection = new mongoose.model("UserCollection", userSchema)

passport.use(UserCollection.createStrategy());
passport.serializeUser(UserCollection.serializeUser());
passport.deserializeUser(UserCollection.deserializeUser());



let GLOBAL_USERNAME;

//=========================================== [-ROUTE-] ============================================
app.route("/")
.get((req, res)=>{
    if(req.isAuthenticated()){ // IF THE USER ALREADY LOGGED IN THEN RENDER HOME, ELSE RENDER LOGIN
        res.render("home", {name: GLOBAL_USERNAME})
    }else{
        console.log("NEED AUTHENTICATON BEFORE ENTERING HOME");
        res.redirect("/login")
    }
})

app.route("/login")
.get((req, res)=>{
    res.render("login")
})
.post((req, res)=>{
    const userInfo = new UserCollection({
        username: req.body.username,
        password: req.body.password
    })

    req.login(userInfo, function(err) {
    if (err) {
        console.log("XXXXXXXXX " + err);
    }
    else{
        passport.authenticate("local")(req, res, function(){
            
            GLOBAL_USERNAME = req.body.username;
            res.redirect("/")
        })
    }
    });
})

app.route("/register")
.get((req, res)=>{
    res.render("register")
})
.post((req, res)=>{
    UserCollection.register({username: req.body.username, active: false}, req.body.password, function(err, user)
    {
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function () {
                GLOBAL_USERNAME = req.body.username;
                res.redirect("/")
            })
        }
    })
})

app.route("/logout")
.get((req, res)=>
{
    req.logout()
    res.redirect("/login")
});







app.listen(PORT, ()=>{
    console.log("Server running on port: " + PORT);
})