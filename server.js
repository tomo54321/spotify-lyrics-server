require("dotenv").config();
const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const axios = require("axios");
const SpotifyStrategy = require('passport-spotify').Strategy;
const isProd = process.env.NODE_ENV === 'production';

let settings = {};
if (isProd) {
  settings = require('./server/config.prod');
} else {
  settings = require('./server/config');
}
const host = process.env.HOST || 'http://localhost:8000';

// Set up Spotify api
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi({
  clientId: settings.spotify.clientId,
  clientSecret: settings.spotify.secret,
  scope: settings.spotify.scopes
});

/**
 * Setup for Login with spotify and parsing the json requests
 */
const server = express();
server.use(cookieParser());
server.use(express.json());
server.use(
  express.urlencoded({
    extended: true
  })
);
server.use(cors({
  origin: [ "http://localhost:3000" ],
  credentials: true
}))

server.use(passport.initialize());
server.use(passport.session());

/**
 * Set up Passport.
 * This is spotify specific. Different services require their own strategies.
 * Go here to find one for the service you want: http://www.passportjs.org/packages/
 */
passport.use(
  new SpotifyStrategy(
    {
      clientID: settings.spotify.clientId,
      clientSecret: settings.spotify.secret,
      callbackURL: settings.login.callback,
      scope: settings.spotify.scopes
    },
    (accessToken, refreshToken, profile, done) => {
      const profileData = {
        accessToken,
        refreshToken,
        profile
      };
      return done(null, profileData);
    }
  )
);

/**
 * serializeUser determines which data of the user object
 * should be stored in the session
 */
passport.serializeUser(function(user, done) {
  // Only store the user id.
  // Whatever is passed as the second
  // param is stored in req.session.passport.user.
  done(null, user);
});

/**
 * The first argument of deserializeUser corresponds to the key of the user
 * object that was given to the done function. Typically this users the user
 * ID to match a record in a User database. User.findById does just this.
 */
passport.deserializeUser(function(user, done) {
  // // Retrieve user by stored user id.
  done(null, user);
});

// Set up routes which are caught from the requests/callback at Login.vue
// and after signing into spotify.
server.get('/api/getLyrics', async (req, res) => {
  const artist = req.query.artist;
  const title = req.query.title;

  console.log(`Lyrics search: ${artist} - ${title}...`);


  try {
    const { data } = await axios.get("https://api.textyl.co/api/lyrics", {
      params: {
        q: `${artist} ${title}`
      }
    });
    res.send(data);
  } catch (e) {
    res.status(400).send({ result: "failed to fetch lyrics" });
  }

  
});

server.get('/api/previous', (req, res) => {
  const cookies = req.cookies;
  const token = cookies['user.token'];
  const refresh = cookies['user.refresh'];

  if (token) {
    spotifyApi.setAccessToken(token);
    spotifyApi.setRefreshToken(refresh);
    spotifyApi
      .skipToPrevious()
      .then(() => {
        console.log('User skipped to previous song');
        res.status(200).send({ result: 'success' });
      })
      .catch(err => {
        console.log('Error skipping to previous track:', err);
        if ([401, 403].includes(err.statusCode)) {
          res.redirect(`${host}/auth/spotify`);
        } else {
          res.status(err.statusCode).send({ error: err.statusCode });
        }
      });
  } else {
    res.status(401).send({ error: 'No access token' });
  }
});

server.get('/api/next', (req, res) => {
  const cookies = req.cookies;
  const token = cookies['user.token'];
  const refresh = cookies['user.refresh'];

  if (token) {
    spotifyApi.setAccessToken(token);
    spotifyApi.setRefreshToken(refresh);
    spotifyApi
      .skipToNext()
      .then(() => {
        console.log('User skipped to next song');
        res.status(200).send({ result: 'success' });
      })
      .catch(err => {
        console.log('Error skipping to next track:', err);
        if ([401, 403].includes(err.statusCode)) {
          res.redirect(`${host}/auth/spotify`);
        } else {
          res.status(err.statusCode).send({ error: err.statusCode });
        }
      });
  } else {
    res.status(401).send({ error: 'No access token' });
  }
});

