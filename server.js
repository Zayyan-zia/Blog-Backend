const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Fuse = require('fuse.js');
const multer = require('multer');
const session = require('express-session');
const Mongostore = require('connect-mongo');
const {Resend} = require('resend');
const {v2 : cloudinary} = require('cloudinary');
const app = express();
require('dotenv').config();
const resend = new Resend(process.env.Email_Api);
const createdbytes={};
cloudinary.config({
  cloud_name:process.env.cloudinaryName,
  api_key:process.env.cloudinaryApi,
  api_secret:process.env.cloudinarySApi
})
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.mongooseurl, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000, 
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

connectDB();
app.use(express.json());
// Make sure these environment variables are set
console.log('Checking environment variables...');
console.log('MongoURL exists:', !!process.env.mongooseurl);
console.log('Session secret exists:', !!process.env.sessionsecret);

app.use(session({
    secret: process.env.sessionsecret,
    resave: false,
    saveUninitialized: false,
    store: Mongostore.create({
        mongoUrl: process.env.mongooseurl,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 * 30,
    }
}));

const multerstorage = multer.memoryStorage();
const upload = multer({ storage: multerstorage });

async function CloudinaryImageUpload(ImageBuffer,ImageMimeType){
  const ImageUrl = `data:${ImageMimeType};base64,${ImageBuffer.toString('base64')}`
const ImageUri = await cloudinary.uploader.upload(ImageUrl,{
  folder:'Blog_Images'
})
return ImageUri.secure_url
}

const signinschema = new mongoose.Schema({
    fullname: String,
    email: String,
    password: String,
    image: String,
});
const User = mongoose.model('Users', signinschema);

const Blogschema= new mongoose.Schema({
  useremail: String,
  username: String,
  title: String,
  description: String,
  image: String,
  Date: { type: Date, default: Date.now },
})
const Blogpost=mongoose.model('Blogposts',Blogschema);

const CommentSchema = new mongoose.Schema({
  fullname:String,
  BlogId:String,
  comment:String,
  ImageId:String,
  Date: { type: Date, default: Date.now },
})
const BlogComment = mongoose.model('BlogComments',CommentSchema);

const LikeSchema = new mongoose.Schema({
Likes:Number,
BlogId:String,
userId:String,
})
const Like = mongoose.model('BlogLikes',LikeSchema);

app.get('/', async(req, res) => {
  const bytes=crypto.randomBytes(4).toString('hex');
   res.send(bytes);
});

app.post('/otpverification',upload.none(),async(req,res)=>{
  const {otp,email}=req.body||{};
  if(otp){
  if(otp === createdbytes[email]?.otp && Date.now()<createdbytes[email]?.expires){
   delete createdbytes[email];
    res.status(200).send({verification:true})
  }
  else{ 
    if(createdbytes[email]){
       delete createdbytes[email];
      res.status(200).send({verification:false,message:"Wrong OTP or Expired OTP"});
    }
    else{
        res.status(200).send({verification:false,message:"Wrong OTP or Expired OTP"});
    }
  }
}
else if(!email){
 return res.send({verification:"Error while generating OTP"});
}
else{
  try{
  const bytes=crypto.randomBytes(4).toString('hex');
  createdbytes[email]={otp:bytes,expires:Date.now()+60000};
  await resend.emails.send({
  from: 'EchoWrite <onboarding@resend.dev>',
  to: email, 
  subject: 'Your OTP of EchoWrite Signup',
  html: `<p>Your OTP for <strong>EchoWrite</strong> signup is <strong>${bytes}</strong>. It is valid for 1 minutes.</p>`,
})
  res.status(200).send({verification:`We have sent OTP to you on your ${email} email`});
}
catch(err){
  res.status(200).send({message:"Failed to send OTP try again later"});
}
}
})

app.post('/signup', upload.single('image'), async (req, res) => {
    const { name, email, password } = req.body;
    if (!req.file) {
      return res.status(400).send("Image is required");
    }

    const imagebuffer = req.file.buffer;
    const imagetype = req.file.mimetype;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json(false);
    }
    const ImageUrl = await CloudinaryImageUpload(imagebuffer,imagetype);
    const user = await User.create({
      fullname: name,
      email,
      password,
      image:ImageUrl,
    });

    req.session.userEmail = user.email;
    res.status(201).json(true);
});


