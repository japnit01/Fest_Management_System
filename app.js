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
app.use( express.static( "public" ));

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
    start:{type:Boolean,default:false},
    descr: String,
    date: Date,
    guests:String,
    starttime: Date,
    endtime: Date,
    venue: String,
    candidates:[candidateSchema],
    currentcand:Array, 
    voting: Boolean,
    result: Array,
    currentround:[currentroundSchema],
    round:Array,
    resultsrelease:{type:Boolean,default:false}
});

let festSchema = new mongoose.Schema({
   college:String,
   festname:String,
   Description:String,
   type:String,
   from:Date,
   to:Date,
   coord:Array,
   city: String,
   address: String,
   competitions: [competitionsSchema]
});

let userSchema = new mongoose.Schema({
    email:String,
    password:String,
    name:String, 
    age: Number, 
    college: String,
    scheduler: Array,
    registration: Array,
    festcoord:Array,
    vote:Array
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

app.get("/", async (req,res)=>{ 
    if(req.session.user_id==null)
    {
        fests.find({},(err,record)=>{
            if(err)
                console.log(err);
            else    
            {
                res.render("home",{user:req.session.user_id,fests:record});
            }
          });
    }
    else
    {
        const user = await users.findOne({_id:req.session.user_id});
        // user.festcoord =[];
        // user.save();
         var A =[];
        
         for(var i=0;i<user.festcoord.length;i++)
         {
             const fest = await fests.findOne({festname:user.festcoord[i]});
             var f =[];
             f.push(fest.festname);
             f.push(fest.college);
             f.push(fest.type);
             f.push(fest.from);
             f.push(fest.to);
             A.push(f);
         }
         console.log(A);

             res.render("home",{user:req.session.user_id,A:A});
    }
});

var signal = 0;
app.get("/signup",function(req,res){
    res.render("Sign_up");
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


let sign = 0;
app.get("/login",(req,res)=>{
    
    res.render("login",{signal:sign});
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
        sign = 0;
        req.session.user_id = user._id;
        req.session.user_name = user.name;
        console.log(req.session.user_name);
        console.log("Succesfull Login")
        // const user = await users.findOne({_id:req.session.user_id});
        // user.scheduler = [];
        // user.registration = [];
        const url = req.session.returnto;
        if(url!=null)
        {
           
           res.redirect(url);
        }
        else{
            res.redirect("/")
        }
        
    }
    else{
        console.log("Try Again")
        sign = 1;
        res.redirect("/login");
    }
});

app.post("/logout",(req,res)=>{
           console.log("session ended");
        req.session.user_id=null;
        req.session.user_name=null;
           req.session.destroy();
           res.redirect("/");

});

app.get("/cordhome",requireLogin,(req,res)=>{
    fests.find({},function(err,fests){
        if(err)
           console.log(err);
        else
           res.render("cordhome",{fests:fests,user:req.session.user_id});         
        });
});

let details;
app.post("/newfest",async(req,res)=>{
     var college = req.body.collegename;
     var festname = req.body.festname;
     var type = req.body.type;
     var from = req.body.from;
     var to = req.body.to;
     var city = req.body.city;
     var state = req.body.state;
     var desc = req.body.description;
     details = {college:college,
                festname:festname,
                coord:[req.session.user_id],  
                type:type,
                from:from,
                to:to,
                city:city,
                state:state,
                Description:desc
               };
     
    
    const user = await users.findOne({_id:req.session.user_id});
    user.festcoord.push(festname);
    user.save();
               

     fests.create(details,(err,fest)=>{
         if(err)
           console.log(err);
         else
           console.log("Created new fest");  
     });

     res.redirect("/");
});

var A = [];
app.get("/cordhome/:fest",(req,res)=>{
    const {fest}= req.params;
    fests.findOne({festname:fest},(err,record)=> {
      if(err)
          console.log(err);
      else {
        let festfrom = record.from;
        let festto = record.to;
        A =[];
        console.log(festfrom,festto);
         res.render("festpage",{fest:fest,fests:record,details:details,festfrom:festfrom,festto:festto,user:req.session.user_id});    
      
     }
  });
    
});

app.post("/cordhome/:fest",(req,res)=>{
    const {fest} = req.params;
    let type = req.body.events,
        name = req.body.name,
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
        guests = req.body.guests
        starttime = new Date();
        starttime.setHours(shours);
        starttime.setMinutes(sminutes);

        endtime = new Date();
        endtime.setHours(ehours);
        endtime.setMinutes(eminutes);

        

        if(voting=="yes")
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
            descr: descr,
            date: date,
            starttime : starttime,
            endtime:endtime,
            venue: venue,
            voting: voting,
            guests:guests
        };
        fests.findOne({festname:fest},(err,record)=> {
            if(err)
                console.log(err);
            else {
              let festfrom = JSON.stringify(record.from.getFullYear()) + "-";
              if(record.from.getMonth() < 10)
                festfrom += "0";
              festfrom += JSON.stringify(record.from.getMonth()+1) + "-";
              if(record.from.getDate() < 10)
                festfrom += "0";
              festfrom += JSON.stringify(record.from.getDate());
              let festto = JSON.stringify(record.to.getFullYear()) + "-";
              if(record.from.getMonth() < 10)
                festto += "0";
              festto += JSON.stringify(record.to.getMonth()+1) + "-";
              if(record.to.getDate() < 10)
                festto += "0";
              festto += JSON.stringify(record.to.getDate());
              if(date >= festfrom && date <= festto)
              {
                  console.log(date);
                fests.updateOne({festname:fest},{$push:{competitions:[details]}}, (err,reco)=> {
                    if(err)
                        console.log(err);
                    else {
                        console.log("Competition organized!!");
                        }
                }); 
                var url = "/cordhome/" + fest;
                console.log(url);
                res.redirect(url);
             }
             else
             {
                //   res.send("Date of competition should be between the dates of the fest!!!");
                // alert("Date of competition should be between the dates of the fest!!!");
                console.log(date);
                console.log(festfrom);
                console.log(festto);
                let url = "/cordhome/" + fest + "/addcompetitions";
                  res.redirect(url);
             }
        }
    });     
});

app.get("/cordhome/:fest/addcompetitions",requireLogin,(req,res)=>{
    const {fest}= req.params;

   
    fests.findOne({festname:fest},(err,record)=> {
      if(err)
          console.log(err);
      else {
        let festfrom = record.from;
        let festto = record.to;
         res.render("Competitions",{fest:fest,fests:record,festfrom:festfrom,festto:festto,user:req.session.user_id});    
      }
  });
});

var A = []
app.get("/cordhome/:fest/addcoordinator",async (req,res)=>{
   const{fest}  =req.params;
   const usefest  = await fests.findOne({festname:fest});
   var coordinator = [];
   for(var i=0;i<usefest.coord.length;i++)
   {  
       const user = await users.findOne({_id:usefest.coord[i]});
       coordinator.push(user.email)
   }
   console.log(coordinator);
    res.render("coordinators",{fest:usefest,A:A,coordinator:coordinator});
});

app.post("/cordhome/:fest/addcoordinator",async(req,res)=>{
    A=[];
    const{fest}  =req.params;
    const coords = req.body.coord;
    //console.log(coords);

    var x = coords.split(",");
    x = x.slice(0,x.length-1);
    console.log(x);
    const usefest  = await fests.findOne({festname:fest});
    //console.log(usefest)
    
    for(var i=0;i<x.length;i++)
    {  
       const user = await users.findOne({email:x[i]});
       //console.log(user);
        try{
               sp = user.festcoord.find(element => element == x[i]);
               console.log(sp)
               if(sp==undefined)
               {
                 user.festcoord.push(usefest.festname);
               }   
               st = usefest.coord.find(element => element == user._id);
               console.log(st)
               if(st==undefined)
               {
                 usefest.coord.push(user._id);
               }
               console.log(usefest.coord);
                // user.festcoord = [];
                // usefest.coord = [];
               user.save();
               usefest.save();
           } 
        catch{
              //console.log("i am here to")
              A.push(x[i]);
           }   
        //console.log(A);       
    }
    
    const url = "/cordhome/" + fest + "/addcoordinator";
    res.redirect(url);
})

app.get("/cordhome/:fest/:compid/start",async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;

    const fest = await fests.findOne({festname:festname});
    const doc = await fest.competitions.id(compid);

    if(doc.start==false && doc.candidates.length<=2)
    {
        res.render("canderror")
    }
    else
    {
      res.render("startcomp",{fest:festname,compid:compid,user:req.session.user_id});
    }
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
    if(doc.type=="competitionsd")
    {
        doc.round.push("Round");
        doc.currentcand  = doc.candidates;
        if(doc.candidates.length%2!==0)
        {
            doc.currentcand = doc.currentcand.slice(0,doc.candidates.length-2)
        }
       fest.save();
    }
    else if(doc.type=="competitionss")
    {    doc.start=true
        for(i=0;i<doc.candidates.length;i++)
        {  
           if(doc.currentround.length<doc.candidates.length)
           { 
              doc.currentround.push({name:doc.candidates[i].name,candidateid:doc.candidates[i].userid,score:doc.candidates[i].score})  
            }
        }   
        fest.save();
    }
    //console.log(doc.currentcand[0],doc.candidates);  
    console.log(doc.currentcand.length) 
    var url = "/cordhome/" + festname + "/" + compid;
    res.redirect(url)
});

app.get("/cordhome/:fest/:compid/viewcandidates",async (req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    
    const fest  = await fests.findOne({festname:festname});
    const doc = fest.competitions.id(compid);

    res.render("viewcandidates",{doc:doc,fest:fest,user:req.session.user_id});
});

app.post("/cordhome/:fest/:compid/delete",async(req,res)=>{
   const festname = req.params.fest;
   const compid = req.params.compid;
   
   fests.update({festname:festname},{$pull:{competitions:{_id:compid}}},(err,comp)=>{
       if(err)
       {
           console.log(err);
       }
       else{
           console.log("Deleted");
       }
   });
   
   users.updateMany({"registration.compid":compid},{$pull:{scheduler:{compid:compid},registration:{compid:compid}}},(err,comp)=>{
       if(err)
       {
           console.log(err);
       }
       else
       {   
           console.log(comp);
           console.log("Deleted from registration and scheduler")
       }
   });
   const url = "/cordhome/"+ festname;
   res.redirect(url);
});


app.get("/cordhome/:fest/:compid",requireLogin,async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    console.log(compid);
    var start ;
    const fest = await fests.findOne({festname:festname});
    const doc = fest.competitions.id(compid);
    // doc.resultsrelease=false;
    // doc.currentround=[];
    // doc.result = [];
    // doc.currentcand = [];
    // doc.round = [];
    // fest.save();
    if(doc.type=="competitionsd")
    {
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
   
       res.render("livecompetition",{registrations:doc,fest:fest,start:start,user:req.session.user_id});
    }
    else if(doc.type=="competitionss")
    {  
        console.log(doc.currentcand);
        res.render("livevoting",{registrations:doc,fest:fest,user:req.session.user_id});
    }
});

