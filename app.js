let express = require("express"),      
    mongoose = require("mongoose"),      //connects backend to backend 
    bodyParser = require("body-parser"),  //takes the input of the user from the front-end and send to backend
    nodemon = require("nodemon"),
    bcrypt = require("bcrypt"),         
    session = require("express-session"),  
    app = express();

const port = 80;

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:"yes its secret"}));

mongoose.connect("mongodb://localhost/festdb",{useNewUrlParser: true,useUnifiedTopology:true});

let candidateSchema = new mongoose.Schema({
    name: String,
    userid: String,
    score: Number
});

let currentroundSchema = new mongoose.Schema({
   name:String,
   candidateid:String,
   score:Number
});

let competitionsSchema = new mongoose.Schema({
    type: String,
    name: String,
    imageUpload: String, 
    descr: String,
    date: Date,
    starttime: Date,
    endtime: Date,
    venue: String,
    candidates:[candidateSchema],
    currentcand:Array, 
    voting: Boolean,
    result: Array,
    currentround:[currentroundSchema],
    round:Array
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
    name:String, 
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
      const {email,password,name} = req.body;
      const hash = await bcrypt.hash(password,12)
      const userdetails = new users({
          email,
          password:hash,
          name
      });
      req.session.user_id = userdetails._id;
      req.session.user_name = userdetails.name
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

app.get("/cordhome/:fest/addcompetitions",(req,res)=>{
    const {fest}= req.params;
    fests.findOne({festname:fest},(err,record)=> {
      if(err)
          console.log(err);
      else {
         res.render("Competitions",{fest:fest,fests:record});    
      }
  });
    
});

app.get("/cordhome/:fest/:compid/start",async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;

    res.render("startcomp",{fest:festname,compid:compid});
})

app.post("/cordhome/:fest/:compid/start",async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    
    
    const fest = await fests.findOne({festname:festname});
    //console.log(fest);
    const doc = await fest.competitions.id(compid);
    // doc.currentround=[];
    // doc.result = [];
    // doc.currentcand = [];
    // doc.round = [];
    // fest.save();
    doc.round.push("Round");
    doc.currentcand  = doc.candidates;
    if(doc.candidates.length%2!==0)
    {
        doc.currentcand = doc.currentcand.slice(0,doc.candidates.length-1)
    }
    fest.save();
    //console.log(doc.currentcand[0],doc.candidates);  
    console.log(doc.currentcand.length) 
    var url = "/cordhome/" + festname + "/" + compid;
    res.redirect(url)
});

app.get("/cordhome/:fest/:compid",requireLogin,async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    var start ;
    const fest = await fests.findOne({festname:festname});
    const doc = fest.competitions.id(compid);
    // doc.currentround=[];
    // doc.result = [];
    // doc.currentcand = [];
    // doc.round = [];
    // fest.save();
    console.log(doc.currentround.length)
    
    if((doc.currentround.length)%2 == 0)
    {  
           start = doc.currentround.length
           console.log(start);
    }
    else if(start%2!=0)
    {
         start = doc.currentround.length-1;
    }

    res.render("livecompetition",{registrations:doc,fest:fest,start:start});
});


app.post("/cordhome/:fest/:compid",async (req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
 
    const fest = await fests.findOne({festname:festname});
    const doc = fest.competitions.id(compid);
    const nextlevel = req.body.nextlevel;
    console.log(nextlevel)
    if(nextlevel == "nextlevel")
    {   var A = [];
        //console.log(doc.currentround);
        doc.result.push(doc.currentround);
        for(i=0;i<doc.currentround.length;i+=2)
        {
            if(doc.currentround[i].score < doc.currentround[i+1].score)
            {
                A.push(doc.currentround[i+1])
            }
            else if(doc.currentround[i].score > doc.currentround[i+1].score)
            {
                A.push(doc.currentround[i]);
            }            
        }
        console.log(A);
        
        if(doc.round[doc.round.length-1]=="Special Round")
        {
           var i;
             for(i=0;i<doc.result[1].length-1;i++)
             {
                 A.push(doc.result[1][i]);
             }
        }
        else if(doc.round[doc.round.length-1]=="Round")
        {  
           if(doc.result[doc.result.length-1].length==2)
           {   doc.result.push(A);
               doc.result[doc.result.length-1].sort(function (a, b) {return a.score - b.score});
               doc.result[doc.result.length-1].reverse()
               console.log("ended");
               fest.save()  
               var url = "/cordhome/" + festname + "/" +  compid + "/results";
               return res.redirect(url);
           }
        }

        //console.log(A);
        doc.result.push(A);
        doc.result[doc.result.length-1].sort(function (a, b) {return a.score - b.score});
        doc.result[doc.result.length-1].reverse()
        //console.log(doc.result.length)
        console.log(doc.result[doc.result.length-1]);
       
        if(doc.result.length == 2 && doc.candidates.length%2!=0 && doc.currentround.length != doc.candidates)
        {   console.log("sub round")
            doc.round.push("Special Round");
            doc.currentcand = [];
            doc.currentround = [];
            doc.currentcand.push(doc.result[1][doc.result[1].length-1]);
            doc.currentcand.push(doc.candidates[doc.candidates.length-1]);
            console.log(doc.currentcand);
            
        }
        else if((doc.result[doc.result.length-1].length)%2!=0)
        {    doc.round.push("Round");
             var B =[];
             doc.currentcand = [];
             doc.currentround = [];
              //console.log(doc.result[doc.result.length-1])
              B = doc.result[doc.result.length-1].slice(0,doc.result[doc.result.length-1].length-1);
              console.log(B);
              doc.result.push(B);
              doc.currentcand = B;
              console.log(doc.result[doc.result.length-1]);
        } 
        else if((doc.result[doc.result.length-1].length)%2==0)
        {   console.log("even")
            doc.round.push("Round"); 
            doc.currentcand = [];
            doc.currentround = []; 
            console.log(doc.result[doc.result.length-1]);
            doc.currentcand = doc.result[doc.result.length-1];
             doc.currentround = []; 
        }
        //console.log(doc.result.length,doc.result);
        //console.log(doc.result[0][1]);\
            
            fest.save();
            var url = "/cordhome/" + festname + "/" +  compid;
            res.redirect(url);
    }
    
});

