const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

// Models
var userSchema = new mongoose.Schema({
  username: String,
  log: [{
      description: String,
      duration: Number,
      date: Date
    }]
});

var User = mongoose.model('User', userSchema);


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/users', function(req, res){
  User.find({}, 'username _id', function(err, users) {
    res.json(users);
  })
});

app.route('/api/exercise/new-user')
  .post(function(req, res){
    var newUser = new User({username: req.body.username});
    newUser.save(function(err, data){
      res.json({username: data.username, _id: data._id})
    });
  })

app.route('/api/exercise/add')
  .post(function(req, res) {
    var newExercise = {description: req.body.description, duration:  Number(req.body.duration), date: req.body.date ? new Date(req.body.date) : new Date()};
    User.findOne({_id: req.body.userId}, function(err, data) {
      if (data.log) {
        data.log = data.log.concat(newExercise);
      } else {
        data.log = [].concat(newExercise);
      }
      console.log('data', data);
      console.log(data instanceof User);
      data.save(function(err, newData){
        if (err) {console.log(err)};
        console.log('newData', newData);
        res.json({username: newData.username, description: newExercise.description, duration: newExercise.duration, data: newExercise.data});
      });
    })
  });

app.get('/api/exercise/log', function(req, res){
  var userId = req.query.userId;
  var from = req.query.from && new Date(req.query.from); 
  var to = req.query.to && new Date(req.query.to);
  
  User.findById(userId, function(err, data) {
    var returnLog = [];
    var userLog = data.log;
    var limit = req.query.limit || userLog.length;
    
    returnLog = userLog.slice(0, limit);
    
    if (from) {
      returnLog = returnLog.filter(function(e){
        return e.date >= from;
      });
    }
    
    if (to) {
      returnLog = returnLog.filter(function(e){
        return e.date <= to;
      });
    }
    
    res.json({username: data.username, count: data.log.length, log: returnLog});
  })
  
  // User.findById(userId, 'username log', function(err, data){
  //   res.json(data);
  // });
});

app.get('/api/exercise/delete/:userId', function(req, res){
  User.findById(req.params.userId, function(err, theUser){
    User.remove(theUser, function(err, data){
      res.json({deleted: theUser.username});
    })
  });
})
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