// function selectplayer(A,x,names){

//     for(var i=0;i<A.length;i++)
//     {
//         if(A[i].score==x)
//         {
//             names.push(A[i].name);
//         }
//     }
// }

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
        var x =Number.MAX_SAFE_INTEGER;
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
            x = Math.min(x,A[A.length-1].score);
        }
        //  var names = [];
        //  selectplayer(A,x,names);
        //  console.log(names);
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


app.post("/cordhome/:fest/:compid/reset",requireLogin,async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;

    const fest = await fests.findOne({festname:festname});
    const doc = fest.competitions.id(compid);

    doc.currentround=[];
    doc.result = [];
    doc.currentcand = [];
    doc.round = [];
    fest.save();
    
    const url  = "/cordhome/" + festname;
    res.redirect(url);
 })

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
    doc.resultsrelease = true;
    fest.save();
    res.render("results",{doc:doc,user:req.session.user_id,fest:fest})
});

app.get("/cordhome/:fest/:compid/voteresults",async(req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;

    const fest = await fests.findOne({festname:festname});
    const doc = await fest.competitions.id(compid);
    doc.result = doc.currentround;
    doc.result.sort(function (a, b) {return a.score - b.score});
    doc.result.reverse()
    console.log(doc.result);
    fest.save()
    res.render("voteresults",{doc:doc,user:req.session.user_id})
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
    console.log(index,candidate);
    candidate.score = null;
    if(score2 == null)
    {
        candidate.score = score1;
    }
    else if(score1 ==null)
    {
        candidate.score = score2;
    }

    if(candidate.score!=null)
    {  var A = [];
        if(doc.currentround.length%2!=0)
        {   console.log("i am here")
            if(doc.currentround[doc.currentround.length-1].score==candidate.score)
            {
                const url1 = "/cordhome/" + festname + "/" + compid;
               return res.redirect(url1);
            }
        } 
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
            res.render("Visitorhome",{fests:records,user:req.session.user_id});
    });
});

