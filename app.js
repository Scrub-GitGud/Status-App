//Atlas Database user : sad | password : sad
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

// mongoose.connect('mongodb://localhost:27017/STATUS_APP_DB', {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.connect('mongodb+srv://admin-sinn:maxpayne@cluster0-sveyr.mongodb.net/xStatusDB', {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.set('useCreateIndex', true); // TO AVOID DeprecationWarning



const notificationSchema = {
    notification_from: String,
    notification_type: String
}
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    notifications: [notificationSchema]
})
const commentSchema = {
    commenter: String,
    comment: String,
    commentLikers: [String]
}
const postSchema = {
    post_creator: String,
    post_content: String,
    liker: [String],
    Comments: [commentSchema]
}
const discussionSchema = {
    discussion_title: String,
    details: String,
    Posts: [postSchema],
}


userSchema.plugin(passportLocalMongoose);

const notificationCollection = new mongoose.model("notificationCollection", notificationSchema)
const UserCollection = new mongoose.model("UserCollection", userSchema)
const commentCollection = new mongoose.model("commentCollection", commentSchema)
const postCollection = new mongoose.model("postCollection", postSchema)
const discussionCollection = new mongoose.model("discussionCollection", discussionSchema)

passport.use(UserCollection.createStrategy());
passport.serializeUser(UserCollection.serializeUser());
passport.deserializeUser(UserCollection.deserializeUser());




//=========================================== [-ROUTE-] ============================================
app.route("/")
.get((req, res)=>{
    if(req.isAuthenticated()){ // IF THE USER ALREADY LOGGED IN THEN RENDER HOME, ELSE RENDER LOGIN
        discussionCollection.find({}, (err, results)=>{
            if(err) console.log(err);
            res.render("home", {
                myProfileName: req.user.username,
                allDiscussions: results,
                showHamburger: false})
        })
    }else{
        res.redirect("/login")
    }
})

app.route("/login")
.get((req, res)=>{
    res.render("cover")
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
            res.redirect("/")
        })
    }
    });
})

