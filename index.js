import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import { v4 as uuidv4 } from "uuid"; // Import the UUID package
import pg from "pg";

import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));
const saltRounds = 10;
env.config();

// to enable cookies
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// TODO: get rid of this and make sure info comes from database
// let posts = [];
let totalPosts = 0;

// state checker to see if we are editing a post
let isEditing = false;
let post;
let postId;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
// Serve Bootstrap CSS and JS from node_modules
app.use(
  "/css",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/css"))
);
app.use(
  "/js",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist/js"))
);
// authentication
app.use(passport.initialize());
app.use(passport.session());

// Set the views directory and view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// connect to database
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

////////////
// ROUTES //
////////////

///////////////
// HOME PAGE //
///////////////
app.get("/", (req, res) => {
  res.render("index.ejs");
});

///////////
// ABOUT //
///////////
app.get("/about", (req, res) => {
  res.render("about.ejs");
});

///////////////////////////////////////
////////// USER POSTS LOGIC ///////////
///////////////////////////////////////
// send user to create page
app.get("/create", (req, res) => {
  res.render("create.ejs");
});

// creates new post
app.post("/submit", async (req, res) => {
  const { title, body, topic } = req.body;
  const email = req.user.email;
  const date = new Date().toDateString();
  totalPosts++;
  try {
    // TODO: Create a query to insert into postinfo table
    const result = await db.query(
      "INSERT INTO postinfo (email, title, body, topic, date) \
      VALUES ($1, $2, $3, $4, $5)",
      [email, title, body, topic, date]
    );
    res.redirect("/profile");
  } catch (err) {
    console.log(err);
  }

});


// find post by id
app.get("/post/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    const result = await db.query("SELECT * FROM postinfo WHERE id = $1", [postId]);
    const post = result.rows[0];
    if (post) {
      res.render("post.ejs", { post: post });
    } else {
      res.status(404).send("Post not found.");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error.");
  }
});

// edit post by id
// app.get("/edit/:id", (req, res) => {
//   isEditing = true;
//   // get the post id from the req
//   postId = req.params.id;
//   // find the post the user is trying to access from the posts array
//   post = posts.find((p) => p.id === postId);
//   if (post) {
//     res.render("edit.ejs", {
//       post: post,
//       totalPosts: totalPosts,
//       isEditing: isEditing,
//     });
//   } else {
//     res.status(404).send("Post not found.");
//   }
// });
// edit post by id
app.get("/edit/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    const result = await db.query("SELECT * FROM postinfo WHERE id = $1", [postId]);
    const post = result.rows[0];
    if (post) {
      res.render("edit.ejs", {
        post: post,
        isEditing: true,
      });
    } else {
      res.status(404).send("Post not found.");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error.");
  }
});

// updates post
// update post FIXXXXXXXXXXX
app.post("/update", async (req, res) => {
  const { id, title, body, topic } = req.body;
  const date = new Date().toDateString();

  try {
    const result = await db.query(
      "UPDATE postinfo SET title = $1, body = $2, topic = $3, date = $4 WHERE id = $5",
      [title, body, topic, date, id]
    );

    // Check if any rows were updated
    if (result.rowCount === 0) {
      console.log("No rows updated.");
      res.status(404).send("Post not found.");
    } else {
      res.redirect("/profile");
    }
  } catch (err) {
    console.log("Error updating post:", err);
    res.status(500).send("Server error.");
  }
});


// delete post by id
app.post("/delete/:id", async (req, res) => {
  const postId = req.params.id;
  try {
    await db.query("DELETE FROM postinfo WHERE id = $1", [postId]);
    totalPosts--;
    res.redirect("/profile");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error.");
  }
});

/////////////
// PROFILE //
/////////////
app.get("/profile", async (req, res) => {
  console.log("req.user and req.isAuthenticated", req.user, req.isAuthenticated());
  if (req.isAuthenticated()) {
    try {
      // NOTE: posts come from database here
      const posts = await db.query("SELECT * FROM postinfo WHERE email = $1", [
        req.user.email,
      ]);
      console.log("posts.rows: ", posts.rows);
      res.render("profile.ejs", { posts: posts.rows, totalPosts: totalPosts });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

///////////
// LOGIN //
///////////
app.get("/login", (req, res) => {
  console.log("Inside /login get route checking if req.isAuthenticated()", req.isAuthenticated())
  res.render("login.ejs");
});


//////////////////////////////////////////////////////
// PASSPORT MIDDLEWARE AUTHENTICATION CONFIGURATION //
//////////////////////////////////////////////////////
app.get(
  "/auth/google",
  passport.authenticate("google", {
    // gets access to user's google profile and email
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  })
);

// authenticates user login
app.post("/login", 
  passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login",
}));


passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query(
          "SELECT * FROM logincredentials WHERE email = $1",
          [profile.email]
        );
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO logincredentials (email, password) VALUES ($1, $2)",
            [profile.email, "google"] 
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

//////////////////
// START SERVER //
//////////////////
app.listen(port, () => {
  console.log("Blog Web App running on port ", port);
});