app.get("/Visitorhome/:fest",requireLogin,(req,res)=> {
    const {fest} =  req.params;

    fests.findOne({festname:fest},(err,record)=> {
        if(err)
            console.log(err);
        else {
            console.log("Fest Record: " + record);
            res.render("visitorfestpage",{fest:fest, fests:record,user:req.session.user_id});    
        }
    });
});

app.get("/Visitorhome/:fest/:compid",requireLogin,async (req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    const fest = await fests.findOne({festname:festname});
    const doc = await fest.competitions.id(compid);
    const user = await users.findOne({_id:req.session.user_id});
    fest.save();

    if(doc.start==false)
    {
        res.render("competitionserror")
    }
    else if(doc.result.length!=0)
    {

        res.render("voteresults",{doc:doc,user:req.session.user_id})
    }
    else
    {
       res.render("visitorvoting",{fest:fest,doc:doc,uservote:user,user:req.session.user_id});
    }
    
});

app.post("/Visitorhome/:fest/:compid/:index/vote",async (req,res)=>{
    const festname = req.params.fest;
    const compid = req.params.compid;
    const index = req.params.index;
    
    const fest = await fests.findOne({festname:festname});
    const doc = await fest.competitions.id(compid);
    const user = await users.findOne({_id:req.session.user_id})
    
    user.vote.push({compid:compid,candid:doc.currentround[0].candidateid});
    doc.currentround[index].score = doc.currentround[index].score +1
    
    user.save();
    fest.save();
    
    const url = "/Visitorhome/" + festname + "/" + compid;
    res.redirect(url);
});

app.post("/Visitorhome/:fest/:compid",requireLogin,async (req,res)=>{
    const fest = req.params.fest;
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
            console.log(req.session.user_name);
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
        const url = "/Visitorhome/"+fest;
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
        res.render("registration",{A:A,N:festset,user:req.session.user_id});    
    });
});

app.get("/scheduler",requireLogin,async(req,res)=>{
    // users.count({},(err,user)=>{
    //     if(err)
    //     {
    //         console.log(err);
    //     }
    //     else{
    //         console.log(user);
    //     }
    // });
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
        res.render("scheduler",{A:A,N:festset,user:req.session.user_id});    
    });
     
});

app.post("/scheduler/:compid/delete",(req,res)=>{
    const compid = req.params.compid;
    users.update({_id:req.session.user_id},{$pull:{scheduler:{compid:compid}},registration:{compid:compid}},(err,user)=>{
       if(err)
       {
           console.log(err);
       }
       else
       {
           console.log("deleted");
       }
    });
    res.redirect("/scheduler")
});

app.listen(port,()=>{
    console.log("app is listening");
});