app.route("/register")
.get((req, res)=>{
    res.render("cover")
})
.post((req, res)=>{
    UserCollection.register({username: req.body.username, active: false}, req.body.password, function(err, user)
    {
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function () {
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




// ============================================== Create Discussion ==================================
app.post("/newDiscussion", (req, res)=>
{
    const newTitle = req.body.newDiscussionTitle
    const newDetail = req.body.newDiscussionDetail

      
    let newDiscussion = new discussionCollection({
        discussion_title: newTitle,
        details: newDetail
    })

    newDiscussion.save();

    res.redirect("/")
})

app.get("/:postpageID", (req, res)=>{
    const requestedDiscussion = req.params.postpageID
    // const requestedDiscussion_lodash = _.lowerCase(requestedDiscussion);


    
    
    if(req.isAuthenticated()){

        let allNotificationAry = [];

        UserCollection.findById(req.user.id, function(err, result) {
            allNotificationAry = [...result.notifications]
        });

        discussionCollection.findOne({discussion_title : requestedDiscussion}, (err, result)=>{
            res.render("postpage" , {
                    DiscussionTitle: result.discussion_title,
                    DiscussionDetail: result.details,
                    allPost:result.Posts,
                    myProfileName: req.user.username,
                    allNotification: allNotificationAry,
                    showHamburger: true
                })
        })
    }else{
        res.redirect("/login")
    }
})




// ============================================== Create Post ==================================
app.post("/create_new_post", (req, res)=>{
    
    const title_fromPostBtn = req.body.postBtn
    const new_post_content = req.body.post_textarea
    
    const newPost = new postCollection({
        post_creator: req.user.username,
        post_content: new_post_content
    })

    if(new_post_content === ""){
        res.redirect("back")
        return
    }

    if(req.isAuthenticated()){
        discussionCollection.findOne({discussion_title: title_fromPostBtn}, (err, result)=>{
            if(!err){
                result.Posts.push(newPost)
                result.save()
                res.redirect("back")
            }
        })
    }
})


// ============================================== Add Comment ==================================

app.post("/add_comment", (req, res)=>{
    const discussionName = req.body.hiddenInp_discussionName;
    const comments_postID = req.body.hiddenInp_postID;
    const comments_content = req.body.comment_input;
    const ME = req.user.username

    const newComment = new commentCollection({
        commenter: ME,
        comment: comments_content
    })

    discussionCollection.findOne({discussion_title: discussionName}, (err, result)=>{
        if(!err){
            result.Posts.forEach(i_post => {
                if(i_post.id === comments_postID){
                    i_post.Comments.push(newComment)
                    result.save()

                    postCommentNotify(i_post, ME);
                }
            });
        }
        res.redirect("back")
    })
})




// ============================================== Post Like ==================================

app.post("/likePost", (req, res)=>{
    const discussionName = req.body.hiddenInp_discussionName;
    const postID = req.body.hiddenInp_postID
    const ME = req.user.username

    discussionCollection.findOne({discussion_title: discussionName}, (err, result)=>{
        if(!err){
            result.Posts.forEach(i_post => {
                if(i_post.id === postID){
                    if(!i_post.liker.includes(ME)){
                        i_post.liker.push(ME)
                        result.save()

                        postLikeNotify(i_post, ME);
                    }
                    else{
                        console.log("Already Liked");
                    }
                }
            });
        }
        res.redirect("back")
    })
})




// ============================================== Comment Like ==================================

app.post("/likeComment", (req, res)=>{
    const discussionName = req.body.hiddenInp_discussionName;
    const postID = req.body.hiddenInp_postID
    const commentID = req.body.hiddenInp_commentsID
    const ME = req.user.username

    discussionCollection.findOne({discussion_title: discussionName}, (err, result)=>{
        if(!err){
            result.Posts.forEach(i_post => {
                if(i_post.id === postID){
                    i_post.Comments.forEach(i_comment =>{
                        if(i_comment.id === commentID){
                            if(!i_comment.commentLikers.includes(ME)){
                                i_comment.commentLikers.push(ME)
                                result.save()

                                commentLikeNotify(i_comment, ME);
                            }
                        }
                    })
                }
            });
        }
        res.redirect("back")
    })
})






// ============================================== Post Comment Notification ==================================

function postCommentNotify(i_post, ME) {
    const postOwner = i_post.post_creator;
    const newNotification = new notificationCollection({
        notification_from: ME,
        notification_type: "has commented your post. (" + i_post.post_content.slice(0, 20) + "...)"
    });
    UserCollection.findOne({ username: postOwner }, (err2, result2) => {
        if (!err2) {
            result2.notifications.push(newNotification);
            result2.save();
        }
    });
}

// ============================================== Post Like Notification ==================================
function postLikeNotify(i_post, ME) {
    const postOwner = i_post.post_creator;
    const newNotification = new notificationCollection({
        notification_from: ME,
        notification_type: "has liked your post.  (" + i_post.post_content.slice(0, 20) + "...)"
    });
    UserCollection.findOne({ username: postOwner }, (err2, result2) => {
        if (!err2) {
            result2.notifications.push(newNotification);
            result2.save();
        }
    });
}

// ============================================== Comment Like Notification ==================================

function commentLikeNotify(i_comment, ME) {
    const commentOwner = i_comment.commenter;
    const newNotification = new notificationCollection({
        notification_from: ME,
        notification_type: "has liked your comment. (" + i_comment.comment.slice(0, 20) + "..."
    });
    UserCollection.findOne({ username: commentOwner }, (err2, result2) => {
        if (!err2) {
            result2.notifications.push(newNotification);
            result2.save();
        }
    });
}








app.listen(PORT, ()=>{
    console.log("Server running on port: " + PORT);
})

