import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";


const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

const posts = [];
let totalPosts = 0;
 
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
    let postDate = new Date().toDateString();
    res.render("profile.ejs", {posts: posts, totalPosts: totalPosts, postDate: postDate});
});

app.post("/submit", (req, res) => {
    const { title, body, image, topic } = req.body;

    const newPost = { title, body, image, topic, date : new Date().toDateString() };
    posts.push(newPost);
    totalPosts++;

    res.redirect("/profile");
});

// Start server
app.listen(port, () => {
    console.log("Blog Web App running on port ", port);
});

