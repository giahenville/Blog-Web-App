import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;


app.use(bodyParser.urlencoded( {extended: true} ));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/nav/about", (req, res) => {
    res.render("nav/about.ejs");
});

app.get("/nav/create", (req, res) => {
    res.render("nav/create.ejs");
});

app.get("/nav/profile", (req, res) => {
    res.render("nav/profile.ejs");
});

app.listen(port, () => {
    console.log("Blog Web App running on port ", port);
});