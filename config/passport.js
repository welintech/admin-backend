const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

module.exports = (passport) => {
  const opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
  opts.secretOrKey = 'your_secret_key'; // Replace with your secret key

  passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id); // Use async/await here
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      console.error(err);
      return done(err, false);
    }
  }));
};