server.get('/api/pause', (req, res) => {
  const cookies = req.cookies;
  const token = cookies['user.token'];
  const refresh = cookies['user.refresh'];

  if (token) {
    spotifyApi.setAccessToken(token);
    spotifyApi.setRefreshToken(refresh);
    spotifyApi
      .pause()
      .then(() => {
        console.log('User paused');
        res.status(200).send({ result: 'success' });
      })
      .catch(err => {
        console.log('Error pausing:', err);
        if ([401, 403].includes(err.statusCode)) {
          res.redirect(`${host}/auth/spotify`);
        } else {
          res.status(err.statusCode).send({ error: err.statusCode });
        }
      });
  } else {
    res.status(401).send({ error: 'No access token' });
  }
});
server.get('/api/play', (req, res) => {
  const cookies = req.cookies;
  const token = cookies['user.token'];
  const refresh = cookies['user.refresh'];

  if (token) {
    spotifyApi.setAccessToken(token);
    spotifyApi.setRefreshToken(refresh);
    spotifyApi
      .play()
      .then(() => {
        console.log('User played');
        res.status(200).send({ result: 'success' });
      })
      .catch(err => {
        console.log('Error playing:', err);
        if ([401, 403].includes(err.statusCode)) {
          res.redirect(`${host}/auth/spotify`);
        } else {
          res.status(err.statusCode).send({ error: err.statusCode });
        }
      });
  } else {
    res.status(401).send({ error: 'No access token' });
  }
});

server.get('/api/seek', (req, res) => {
  const cookies = req.cookies;
  const seekMs = req.query.position;
  const token = cookies['user.token'];
  const refresh = cookies['user.refresh'];

  if (token) {
    spotifyApi.setAccessToken(token);
    spotifyApi.setRefreshToken(refresh);

    spotifyApi
      .seek(seekMs)
      .then(() => {
        console.log(`User seeked to ${seekMs}ms`);
        res.status(200).send({ result: 'success' });
      })
      .catch(err => {
        console.log('Error seeking:', err);
        if ([401, 403].includes(err.statusCode)) {
          res.redirect(`${host}/auth/spotify`);
        } else {
          res.status(err.statusCode).send({ error: err.statusCode });
        }
      });
  } else {
    res.status(401).send({ error: 'No access token' });
  }
});

server.get('/api/getCurrentSong', (req, res) => {
  const cookies = req.cookies;
  const token = cookies['user.token'];
  const refresh = cookies['user.refresh'];

  if (token) {
    spotifyApi.setAccessToken(token);
    spotifyApi.setRefreshToken(refresh);

    spotifyApi
      .getMyCurrentPlayingTrack({})
      .then(result => {
        res.status(200).send(result.body);
      })
      .catch(err => {
        if (err.statusCode === 401) {
          res.redirect(`${host}/auth/refresh`);
        }
      });
  } else {
    res.status(401).send({ error: 'No access token' });
  }
});

// Authentication / Logout
server.get('/auth/spotify', passport.authenticate('spotify'));
server.get('/auth/refresh', (req, res) => {
  console.log('Refreshing token...');
  const cookies = req.cookies;
  const refresh = cookies['user.refresh'];
  spotifyApi.setRefreshToken(refresh);
  spotifyApi.refreshAccessToken().then(
    data => {
      console.log('Got new token');
      res.cookie('user.token', data.body['access_token'], {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true
      });
      res.redirect(`${host}`);
    },
    err => {
      console.log('Error refreshing token, kicking to /logout', err);
      res.redirect(`${host}/logout`);
    }
  );
});
server.get(
  '/auth/callback',
  passport.authenticate('spotify', {
    failureRedirect: '/'
  }),
  (req, res) => {
    console.log('User logged in...');
    res.cookie('loggedIn', true, {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      domain: "localhost",
      httpOnly: false
    });
    res.cookie('user.token', req.user.accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true
    });
    res.cookie('user.refresh', req.user.refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true
    });
    res.redirect(`${process.env.RETURN_URL}`);
  }
);
server.get('/logout', (req, res) => {
  console.log('Logging out user...');
  req.logout();
  res.clearCookie('loggedIn');
  res.clearCookie('user.token');
  res.clearCookie('user.refresh');
  res.redirect(`${host}`);
});

// Start the server.
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server operating on port ${port}`);
});
