// MongoDB collections 
Messages = new Mongo.Collection('messages');
Friends = new Mongo.Collection('friends');



// Codes run on client
if (Meteor.isClient) {

  // Subscribe data
  Meteor.subscribe("userData");
  Meteor.subscribe("friends");
  Meteor.subscribe("messages");

  // Template helpers
  Template.message.helpers({
    guyIsCurrentUser: function(){
      return this.from === Meteor.user().username;
    }
  });
  Template.user.helpers({
    guyIsFriend: function (name) {
      return Friends.find({username: Meteor.user().username, friends: name}).count();
    }
  });
  Template.body.helpers({
    messages: function(){
      return Messages.find(
        {$or: [
          {from: Meteor.user()&&Meteor.user().username, to: Session.get('subject')},
          {to: Meteor.user()&&Meteor.user().username, from: Session.get('subject')}
        ]},
        {
          sort: {time: 1},
          fields: {text: 1, time: 1, from: 1}
        }).fetch();
    },
    friends: function(){
      var list = Friends.findOne(
        {username: Meteor.user().username},
        {fields: {friends: 1}}
        ).friends
      return Meteor.users.find({username: {$in: list}});
    },
    users: function(){
      return Meteor.users.find(
        {username: {$ne: Meteor.user()&&Meteor.user().username}}
        )
    }
  });
  
  // Template events
  Template.menu.events({
    'click a.item': function(event){
      Session.set('status', $.trim(event.target.text));
      $item = $(event.target);
      $('a.item').removeClass('active');
      $item.addClass('active');
      $('.nav').hide(); 
      $('.'+$.trim(event.target.text)).show();
      if ($item.hasClass('message')) {
        $('body, html').animate({
          scrollTop: $(document).height(),
        }, 10);
      }
    }
  });
  Template.user.events({
    'click .chat.button': function(event){
      var subject = $(event.target).parent().find('.header').text();
      Session.set('subject', subject);
      console.log(Session.get('subject'));
      $('.message').click();
    },
    'click .add.button' :function(event) {
      var subject = $(event.target).parent().find('.header').text();
      Session.set('subject', subject);
      Meteor.call('addFriend', Session.get('subject'), function (error, result) {
      });
    },
    'click .delete.button' :function(event) {
      var subject = $(event.target).parent().find('.header').text();
      Session.set('subject', subject);
      Meteor.call('deleteFriend', Session.get('subject'), function (error, result) {
        //to do
      });
    }
  });
  Template.body.events({
    "click .send.button": function (event) {
      Meteor.call('addMessage', $('.record>input').val(), Session.get('subject'),
        function (error, result) {
        // Clear form
        $('.record>input').val('');
        if (error && error.error === 'empty-message') {
          $('.record').addClass('error');
          setTimeout(function(){
            $('.record').removeClass('error');
          }, 1000);
          Session.set('errorMessage', "Plaese do no send empty message.");
        } else {
          $('body, html').animate({
            scrollTop: $(document).height(),
          }, 500);
        }
      });
    },
    // Press Enter to send
    "keydown .record>input": function(event) {
      if (event.keyCode === 13) {
        $('.send.button').click();
      }
    },
    "focus .record>input": function(event){
      $('body, html').animate({
        scrollTop: $(document).height(),
      }, 800);
    }
  });

  // Account configuration
  Accounts.ui.config({
    requestPermissions: {
      github: ['user', 'repo']
    },
    requestOfflineToken: {
      google: true
    },
    passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
  });

  Meteor.startup(function () {
    $('.me').click();
  });
}


// Methods insure security
Meteor.methods({
  addMessage: function (text, subject) {
    var time = (new Date()).toJSON().split(/[T.]/).slice(0,2).join(' ');
    if (text.length) {
      Messages.insert({
        from: Meteor.user().username,
        to: subject,
        text: text,
        time: time // current time
      })
    } else {
      throw new Meteor.Error('empty-message', 'The message can not be empty.');
    }
  },
  addFriend: function(subject){
    if (Friends.find({username: Meteor.user().username, friends: subject}).count()){
      throw new Meteor.Error('already-added', 'Can not add one person more than once.');
    } else {
      Friends.update({username: Meteor.user&&Meteor.user().username}, {$push: {friends: subject}});
    }
  },
  deleteFriend: function(subject){
    Friends.update({username: Meteor.user&&Meteor.user().username}, {$pull: {friends: subject}});
  }
});



// Codes run on server 
if (Meteor.isServer) {
  //  Create friends field
  Accounts.onCreateUser(function(options, user) {
  Friends.insert({username: options.username, friends: []});
  if (options.profile)
    user.profile = options.profile;
  return user;
  });
  // Publish data
  Meteor.publish("userData", function () {
    if (this.userId) {
      return Meteor.users.find({},{fields: {'username': 1, 'profile': 1}});
    } else {
      this.ready();
    }
  });

  Meteor.publish('friends', function () {
    return Friends.find({}, {fields: {'username': 1, 'friends': 1}});
  });

  Meteor.publish('messages', function () {
    return Messages.find({}, {});
  });
}
