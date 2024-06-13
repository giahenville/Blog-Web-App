import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;


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
    res.render("profile.ejs");
});

app.listen(port, () => {
    console.log("Blog Web App running on port ", port);
});