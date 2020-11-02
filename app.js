let express = require("express"),
    mongoose = require("mongoose"),
    bodyParser = require("body-parser"),
    nodemon = require("nodemon"),
    bcrypt = require("bcrypt"),
    session = require("express-session"),
    app = express();

const port = 80;

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:"yes its secret"}));

mongoose.connect("mongodb://localhost/festdb",{useNewUrlParser: true,useUnifiedTopology:true});

let festSchema = new mongoose.Schema({
   college:String,
   festname:String,
   type:String
});

let userSchema = new mongoose.Schema({
    email:String,
    password:String,
    username:String, 
    age: Number, 
    college: String,
    scheduler: Array,
    registration: Array
});

let fests = mongoose.model("fests",festSchema);
let users = mongoose.model("users",userSchema); 

const requireLogin = (req,res,next)=>{
    if(!req.session.user_id)
    {
        return res.redirect("/login");
    }
    next();
};

// users.create({
//     email:"japnit2012@gmail.com",
//     password:"kaamkar",
//     username:"jap_01"
//     },(err,fest)=>{
//        if(err)
//           console.log(err);
//        else
//           console.log(fest);   
//     });



// fests.create({
//     college:"Dtu",
//     festname:"Engifest",
//     type:"Cultural"
//     },(err,fest)=>{
//        if(err)
//           console.log(err);
//        else
//           console.log(fest);   
//     });

app.get("/",function(req,res){
    res.render("home");
});

app.get("/signup",function(req,res){
    res.render("Sign_up")
});

app.post("/signup",async function(req,res){
      const {email,password,username} = req.body;
      const hash = await bcrypt.hash(password,12)
      const userdetails = new users({
          email,
          password:hash,
          username
      });
      req.session.user_id = userdetails._id;
      await userdetails.save()
      console.log("Account Created");
      res.redirect("/");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.post("/login",async function(req,res){
    const {email,password} = req.body;
    const user = await users.findOne({email:email});
    const valid = await bcrypt.compare(password,user.password);
    if(valid)
    {
        req.session.user_id = user._id;
        console.log("Succesfull Login");
        res.redirect("/")
    }
    else{
        console.log("Try Again")
        res.redirect("/login")
    }
});

app.post("/logout",(req,res)=>{
           console.log("session ended");
       req.session.user_id=null;
           req.session.destroy();

});

app.get("/cordhome",requireLogin,(req,res)=>{
    fests.find({},function(err,fests){
        if(err)
           console.log(err);
        else
           res.render("cordhome",{fests:fests});         
        });
});

app.post("/newfest",function(req,res){
     var college = req.body.collegename;
     var festname = req.body.festname;
     var type = req.body.type;
     var details = {college:college,
                    festname:festname,
                    type:type};
     
     fests.create(details,(err,fest)=>{
         if(err)
           console.log(err);
         else
           console.log("Created new fest");  
     });
     res.redirect("cordhome");
});

app.get("/cordhome/:fest",(req,res)=>{
      const {fest}= req.params;
      res.render("festpage",{fest:fest})    
});

app.post("/cordhome/:fest",(req,res)=>{
      res.send("hogaya");
});


app.get("/visitorhome",function(req,res){
    res.render("visitorhome");
});


app.listen(port,()=>{
    console.log("app is listening");
});