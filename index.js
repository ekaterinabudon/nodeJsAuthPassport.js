const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const User = require('./models/User');
const passport = require('passport');
const { Strategy } = require('passport-local');

const Router = express.Router();
const PORT = 4321;
const headers = { 'Content-Type': 'text/html; charset=utf-8' };
const app = express();

const checkAuth = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

passport.use(new Strategy({
    usernameField: 'login',
    passwordField: 'password'
}, async (login, password, done) => {
    let user;
    try {
        user = await User.findOne({ login });
    } catch (err) {
        done(err);
    }
    if (user && user.password == password) {
        return done(null, user);
    } else return done(null, false);
}));
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser((_id, done) => User.findById(_id, (err, user) => done(err, user)));

Router
    .route('/')
    .get((req, res) => res.end('Привет мир!'));

app
    .set('view engine', 'pug')
    .set('x-powered-by', false)
    .use(express.static('.'))
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(session({ secret: 'mysecret', resave: true, saveUninitialized: true }))
    .use(passport.initialize())
    .use(passport.session())
    .use((req, res, next) => {
        res.status(200).set(headers);
        next();
    })
    .use('/', Router)
    .get('/login', (req, res) => res.render('login'))
    .post('/login/check', passport.authenticate('local', { successRedirect: '/profile', failureRedirect: '/login' }))
    .get('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) console.log(err);
        });
        res.send('Вы успешно разлогинились');
    })
    .get('/profile', checkAuth, (req, res) => res.send(req.user))
    .get('/users', async (req, res) => {
        const users = await User.find();
        const answer = users.map(item =>{
            return {login: item.login, password: item.password}
        });
        res.render('users', {users: answer});
    })
    .use((req, res) => res.status(404).end('Страница не найдена!'))
    .use((err, req, res, next) => res.status(500).end('Ошибка: ' + err))
const server = http.Server(app);
server.listen(process.env.PORT || PORT, () => console.log(process.pid));
