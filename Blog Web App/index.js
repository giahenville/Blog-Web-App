import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuidv4 } from 'uuid';  // Import the UUID package

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

let posts = [];
let totalPosts = 0;
// state checker to see if we are editing a post
let isEditing = false;
let post;
let postId;
// Middleware
app.use(bodyParser.urlencoded( {extended: true} ));
app.use(express.static("public"));


// Serve Bootstrap CSS and JS from node_modules
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

// Set the views directory and view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Routes
app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/about", (req, res) => {
    res.render("about.ejs");
});

app.get("/create", (req, res) => {
    res.render("create.ejs");
});

app.get("/profile", (req, res) => {
    res.render("profile.ejs", {posts: posts, totalPosts: totalPosts});
});

app.get("/post/:id", (req, res) => {
    // get the post id from the req
    postId = req.params.id;
    // find the post the user is trying to access from the posts array
    post = posts.find(p => p.id === postId);
    if (post) {
        res.render("post.ejs", {post: post});
    } else {
        res.status(404).send("Post not found.");
    }
});

app.get("/edit/:id", (req, res) => {
    isEditing = true; 
    // get the post id from the req
    postId = req.params.id;
    // find the post the user is trying to access from the posts array
    post = posts.find(p => p.id === postId);
    if (post) {
        res.render("edit.ejs", {post: post, totalPosts: totalPosts, isEditing: isEditing});
    } else {
        res.status(404).send("Post not found.");
    }
});

app.post("/submit", (req, res) => {
    const { title, body, image, topic } = req.body;

    const newPost = { id: uuidv4(), title, body, image, topic, date : new Date().toDateString() };
    posts.push(newPost);
    totalPosts++;

    res.redirect("/profile");
});

//Deletes post from posts array
app.post('/delete/:id', (req, res) => {
    postId = req.params.id;
    // remove the deleted item from the posts array
    posts = posts.filter(p => p.id !== postId); 
    // update posts count
    totalPosts --;
    res.redirect("/profile");
});

app.post("/update", (req, res) => {
    const { title, body, image, topic } = req.body;
    
      // Find the index of the post by id
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex !== -1) {
        // Update the properties of the post
        posts[postIndex] = {
            ...posts[postIndex], // Spread the existing post to retain unchanged properties
            title,
            body,
            image,
            topic,
            date: new Date().toDateString() // Update the date
        };
    }
    res.redirect("/profile");
})


// Start server
app.listen(port, () => {
    console.log("Blog Web App running on port ", port);
});

