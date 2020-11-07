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
    imageUpload: String, 
    descr: String,
    date: Date,
    starttime: Date,
    endtime: Date,
    venue: String,
    candidates:Array, 
    voting: Boolean,
});

let festSchema = new mongoose.Schema({
   college:String,
   festname:String,
   type:String,
   from:Date,
   to:Date,
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
    req.session.returnto = req.url;
    if(!req.session.user_id)
    {
        return res.redirect("/login");
    }
    next()
};

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
    if(!user)
    {
        console.log("Username not registered");
        res.redirect("/signup");
    }
    const valid = await bcrypt.compare(password,user.password);
    if(valid)
    {
        req.session.user_id = user._id;
        console.log("Succesfull Login");
        const url = req.session.returnto;
        res.redirect(url);
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
     var from = req.body.from;
     var to = req.body.to;
     details = {college:college,
                festname:festname,
                type:type,
                from:from,
                to:to
               };
     
     fests.create(details,(err,fest)=>{
         if(err)
           console.log(err);
         else
           console.log("Created new fest");  
     });
     res.redirect("/cordhome");
});

app.get("/cordhome/:fest",(req,res)=>{
    const {fest}= req.params;
    fests.findOne({festname:fest},(err,record)=> {
      if(err)
          console.log(err);
      else {
         res.render("festpage",{fest:fest,fests:record});    
      }
  });
    
});

app.post("/cordhome/:fest",(req,res)=>{
    const {fest} = req.params;
    let type = req.body.events,
        name = req.body.name,
        imageupload = req.body.imageupload,
        descr = req.body.description,
        date = req.body.date,
        shours = req.body.shours,
        sminutes = req.body.sminutes,
        ehours = req.body.ehours,
        eminutes = req.body.eminutes,
        starttime,
        endtime,
        venue = req.body.venue,
        voting = req.body.voting;
        starttime = new Date();
        starttime.setHours(shours);
        starttime.setMinutes(sminutes);

        endtime = new Date();
        endtime.setHours(ehours);
        endtime.setMinutes(eminutes);

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
            starttime : starttime,
            endtime:endtime,
            venue: venue,
            voting: voting,
        };
        
            fests.updateOne({festname:fest},{$push:{competitions:[details]}}, (err,reco)=> {
                if(err)
                    console.log(err);
                else {
                    console.log("Competition organized!!");
                    }
            });
            var url="/cordhome/"+fest;
            console.log(url);
              res.redirect(url);          
});

app.get("/Visitorhome",function(req,res){
    fests.find({},(err,records)=> {
        if(err)
            console.log(err);
        else
            res.render("Visitorhome",{fests:records});
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

app.get("/Visitorhome/:fest",requireLogin,(req,res)=> {
    const {fest} =  req.params;

    fests.findOne({festname:fest},(err,record)=> {
        if(err)
            console.log(err);
        else {
            // console.log("Fest Record: " + record);
            res.render("visitorfestpage",{fest:fest, fests:record});    
        }
    });
});

app.post("/Visitorhome/:fest/:compid",(req,res)=>{
    const {fest} = req.params;
    const {compid} = req.params;
    var register = req.body.register; 
    var schedule = req.body.schedule;
    console.log(register,schedule);
    fests.findOne({festname:fest},async (err,record)=>{
        if(err)
           console.log(err);
        else
        { var i;
          
           if(schedule == "schedule")
           {
                users.updateOne({_id:req.session.user_id},{$addToSet:{scheduler:[{compid:compid,festid:record._id}],registration:[compid]}},(err,record)=>{
                    if(err)
                    {
                        console.log(err);
                    }
                    else{
                         console.log("record added");
                    }
                });
            }
            else if(register=="register")
            {   for(i=0;i<record.competitions.length;i++)
                {   const comp = JSON.stringify(compid);
                    const reccomp = JSON.stringify(record.competitions[i]._id)
                    //console.log(comp,reccomp);
                    let a = comp.localeCompare(reccomp);
                    //console.log(a);
                    if(a == 0)
                    {
                        record.competitions[i].candidates.push(req.session.user_id)
                        record.save();
                        console.log("registered")
                    }
                }
                
                users.findOne({_id:req.session.user_id},async (err,user)=>{
                    if(err)
                    {
                       console.log(err);
                    }
                    else{
                        
                       users.updateOne({_id:req.session.user_id},{$addToSet:{scheduler:[{compid:compid,festid:record._id}],registration:[compid]}},(err,record)=>{
                           if(err)
                           {
                               console.log(err);
                           }
                           else{
                               console.log("record added");
                           }
                       }); 
                     }  
                 });
            }
            var url = "/Visitorhome/"+fest;
            res.redirect(url)
        }
    });
});

app.get("/scheduler",requireLogin,async(req,res)=>{
    var A = [];
    var D = [];
    var N = [];
    let festset = new Map() 
    users.findOne({_id:req.session.user_id}, async (err,user)=>{
        if(err)
        {
            console.log(err);
        }
        else
        {
           var i,j; 
           
           //var p = [compid,date,starttime,endtime];
           for(i=0;i<user.scheduler.length;i++)
           { 
             var X = [];  
             const fest = await fests.findOne({_id:user.scheduler[i].festid}) 
             fid = JSON.stringify(fest._id); 
             if(festset.has(fid) == false)
             {
                 festset.set(fid,fest.festname);
             }
             const doc = fest.competitions.id(user.scheduler[i].compid);
             D.push(doc);
             X.push(fest._id)
             X.push(doc._id);
             var str = JSON.stringify(doc.date.getFullYear())+JSON.stringify(doc.date.getMonth())+JSON.stringify(doc.date.getDate());
             if(doc.starttime.getHours()<10)
             {
                 str = str + '0' + JSON.stringify(doc.starttime.getHours())
             }
             else
             {
                 str = str + JSON.stringify(doc.starttime.getHours());
             }

             if(doc.starttime.getMinutes()<10)
             {
                str = str + '0' + JSON.stringify(doc.starttime.getMinutes());
             }
             else
             {
                str = str + JSON.stringify(doc.starttime.getMinutes()); 
             }

             if(doc.endtime.getHours()<10)
             {
                str = str + '0' + JSON.stringify(doc.endtime.getHours());
             }
             else
             {
                str = str + JSON.stringify(doc.endtime.getHours())
             }

             if(doc.endtime.getMinutes()<10)
             {
                str = str + '0' + JSON.stringify(doc.endtime.getMinutes());
             }
             else
             {
                str = str + JSON.stringify(doc.endtime.getMinutes());
             }
             X.push(parseInt(str));
             X.push(doc.name);
             X.push(doc.date)
             X.push(doc.starttime);
             X.push(doc.endtime);
             X.push(doc.venue);
                A.push(X);
           }
           
            const n = A.length;
            for(i=0;i<n-1;i++)
            {
               check=0;
               index=i;
               for(j=i+1;j<n;j++)
               { 
                  if(A[index][2]>A[j][2])
                  {   
                    check=1
                    index = j;
                  }
                }
                if(check==1)
                {   
                    temp = A[i];
                    A[i]=A[index];
                    A[index]=temp;
                }             
           }
           console.log(A);
        }
        console.log(festset);
        res.render("scheduler",{A:A,N:festset});    
    });
     
});

app.listen(port,()=>{
    console.log("app is listening");
});