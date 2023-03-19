const { ObjectId } = require('mongodb');

const followsCollection = require('../db').db().collection('follows');
const usersCollection = require('../db').db().collection('users');
const User = require('./User');

let Follow = function(followerUsername, authorId){
    this.followerUsername = followerUsername;
    this.authorId = authorId;
    this.errors = [];
}

Follow.prototype.cleanUp = function(){
    if(typeof(this.followerUsername) != "string"){this.followerUsername=""}
}

Follow.prototype.validate = async function(action){
    let followedAccount = await usersCollection.findOne({username: this.followerUsername})
    if(followedAccount){
        this.followId = followedAccount._id;

    }else{
        this.errors.push("Cannot follow a user that does not exist");
    }

    let doesFollowAlreadyExist = await followsCollection.findOne({followId: this.followId, authorId: new ObjectId(this.authorId)});
    if(action == "follow"){
        if(doesFollowAlreadyExist){this.errors.push('You are already following')};
    }
    if(action == "unfollow"){
        if(!doesFollowAlreadyExist){this.errors.push('You are already not following')};
    }
    if(this.followId.equals(this.authorId)){this.errors.push("You cannot follow yourself")};
}

Follow.prototype.create = function(){
    return new Promise(async(resolve, reject) => {
        this.cleanUp();
        await this.validate("follow");
        if(!this.errors.length){
            await followsCollection.insertOne({followId: this.followId, authorId: new ObjectId(this.authorId)});
            resolve();
        }else{
            reject(this.errors);
        }

    })
}

Follow.isVisitorFollowing = async function(followId, visitorId){
    let followDoc = await followsCollection.findOne({followId: followId, authorId: new ObjectId(visitorId)});
    if(followDoc){
        return true;
    }else{
        return false;
    }
}

Follow.prototype.delete = function(){
    return new Promise(async(resolve, reject) => {
        this.cleanUp();
        await this.validate("unfollow");
        if(!this.errors.length){
            await followsCollection.deleteOne({followId: this.followId, authorId: new ObjectId(this.authorId)});
            resolve();
        }else{
            reject(this.errors);
        }

    })
}

Follow.getFollowersById = function(id){
    return new Promise(async(resolve, reject) => {
        try{
            let followers = await followsCollection.aggregate([
                {$match: {followId: id}},
                {$lookup: {from: "users", localField: "authorId", foreignField: "_id", as: "userDoc"}},
                {$project:{
                    username: {$arrayElemAt: ["$userDoc.username",0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray();
            followers = followers.map(follower=>{
                let user = new User(follower, true);
                return{username: follower.username, avatar: user.avatar}
            })
            resolve(followers)
        }catch{
            reject("errors in follow model")
        }
    })
}

Follow.getFollowingById = function(id){
    return new Promise(async(resolve, reject) => {
        try{
            let followings = await followsCollection.aggregate([
                {$match: {authorId: id}},
                {$lookup: {from: "users", localField: "followId", foreignField: "_id", as: "userDoc"}},
                {$project:{
                    username: {$arrayElemAt: ["$userDoc.username",0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray();
            followings = followings.map(following=>{
                let user = new User(following, true);
                return{username: following.username, avatar: user.avatar}
            })
            resolve(followings)
        }catch{
            reject("errors in follow model")
        }
    })
}

Follow.countFollowersById = function(id){
    return new Promise(async (resolve, reject) => {
      let followerCount = await followsCollection.countDocuments({followId: id})
      resolve(followerCount)
    })
  }
  Follow.countFollowingById = function(id){
    return new Promise(async (resolve, reject) => {
      let count = await followsCollection.countDocuments({authorId: id})
      resolve(count)
    })
  }

module.exports = Follow;