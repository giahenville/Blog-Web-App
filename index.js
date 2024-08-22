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

  res.redirect("/profile");
});

// find post by id
app.get("/post/:id", (req, res) => {
  postId = req.params.id;
  post = posts.find((p) => p.id === postId);
  if (post) {
    res.render("post.ejs", { post: post });
  } else {
    res.status(404).send("Post not found.");
  }
});

// edit post by id
app.get("/edit/:id", (req, res) => {
  isEditing = true;
  // get the post id from the req
  postId = req.params.id;
  // find the post the user is trying to access from the posts array
  post = posts.find((p) => p.id === postId);
  if (post) {
    res.render("edit.ejs", {
      post: post,
      totalPosts: totalPosts,
      isEditing: isEditing,
    });
  } else {
    res.status(404).send("Post not found.");
  }
});

// updates post
app.post("/update", (req, res) => {
  const { title, body, image, topic } = req.body;

  // Find the index of the post by id
  const postIndex = posts.findIndex((p) => p.id === postId);

  if (postIndex !== -1) {
    // Update the properties of the post
    posts[postIndex] = {
      ...posts[postIndex], // Spread the existing post to retain unchanged properties
      title,
      body,
      image,
      topic,
      date: new Date().toDateString(), // Update the date
    };
  }
  res.redirect("/profile");
});

// delete post by id
app.post("/delete/:id", (req, res) => {
  postId = req.params.id;
  // remove the deleted item from the posts array
  posts = posts.filter((p) => p.id !== postId);
  // update posts count
  totalPosts--;
  res.redirect("/profile");
});

/////////////
// PROFILE //
/////////////
app.get("/profile", async (req, res) => {
  console.log(req.user);
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
  res.render("login.ejs");
});

/////////////////////////////////////////////
//////////// REGISTRATION LOGIC ////////////
/////////////////////////////////////////////
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const checkResult = await db.query(
      "SELECT * FROM logincredentials WHERE email = $1",
      [email]
    );
    console.log("checkResult is:", checkResult);
    // checks if user is already registered
    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    }
    // creates new user and adds to database and encrypts password
    else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO  logincredentials (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/profile");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
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
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  })
);

/////////////////////////////
// SETTING UP PASSPORT USE //
/////////////////////////////
passport.use(
  "local",
  new Strategy(async function verify(email, password, cb) {
    try {
      console.log("looking for passwords");
      const result = await db.query(
        "SELECT * FROM logincredentials WHERE email = $1 ",
        [email]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.log("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              console.log("Password is valid!");
              return cb(null, user);
            } else {
              console.log("Password is NOT valid!");
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

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
