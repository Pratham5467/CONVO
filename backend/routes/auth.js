const express = require('express');
const router= express.Router();
const User=require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/register',async(req,res)=>{
    try{
        const user =new User({username:req.body.username,password:req.body.password});
        await user.save();
        res.status(201).json({message:'User registered successfully'});
    }catch(err){
        res.status(500).json({erroe:'Registration failed'});

    }
});

router.post('/login',async(req,res)=>{
    const user=await User.findOne({username:req.body.username});
    if (!user) return res.status(401).json({error:'User not found'});
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) return res.status(401).json({error:'Invalid Credentials'});

    const token = jwt.sign({id:user._id,username:user.username},process.env.JWT_SECRET);
    res.json({token,username:user.username});
});
module.exports=router;