app.get("/cordhome/:fest/:compid/results",async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    const fest = await fests.findOne({festname:festname});
    const doc = await fest.competitions.id(compid);
    const n = doc.result.length;
    var final = new Map();
    var count = 0;
    for(i=n-1;i>=0;i--)
    {
        m = doc.result[i].length;
        for(j=0;j<m;j++)
        {
             if(!final.has(doc.result[i][j].name))
             {
                 final.set(doc.result[i][j].name,{rank:count+1});
                 count++;
             }
           if(count==3)
           {
               break;
           }
        }
        if(count == 3)
        {
            break;
        }
    }
    var A = [];
    console.log(final);
    const it = final.keys()
    for(i=0;i<final.size;i++)
            {   
                var id = it.next().value;
                A.push({name:id,rank:final.get(id).rank});
            } 
    console.log(A);      
    doc.currentcand = A;  
    res.render("results",{doc:doc})
});

app.post("/cordhome/:fest/:compid/:candidatesid",async (req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    const candid = req.params.candidatesid;
    const score1 = req.body.score1;
    const score2 = req.body.score2;
    console.log(candid);
    const fest = await fests.findOne({festname:festname});
    const doc = await fest.competitions.id(compid);
    const index = doc.currentcand.findIndex(x => x._id == candid);
    const candidate = doc.currentcand[index];
    console.log(candidate.userid);
    console.log(index,candidate);
    
    if(!score2)
    {
        candidate.score = score1;
    }
    else if(!score1)
    {
        candidate.score = score2;
    }

    if(candidate.score!=null)
    {  var A = [];
       doc.currentround.push({candidateid:candid,name:candidate.name,score:candidate.score});
       //doc.currentround=[];
       //console.log(candidate,doc.currentround);
       var currcand = new Map();
       for(i=0;i<doc.currentround.length;i++)
            {   
                //console.log(doc.currentround[i]._id);
                if(currcand.has(doc.currentround[i]._id)==false)
                {
                    currcand.set(doc.currentround[i].candidateid,{name: doc.currentround[i].name, score: doc.currentround[i].score})
                }               
            }
            console.log(currcand);
            const it = currcand.keys()
            for(i=0;i<currcand.size;i++)
            {   
                var id = it.next().value;
                A.push({candidateid:id,name:currcand.get(id).name,score:currcand.get(id).score});
            } 
            //console.log(A);
             doc.currentround = A;
             console.log(doc.currentround)
            fest.save();
    }
    const url = "/cordhome/" + festname + "/" + compid;
    res.redirect(url)
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

app.post("/Visitorhome/:fest/:compid",requireLogin,async (req,res)=>{
    const {fest} = req.params;
    const {compid} = req.params;
    var register = req.body.register; 
    var schedule = req.body.schedule;
    console.log(register,schedule);
    const festfound = await fests.findOne({festname:fest});
    if(schedule == "schedule")
        {
            users.updateOne({_id:req.session.user_id},{$addToSet:{scheduler:[{compid:compid,festid:festfound._id}],registration:[compid]}},(err,record)=>{
                if(err)
                {
                    console.log(err);
                }
                else
                {
                console.log("record added");
                }
            });
        }
    else if(register=="register")
        {   var A = [];
            var candidate  = new Map();
            const doc = festfound.competitions.id(compid);   
            doc.candidates.push({userid:req.session.user_id,name:req.session.user_name,score:0});
            //doc.candidates = A;
            //console.log(doc.candidates.length);
            for(i=0;i<doc.candidates.length;i++)
            {    id = doc.candidates[i].userid
    
                if(candidate.has(id) == false)
                {
                    candidate.set(id,{name:doc.candidates[i].name,score:doc.candidates[i].score})
                }  
                            
            }
            console.log(candidate); 
            const it = candidate.keys()
            for(i=0;i<candidate.size;i++)
            {
                var userid = it.next().value;
                A.push({userid:userid,name:candidate.get(userid).name,score:doc.candidates[i].score})
            }
            var B = [];
            console.log(A);
            doc.candidates = A;
            festfound.save()
            console.log(doc.candidates)
            
            
            users.findOne({_id:req.session.user_id},async (err,user)=>{
                if(err)
                {
                   console.log(err);
                }
                else{
                    
                   users.updateOne({_id:req.session.user_id},{$addToSet:{scheduler:[{compid:compid,festid:festfound._id}],registration:[{compid:compid,festid:festfound._id}]}},(err,record)=>{
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
});

app.get("/registrations",requireLogin,async (req,res)=> {
    var A = [];
    var D = [];
    //var N = [];
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
           for(i=0;i<user.registration.length;i++)
           { 
             var X = [];  
             const fest = await fests.findOne({_id:user.registration[i].festid}) 
             fid = JSON.stringify(fest._id); 
             if(festset.has(fid) == false)
             {
                 festset.set(fid,fest.festname);
             }
             const doc = fest.competitions.id(user.registration[i].compid);
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
        res.render("registration",{A:A,N:festset});    
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