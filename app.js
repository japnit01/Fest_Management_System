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

let competitionsSchema = new mongoose.Schema({
    type: String,
    name: String,
    imageUpload: String, // may be an image url
    descr: String,
    date: Date,
    time: Date,
    venue: String,
    candidates: Number, //number of candidates
    voting: String,
    Mobile: Number
});

let festSchema = new mongoose.Schema({
   college:String,
   festname:String,
   type:String,
   competitions: [competitionsSchema]
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
        res.redirect("/login");
    }
});

app.post("/logout",(req,res)=>{
           console.log("session ended");
        req.session.user_id=null;
           req.session.destroy();
           res.redirect("/");

});

app.get("/cordhome",requireLogin,(req,res)=>{
    fests.find({},function(err,fests){
        if(err)
           console.log(err);
        else
           res.render("cordhome",{fests:fests});         
        });
});

let details;
app.post("/newfest",function(req,res){
     var college = req.body.collegename;
     var festname = req.body.festname;
     var type = req.body.type;
     details = {college:college,
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
    fests.findOne({festname:fest},(err,record)=> {
      if(err)
          console.log(err);
      else {
         res.render("festpage",{fest:fest, fests:record});    
      }
  });
    
});

app.post("/cordhome/:fest",(req,res)=>{
    const {fest} = req.params;
    let type = req.body.type,
        name = req.body.name,
        imageupload = req.body.imageupload,
        descr = req.body.description,
        date = req.body.date,
        hours = req.body.hours,
        minutes = req.body.minutes,
        time,
        venue = req.body.venue,
        voting = req.body.voting;
        mobile = req.body.mobile;

        time = new Date();
        time.setHours(hours);
        time.setMinutes(minutes);

        if(voting=="YES")
        {
            voting=true;
        }
        else
        {
            voting=false;
        }
        let details = {
            type: type,
            name: name,
            imageUpload: imageupload,
            descr: descr,
            date: date,
            time : time,
            venue: venue,
            voting: voting,
        };


            fests.update({festname:fest},{$push:{competitions:[details]}}, (err,reco)=> {
                if(err)
                    console.log(err);
                else {
                    console.log("Competition organized!!");
                    var url="/cordhome/"+fest;
                    console.log(url);
                      res.redirect(url);
                    }
            });
                      
});

app.post("/cordhome/:fest",(req,res)=>{
    const {fest} = req.params;
    let type = req.body.type,
        name = req.body.name,
        imageupload = req.body.imageupload,
        descr = req.body.description,
        date = req.body.date,
        hours = req.body.hours,
        minutes = req.body.minutes,
        time,
        venue = req.body.venue,
        candidates = req.body.candidates,
        voting,
        mobile = req.body.mobile;

        time = new Date();
        time.setHours(hours);
        time.setMinutes(minutes);
        
        let details = {
            type: type,
            name: name,
            imageUpload: imageupload,
            descr: descr,
            date: date,
            time: time,
            venue: venue,
            candidates: candidates,
            voting: voting,
            Mobile: mobile
        };

            fests.update({festname:fest},{$push:{competitions:[details]}}, (err,reco)=> {
                if(err)
                    console.log(err);
                else {
                    // console.log("Competition organized!!\n"+reco);
                    // competerecords = reco;
                    res.render("festpage",{fest:fest, fests:reco});
                    // res.redirect("/cordhome/:fest");
                }
            });
});   

app.get("/Visitorhome",function(req,res){
    fests.find({},(err,records)=> {
        if(err)
            console.log(err);
        else
            res.render("Visitorhome",{fests:records});
    });

});

app.get("/Visitorhome/:fest",(req,res)=> {
    const {festrecord} =  req.params;

    fests.findOne({festname:festrecord},(err,record)=> {
        if(err)
            console.log(err);
        else {
            // console.log("Fest Record: " + record);
            res.render("visitorfestpage",{fest:fest, fests:record});    
        }
    });
});

app.listen(port,()=>{
    console.log("app is listening");
});