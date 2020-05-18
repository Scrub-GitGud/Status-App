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
    username: String,
    password: String
})
const postSchema = {
    post_creator: String,
    post_content: String,
    liker: String,
    comment: String,
    commenter: String
}
const discussionSchema = {
    discussion_title: String,
    details: String,
    Posts: [postSchema],
}


userSchema.plugin(passportLocalMongoose);

const UserCollection = new mongoose.model("UserCollection", userSchema)
const postCollection = new mongoose.model("postCollection", postSchema)
const discussionCollection = new mongoose.model("discussionCollection", discussionSchema)

passport.use(UserCollection.createStrategy());
passport.serializeUser(UserCollection.serializeUser());
passport.deserializeUser(UserCollection.deserializeUser());



let GLOBAL_USERNAME;

//=========================================== [-ROUTE-] ============================================
app.route("/")
.get((req, res)=>{
    if(req.isAuthenticated()){ // IF THE USER ALREADY LOGGED IN THEN RENDER HOME, ELSE RENDER LOGIN
        // res.render("home", {name: GLOBAL_USERNAME})
        discussionCollection.find({}, (err, results)=>{
            if(err) console.log(err);
            res.render("home", {name: GLOBAL_USERNAME, allDiscussions: results})
        })
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
// ============================================== Authentication ==================================

    


// ============================================== Discussion ==================================
app.post("/newDiscussion", (req, res)=>
{
    const newTitle = req.body.newDiscussionTitle
    const newDetail = req.body.newDiscussionDetail
    console.log("===> " + newTitle);
    console.log("===> " + newDetail);

      
    let newDiscussion = new discussionCollection({
        discussion_title: newTitle,
        details: newDetail
    })

    newDiscussion.save();

    res.redirect("/")
})

app.get("/discussion/:discussionID", (req, res)=>{
    const requestedDiscussion = req.params.discussionID
    // const requestedDiscussion_lodash = _.lowerCase(requestedDiscussion);

    console.log("requestedDiscussion    => " + requestedDiscussion);
    // console.log("lodashed version => " + requestedDiscussion_lodash);
    
    discussionCollection.findOne({discussion_title : requestedDiscussion}, (err, result)=>{
      res.render("discussion" , {DiscussionTitle: result.discussion_title, DiscussionDetail: result.details})
    })
  
    // postAry.forEach(i => {
    //   if(_.lowerCase(i.title) === requestedPost){
    //     res.render("post", {XpostTitle: i.title, XpostContent: i.content})
    //   }
    // });
  })












app.listen(PORT, ()=>{
    console.log("Server running on port: " + PORT);
})