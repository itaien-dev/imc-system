const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const db = require('../../db/connection');

module.exports = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google'));

      // Find by google_id first, then by email
      let user = await db('users').where('google_id', profile.id).first();

      if (!user) {
        user = await db('users').where('email', email).first();
        if (user) {
          // Link google_id to existing account
          await db('users').where('id', user.id).update({ google_id: profile.id });
        }
      }

      if (!user) {
        return done(null, false, { message: 'no_account' });
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  }
);
