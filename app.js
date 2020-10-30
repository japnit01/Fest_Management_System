let express = require("express"),
    mongoose = require("mongoose"),
    bodyParser = require("body-parser"),
    nodemon = require("nodemon"),
    bcrypt = require("bcrypt"),
    app = express();

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
mongoose.connect("mongodb://localhost/festdb",{useNewUrlParser: true,useUnifiedTopology:true});

const port = 80;

// Flow of Project (yet to be checked by "JAPNIT PRABHU"🙇‍♂️🙇‍♂️🙇‍♂️)
// 1. Fest Coordinator LOGIN/SIGNUP
// 2. Events upload by Coordinator
// 3. Events scheduler (rules etc.)
// 4. LOGIN/SIGNUP by Visitors
// 5. Events Registration by Visitors.

let festvisitorsSchema = new mongoose.Schema({
    name: String,
    email: String,
    phonevisit: Number, 
    age: Number, 
    collegevisit: String,
    scheduler: String,
    registration: String //dekh lio registration no hai ya kuch aur
});

let festcordSchema = new mongoose.Schema({
    collegecord: String,
    name: String,
    phonecord: Number,
    email: String,
    dept: String
});

let competitionsSchema = new mongoose.Schema({
    type: String,
    name: String,
    imageUpload: String, // may be an image url
    descr: String,
    dateTiming: Date,
    venue: String,
    candidates: Number, //number of candidates
    voting: Boolean,
    Mobile: Number
});

let festSchema = new mongoose.Schema({
    collegeName: String,
    festVisitors: [festvisitorsSchema],
    festCord: [festcordSchema],
    compete: [competitionsSchema]
});

let allCollections = new Map();

function createNewCollection(NameOfCollection) {
    let newfest = mongoose.model(NameOfCollection,festSchema);
    allCollections[NameOfCollection] = newfest; //can be changed
}

let details,logindetails;

app.get("/",(req,res)=> {
    res.render("home");
});

// THE BELOW CODE WILL COME UNDER COORDINATOR CODE
// createNewCollection("MJKPS");
// console.log(allCollections)
// let details = {
//             collegeName: "MJKPS",
//             festCord: {
//                 name: "Japnit",
//                 phonecord: 123
//             }
//         }
// allCollections[allCollections.length-1].create(details,(err,record)=> {
//     if(err)
//         console.log(err);
//     else    
//         console.log(record);
// })

app.get("/competitions",(req,res)=> {
    res.render("competitions");
});

app.post("/competitions",(req,res)=> {
    let collegename = collegename,
        type = req.body.type,
        name = req.body.name,
        imageupload = req.body.imageupload,
        descr = req.body.description,
        datetiming = req.body.datetime,
        venue = req.body.venue,
        candidates = req.body.candidates,
        voting,
        mobile = req.body.mobile;

    if(req.body.voting == "Yes")
        voting = true;
    else    
        voting = false;
    
    details = {
        type: type,
        name: name,
        imageUpload: imageupload,
        descr: descr,
        dateTiming: datetiming,
        venue: venue,
        candidates: candidates,
        voting: voting,
        Mobile: mobile
    };
    
    // add new competition to competitions field in a particular college
    // logindetails are the login details obtained during login by the fest coordinator
    allCollections[logindetails.collegecord]["compete"].create(details,(err,record)=> {
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(record);
        }
    });
});

app.listen(port,()=>{
    console.log("app is listening");
});