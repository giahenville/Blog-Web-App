import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

const posts = [];

app.use(bodyParser.urlencoded( {extended: true} ));
app.use(express.static("public"));

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
    res.render("profile.ejs", {posts: posts});
});

app.post("/submit", (req, res) => {
    const title = req.body["title"];
    const body = req.body["body"];
    const image = req.body["image"];
    const topic = req.body["topic"];

    const newPost = { title: title, body: body, image: image, topic: topic };
    posts.push(newPost);

    res.redirect("/profile");
});

app.listen(port, () => {
    console.log("Blog Web App running on port ", port);
});

