var express = require("express");
var app = express();
var mongoose = require("mongoose");
var session = require("express-session");
var MongoStore = require("connect-mongo")(session);
var env = require("dotenv");
var bodyParser = require("body-parser");
var fs = require("fs");
var morgan = require("morgan");
var cors = require("cors");
var passport = require("passport");
var passportJWT = require("passport-jwt");
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var serveStatic = require("serve-static");
var User = require("./models/users");
// var APIMiddleware = require("./middleware/ApiKeyMiddleware");
var helmet = require("helmet");
var fileUpload = require("express-fileupload");
var errorHandlers = require("./handlers/errorHandlers");

env.config();

var secretOrKey = process.env.SECRET_KEY || "NOTsoSECRETkey";
var JWTOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secretOrKey
};

const PORT = process.env.PORT || 3000;
var MONGO_URI = process.env.MONGO_URI;

app.use("/assets", express.static(__dirname + "/public"));
app.use("/", express.static("/service-worker.js"));
// app.use("/", express.static(__dirname + "/public"));
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cors());
app.use(helmet());
app.disable("x-powered-by");
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/"
  })
);

passport.use(
  new JwtStrategy(JWTOptions, function(jwt_payload, done) {
    var { id } = jwt_payload;
    User.findOne({ _id: id }, (err, user) => {
      if (err) {
        return done(err, false);
      }
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });
  })
);

app.set("view engine", "pug");
app.set("views", "views");

// Add headers
// app.use(function(req, res, next) {
//   // Website you wish to allow to connect
//   res.setHeader("Access-Control-Allow-Origin", "*");

//   // Request methods you wish to allow
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");

//   // Request headers you wish to allow
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "X-Requested-With,content-type"
//   );

//   // Set to true if you need the website to include cookies in the requests sent
//   // to the API (e.g. in case you use sessions)
//   res.setHeader("Access-Control-Allow-Credentials", true);

//   // Pass to next layer of middleware
//   next();
// });

// app.set("view engine", "ejs");
mongoose
  .connect(
    MONGO_URI,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    function() {
      console.log(`Connection has been made`);
    }
  )
  .catch(function(err) {
    console.log(`App starting error:`, err.stack);
    process.exit(1);
  });
mongoose.set("useFindAndModify", false);

// // TODO: REMOVE THIS ONCE ALL MIGRATED!!
// function updateBios() {
//   Player.find((err, players) => {
//     if (err) {
//       console.error(err);
//       process.exit(1);
//       return;
//     }
//     players.forEach(function(player) {
//       if (!player.bio.get("en")) {
//         let string = "";
//         player.bio.forEach(function(el) {
//           string = string + el;
//         });
//         player.bio = { en: string };
//         player.updateOne(player, (err, player) => {
//           if (err) {
//             console.error(err);
//             return;
//           }
//           return;
//         });
//       }
//       return;
//     });
//   });
// }
// // Uncomment this to update playersBios
// // updateBios();
// // TODO: REMOVE THIS ONCE ALL MIGRATED!!

app.use(
  session({
    secret: process.env.SECRET_KEY,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Autoloads all controllers in directory
fs.readdirSync("controllers/API/").forEach(function(file) {
  if (file.substr(-3) === ".js") {
    const controller = require(`./controllers/API/${file}`);
    if (typeof controller === "function") {
      controller(app);
    }
  }
});
app.use(serveStatic(__dirname + "/dist"));
const web = require("./routes/web");
app.use("/", web);
// app.use(history("index.html", `${__dirname}/dist/`));
// app.all("*", (req, res) => {
//   res.sendFile(`${__dirname}/dist/index.html`);
// });

// app.all("/api/*", APIMiddleware());

app.use(errorHandlers.notFound);

app.use(errorHandlers.flashValidationErrors);
if (app.get("env") === "development") {
  app.use(errorHandlers.developmentErrors);
}

app.search(errorHandlers.productionErrors);

app.listen(PORT, function() {
  console.log(`app listening on http://localhost:${PORT}`);
});