app.get('/isSignup', async (req, res) => {
    if (req.session.userEmail) {
        const user = await User.findOne({ email: req.session.userEmail });
        res.send(user);
    } else {
        res.status(200);
    }
});

app.get('/signout',(req,res)=>{
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error signing out');
        }
        res.clearCookie('connect.sid'); 
        res.status(200).send('Signed out successfully');
    });
})

app.get('/getimages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send("Invalid user ID");
    }

    const user = await User.findById(id);
    const blogpost= await Blogpost.findById(id);
    if (user) {
       res.set("Content-Type", user.imagemimetype);
    res.status(200).send(user.image);
    }
    else{
      res.set("Content-Type", blogpost.imagemimetype);
      res.status(200).send(blogpost.image);
    }

   
  } catch (err) {
    console.error("Error fetching image:", err);
    res.status(500).send("Server error");
  }
});

app.post('/login',upload.none(),async(req,res)=>{
  const {email,password}=req.body;
  const loginuser= await User.findOne({email:email});
    if (!loginuser) {
      return res.json({ email: false, password: false});
    }

    if (loginuser.password !== password) {
      return res.json({ email: true, password: false});
    }

        req.session.userEmail = loginuser.email;

    return res.json({
      email: true,
      password: true,
      username: loginuser.fullname,
    });
})

app.post('/newsletter',upload.none(),async(req,res)=>{
    const {name,email}=req.body;
    req.session.newsletter={name,email};
    await resend.emails.send({
  from: 'EchoWrite <onboarding@resend.dev>',
  to: email, 
  subject: 'Welcome to the Zstyles Newsletter!',
  text: `Hi ${name || 'there'},\n\nThank you for subscribing to the Zstyles newsletter! 🎉\n\nYou’ll now be the first to know about:\n- Exclusive offers\n- New arrivals\n- Style tips and trends\n\nWe’re excited to have you with us.\n\nBest regards,\nThe Zstyles Team`,
  html: `
    <p>Hi <strong>${name || 'Dear'}</strong>,</p>
    <p>🎉 Thank you for subscribing to the <strong>Zstyles Newsletter</strong>!</p>
    <p>You’ll now be the first to know about:</p>
    <ul>
      <li>✨ Exclusive offers</li>
      <li>🛍️ New arrival posts</li>
      <li>💡 Style tips and trends</li>
    </ul>
    <p>We’re excited to have you with us. Stay tuned!</p>
    <p>Best regards,<br><strong>The Zstyles Team</strong></p>
  `
});

res.status(200).json({ success: true });
})

app.get('/isSubscribe',(req,res)=>{
  if(req.session.newsletter){
    const{name,email}=req.session.newsletter;
 
    
    res.send({
      name,
      email,
      isSubscribe:true,
    })
  }
  else{
      
    res.send({
      isSubscribe:false,
    })
  }
})

app.get('/unsubscribe',(req,res)=>{
  if (req.session.newsletter) {
    delete req.session.newsletter;
  }
  res.status(200).json({ isSubscribe: false });
})

app.post('/createpost',upload.single('postimage'),async(req,res)=>{
  if(req.session.userEmail){
    const {posttitle,postdescription,readTime}=req.body;
    const {buffer, mimetype}=req.file;
    const ImageUrl = await CloudinaryImageUpload(buffer,mimetype);
    const blogpost=await Blogpost.create({
      useremail:req.session.userEmail,
      username:(await User.findOne({email:req.session.userEmail})).fullname,
      title:posttitle,  
      description:postdescription,
      image:ImageUrl,
      readTime
  })
  res.send(blogpost)
}
})

app.get('/allblogs',async(req,res)=>{
  const allblogs=await Blogpost.find().sort({Date:-1});
  res.status(200).json(allblogs);
})

app.get('/specificblog/:id',upload.none(),async(req,res)=>{
  const {id}=req.params || {};
  if(mongoose.Types.ObjectId.isValid(id)){
   const specificblog=await Blogpost.findById(id);
  
  if(specificblog){
    res.status(200).json(specificblog);
  }
   else{
    res.json(false);
  }

}    
  else{
    console.log("Invalid ID format");
    res.json(false);
  } 

 
})

app.post('/search',async(req,res)=>{
     const {SearchedWord} = req.body;
    const options = {
     keys:['description','title'],
     threshold:0.3
    }
    const data = await Blogpost.find();
    const fuse = new Fuse(data,options);
    const SearchResult= fuse.search(SearchedWord);
    res.json(SearchResult);
})

app.post('/comment',upload.none(),async(req,res)=>{
const {name,image,comment,BlogId} = req.body
const CommentSend = await BlogComment.create({
  fullname:name,
  BlogId,
  comment,
  ImageId:image,
});
res.send(CommentSend);
})

app.get('/getComments/:id',async(req,res)=>{
  const {id} = req.params;
  try{
  const CommentsFind = await BlogComment.find({'BlogId':id}).sort({Date:-1});
  res.send(CommentsFind);
  }
  catch(err){
  res.send([{
    'Error':'Failed, please try again later'
  }]);
  }
})

app.post('/BlogLikes',async(req,res)=>{
  const {userId,BlogId} = req.body;
  async function Checking () {
     const LikeCheck = await Like.find({BlogId});
     return LikeCheck;
  }
      const LikeCheck = await Checking();
      const userLiked = LikeCheck.some((ik)=>{
        return ik.userId.toString() === userId.toString()
      })
  if(LikeCheck.length>0){

    if(!userLiked){
   await Like.updateMany(
      {BlogId},
      {$inc:{Likes:1}},
    )
      const UpdatedLikes = await Checking()
       return res.send(UpdatedLikes);
  }

  else{
    const totalLikes = LikeCheck[0].Likes + 1;
      const Liking = await Like.create({
      userId,
      BlogId,
      Likes:totalLikes
    });
   return res.send([Liking]);
  }

  }
  else{
    const Liking = await Like.create({
      userId,
      BlogId,
      Likes:1
    });
      return res.send([Liking]);
  }
})

app.post('/GetBlogLikes',async(req,res)=>{
   const {userId,BlogId} = req.body;
   const AllLikes = await Like.find({BlogId});
   if(AllLikes){
     const isLiked = AllLikes.some((lk)=>{
      return lk.userId === userId
    })
    res.send({AllLikes,IsLiked:isLiked})
   }
   else{
    res.send({AllLikes,IsLiked:false})
   }
})

app.post('/UserBlogs',async(req,res)=>{
  const {email} = req.body
  const UserBlogData = await Blogpost.find({useremail:email})
  res.send(UserBlogData);
})

async function GettingPublic_Id(URI){
   const Spliting = URI.split('/');
   const Folder = Spliting[Spliting.length-2];
   const Value = Spliting[Spliting.length-1].split('.')[0];
   return`${Folder}/${Value}`
}

app.delete('/deleteBlog',async(req,res)=>{
  const {id} = req.body;
  const Delete = await Blogpost.findByIdAndDelete(id);
  const Image = await GettingPublic_Id(Delete.image);
  const DeleteImage = await cloudinary.uploader.destroy(Image);
  const DeletingComments = await BlogComment.findOneAndDelete({BlogId:id});
  const DeletingLikes = await Like.findOneAndDelete({BlogId:id});
  res.status(200).send(Delete.useremail);
})

app.delete('/deleteAccount',async(req,res)=>{
  const {AccountPassword} = req.body;
  const finding = await User.find({password:AccountPassword});
  if(finding.length>0){
    await User.findOneAndDelete({password:AccountPassword});
    const ImageDelete = await GettingPublic_Id(finding[0].image);
    await cloudinary.uploader.destroy(ImageDelete);
        req.session.destroy((err) => {
        if (err) {
            return res.status(500).send({success:false});
        }
        res.clearCookie('connect.sid')
         return res.send({success:true}); 
    });
  }
  else{
    res.send({success:false});
  }
})

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
