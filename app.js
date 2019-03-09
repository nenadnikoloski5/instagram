const fs = require('fs');
const express = require('express');
const app = express();
const mysql = require('mysql');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
//validator is for inputs to check if not empty blabla
const bcrypt = require('bcrypt'); // Below Express validator
const saltRounds = 10; // this is with bcrypt too
const session = require('express-session'); // This is for session cookie
const passport = require('passport');
const LocalStrategy = require('passport-local'); // Below const passport
const MySQLStore = require('express-mysql-session')(session); // This is for keeping the session persistant or w/e idk \\ Below session var
const multer = require('multer');
const path = require('path');
const flash = require('connect-flash');

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'password',
	database: 'instagram'
});

connection.connect(function(err) {
	if (err) {
		throw err;
	}
	console.log('connected as ID ' + connection.threadId);
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator()); // THIS IS BELOW APP.USE BODY PARSER
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

let options = {
	// Above the session stuff write || After this, there should be automatically created a table called sessions in your mysql thing, if not, check word doc. So now, whenever a new session is created for a user, there should be something in the session table, refresh the table too
	host: 'localhost',
	user: 'root',
	password: 'password',
	database: 'instagram'
};
let sessionStore = new MySQLStore(options); // This too

app.use(
	session({
		// For Express session ||   BELOW ALL OTHER APP.USE THINGS AND BELOW THE MYSQL CONNECTION LET
		secret: 'sadfrewad', // Here is a random string of chars
		resave: false,
		saveUninitialized: false,
		store: sessionStore // This is the sessionStore variable above from MySQLStore
	})
);
app.use(passport.initialize()); // Below express session app.use
app.use(passport.session()); // This one too

passport.use(
	new LocalStrategy(function(username, password, done) {
		console.log('IN THE SPECIAL LOGIN PLACE CODE');
		// console.log(username);
		// console.log(email) // YOU CAN'T HAVE EXTRA ARGUMENTS HERE
		// console.log(password);

		// if(!password){
		//   window.location.href = "/errorLogin"
		// }

		connection.query(`SELECT id, password FROM instagramusers WHERE username = ?`, [ username ], function(
			error,
			results,
			fields
		) {
			if (error) {
				done(error);
			}
			console.log(` HERE ${results.length === 0}`);
			if (results.length === 0) {
				return done(null, false); // IF IT'S 0, FAIL THE LOGIN HERE
			}

			console.log(results.length);

			const hash = results[0].password.toString();
			console.log(`THIS IS HASH ${hash}`);
			bcrypt.compare(password, hash, function(error, response) {
				if (response) {
					return done(null, { user_id: results[0].id });
				} else {
					console.log('IN HERE');
					return done(null, false); // if you replace the "false" with any string, it will always be true, here it means that if response isn't true, it will always fail, that is good
				}
			});
		});
	})
);
//template start

//html/css text

// template end

app.use(flash());

app.use(function(req, res, next) {
	res.locals.error_msg = req.flash('error_msg');
	next();
});

app.use(
	expressValidator({
		customValidators: {
			isImage: function(value, filename) {
				console.log(typeof path);
				console.log(value);
				let extension = path.extname(filename).toLowerCase();
				switch (extension) {
					case '.jpg':
						return '.jpg';
					case '.jpeg':
						return '.jpeg';
					case '.png':
						return '.png';
					default:
						return false;
				}
			}
		}
	})
);

// ===============================
// GLOBAL VARIABLES
// ===============================

global.username;

// ===============================
// ROUTES
// ===============================

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

const storage = multer.diskStorage({
	destination: './public/images/',
	filename: function(req, file, cb) {
		cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
	}
});

const upload = multer({
	storage: storage,
	limits: { fileSize: 2000000 }, //filesize in bytes
	fileFilter: function(req, file, cb) {
		checkFileType(file, cb);
	}
}).single('image'); // IMAGE IS THE NAME OF THE FILE INPUT

function checkFileType(file, cb) {
	//Allowed ext
	const filetypes = /jpeg|jpg|png/;
	// Check ext
	const extname = filetypes.test(path.extname(file.originalname).toLocaleLowerCase());
	//check mime type
	const mimetype = filetypes.test(file.mimetype);

	if (mimetype && extname) {
		return cb(null, true);
	} else {
		cb('Error: Images Only');
	}
}

app.use(function(req, res, next) {
	if (req.session.passport) {
		console.log('?hmm');
		connection.query(
			`SELECT username FROM instagramusers WHERE id = "${req.session.passport.user.user_id}"`,
			function(error, result) {
				if (error) {
					console.log('bad ' + error);
				} else {
					console.log('here');
					console.log(JSON.stringify(result[0].username));
					global.username = result[0].username;
					next();
				}
			}
		);
	} else {
		global.username = '';
		next();
	}
});

app.get('/setusername', function(req, res) {
	global.username = '';
	res.send('bob');
});

app.get('/', function(req, res) {
	if (req.isAuthenticated()) {
		connection.query(`SELECT * FROM instagramusers`, function(error, resultAllUsers) {
			if (error) {
				console.log(`bad ${error}`);
			} else {
				console.log(`Got all users ${resultAllUsers}`);

				connection.query(`SELECT * FROM user${global.username}FollowAndLikes`, function(
					error,
					resultFollowing
				) {
					if (error) {
						console.log('ERROR' + error);
						console.log(global.username);
					} else {
						let namesOfPeopleImFollowing = [];

						resultFollowing.forEach(function(ele) {
							namesOfPeopleImFollowing.push(ele.toWhat);
						});

						connection.query(`SELECT * FROM instagramusers WHERE username = "${global.username}"`, function(
							error,
							resultInfoOnLoggedInUser
						) {
							if (error) {
								console.log(` ERROR ${error}`);
							} else {
								//
								//  WORK HERE, you need to find the posts of all the people in the var above,
								console.log(namesOfPeopleImFollowing);
								console.log('ABOVE');

								let allPostsWithUsername = [];
								let AllPostsOnly = [];
								let allCommentsOnly = [];
								let allLikesOnly = [];

								const allPromises = [];
								namesOfPeopleImFollowing.forEach((ele) => {
									const myPromise = new Promise((resolve, reject) => {
										connection.query(`SELECT * FROM user${ele}posts`, (error, resultOfThis) => {
											if (error) {
												reject(error);
												console.log(`Error found${error}`);
											} else {
												resolve([ { username: ele }, resultOfThis, { likesFromUsers: [] } ]);
											}
										});
									});
									allPromises.push(myPromise);
								});

								Promise.all(allPromises).then((result) => {
									// your code here
									console.log('below is allPostswithUsername');

									// console.log(JSON.stringify(result))

									// allPostsWithUsername.
									// THE WAY IT WILL BE IS, have the whole Object with the thing above, loop over it, seperate posts likes and comments in seperate vars
									//  when rendering the posts, make a foreach Posts and inside check if there is a comment with the same ID or w/e as the post, if there is, show it

									// OR

									// ele.foreach, if it's a post, send it to a variable, if it's the end of the foreach (or loop) then loop over the comments and posts, and insert the comments which match the ID

									// console.log(allPostsWithUsername)

									// UNCOMMENT THE THINGS BELOW WHEN UR DONE

									let allPostsbro = [];
									let allCommentsBro = [];
									let allLikesBro = [];

									let finalestBoy;

									for (let i = 0; i < result.length; i++) {
										console.log(result[i]);

										result[i][1].forEach(function(ele) {
											if (ele.type == 'post') {
												ele.username = result[i][0].username;
												allPostsbro.push(ele);
												console.log('not sure');
												console.log(allPostsbro);
											} else if (ele.type == 'comment') {
												allCommentsBro.push({ username: ele }, ele);
											} else if (ele.type == 'like') {
												console.log(`Found a LIKE  ${ele}`);
												allLikesBro.push([ ele, result[i][0].username ]);
											}
										});

										console.log(`ALL ${JSON.stringify(allLikesBro)}`);

										// console.log(i)
										// console.log(`whole length ${whole.length}`)
										if (i + 1 == result.length) {
											// console.log(allPostsbro)

											let commentsFinal = [];
											let postsFinal = {};

											for (let b = 0; b < allPostsbro.length; b++) {
												postsFinal[allPostsbro[b].id] = { post: allPostsbro[b], children: [] };
												// console.log(whole[i][0])
												allCommentsBro.forEach(function(comments) {
													if (comments.idOfPost == allPostsbro[b].id) {
														// console.log(comments)
														// console.log(allPostsbro[b])

														postsFinal[comments.idOfPost].children.push(comments);
													}
												});

												console.log(`HERE IS LIKES ${JSON.stringify(allLikesBro)}`);
												// allLikesBro.forEach(function(likes){
												//   console.log(JSON.stringify(likes))
												//   console.log("ABOVE IS LIKES ")

												// })
												// console.log(postsFinal)
												finalestBoy = postsFinal;
											}
										}
									}

									console.log(' ');
									console.log(JSON.stringify(finalestBoy));

									// for (let i = 0; i < allPostsWithUsername.length; i++) {

									//   allPostsWithUsername[i][1].forEach(function (ele) {
									//     if (ele.type == "post") {
									//       allPostsbro.push(ele)
									//     } else if (ele.type == "comment") {
									//       allCommentsBro.push({ username: ele }, ele)
									//     } else {
									//       allLikesBro.push(ele)
									//     }
									//   })
									// }

									// console.log(namesOfPeopleImFollowing)

									// let ere = [];
									//   namesOfPeopleImFollowing.forEach(function(namesOfEm){
									//     connection.query(`SELECT  * FROM instagramusers WHERE username = "${namesOfEm}"`, function(error,resultBoy){

									//       ere.push(resultBoy)
									//     })
									//   })

									const allPromises = [];
									namesOfPeopleImFollowing.forEach((ele) => {
										const myPromise = new Promise((resolve, reject) => {
											connection.query(
												`SELECT  picture FROM instagramusers WHERE username = "${ele}"`,
												(error, resultOfThis) => {
													if (error) {
														reject(error);
														console.log(`Error found${error}`);
													} else {
														resolve([ { username: ele }, resultOfThis ]);
													}
												}
											);
										});
										allPromises.push(myPromise);
									});

									Promise.all(allPromises).then((resultSecond) => {
										console.log(JSON.stringify(resultSecond));

										console.log(` ${!!namesOfPeopleImFollowing}`);

										res.render('homepageLoggedIn', {
											loggedIn: req.isAuthenticated(),
											namesOfPeopleImFollowing: namesOfPeopleImFollowing,
											pictureOfFollowingUsers: resultSecond,
											posts: finalestBoy,
											infoOnLoggedInUser: resultInfoOnLoggedInUser[0],
											usernameOfLoggedIn: global.username,
											allUsers: resultAllUsers
										});
									});
								});
							}
						});
					}
				});
			}
		});
	} else {
		res.render('homepage', {
			loggedIn: req.isAuthenticated(),
			usernameOfLoggedIn: global.username,
			allUsers: false
		});
	}
});

function getGlobalUsername() {
	if (req.isAuthenticated()) {
	}
}

app.get('/logout', (req, res, next) => {
	// This is the special logout thing, which destroys the cookie and mysql sessions
	global.username = '';

	req.logout();
	global.username = '';
	console.log(`global is ${global.username}`);

	req.session.destroy(() => {
		res.clearCookie('connect.sid'), res.redirect('/');
	});
});

app.get('/errorLogin', function(req, res) {
	res.render('errorLoginPage');
});

app.post(
	'/login',
	passport.authenticate('local', {
		// This is a special post route with passport login thing. || Local means what type of passport, there can be a fb login too, local means get data from a DB and compare them to what the user wrote
		successRedirect: '/', // if login is successful redirect to there
		failureRedirect: '/errorLogin' // if login fails,  redirect to there
	}),
	function(req, res) {
		// console.log(`Updating.... ${global.username}`)
	}
);

app.get('/getstate', function(req, res) {
	console.log(`logged in is is ${req.isAuthenticated()}`);
	console.log(` global username is  ${global.username}`);
	// console.log(user.local.username)
	// console.log(req.session.passport.user.user_id)
	res.send('check');
});

app.get('/secret', authenticationMiddleware(), function(req, res) {
	res.send('SECRET PAGE ');
});

app.get('/showglobal', function(req, res) {
	console.log('Global is ' + global.username);
	res.send('showing global');
});

app.get('/loggedin', function(req, res) {
	console.log(`Is Authenticated ${req.isAuthenticated()}`);
	console.log(`Userid ${req.user}`);
	console.log(` ${JSON.stringify(req.user)}`);
	console.log(`typeof ${typeof JSON.stringify(req.user)}`);
	if (JSON.stringify(req.user) == 'undefined' || typeof JSON.stringify(req.user) == 'undefined') {
		console.log(`doesn't exist`);
	} else {
		console.log(`other`);
		console.log(`Json thing ${JSON.stringify(req.user.user_id)}`);
		console.log(`typeof ${typeof req.user.user_id}`);
		connection.query(`SELECT username FROM redditusers WHERE id=${req.user.user_id}`, function(error, result) {
			if (error) {
				console.log(`Error getting username id`);
			} else {
				console.log(`Username is ${JSON.stringify(result[0].username)}`);
				global.username = JSON.stringify(result[0].username);
				console.log(`GLOBAL IS ${global.username}`);
			}
		});
	}
});

// app.post("/signUp", function(req,res){
//   console.log(req.body)

//   connection.query(`INSERT INTO instagramusers(email,fullName,username,password)VALUES(?,?,?,?)`, [req.body.email,req.body.fullName,req.body.username,req.body.password], function(error,result){
//     if(error){
//       console.log(`bad ${error}`)
//     } else{
//       res.redirect("/")
//     }
//   })

// })

app.get('/createPost', authenticationMiddleware(), function(req, res) {
	res.render('makeNewPost');
});

app.post('/createPost', function(req, res) {
	console.log(req.body);

	let picture = req.body.image;
	let text = req.body.text;

	upload(req, res, (err) => {
		if (err) {
			console.log(`file upload bad ${err}`);
		} else {
			console.log(req.body);

			console.log(picture);
			console.log(req.file);

			// req.checkBody('picture', 'Image field cannot be empty').notEmpty();
			if (req.file) {
				req.checkBody('picture', 'Image field must not be empty').isImage(req.file.filename);

				req.getValidationResult().then(function(result) {
					if (result.isEmpty() === false) {
						console.log(`BAD, ERRORS FOUND ${JSON.stringify(result)}`);

						function getValues() {
							for (var key in result) {
								return result[key];
							}
						}
						let errors = [];

						result.array().forEach(function(element) {
							errors.push(element.msg);
						});

						console.log(errors);

						req.flash('error_msg', errors);
						res.redirect('/createPost');
					} else {
						console.log(req.file.filename);
						connection.query(
							`INSERT INTO user${global.username}posts(descriptionOfPost, image,  type) VALUES (?,?,?)`,
							[ req.body.text, 'images/' + req.file.filename, 'post' ],
							function(error, result) {
								if (error) {
									console.log(`bad error 74 ${error}`);
								} else {
									console.log(`success ${JSON.stringify(result)}`);

									connection.query(`INSERT INTO allPosts(text,image,fromUser) VALUES(?,?,?)`, [
										req.body.text,
										'images/' + req.file.filename,
										global.username
									]);
									res.redirect(`/profilePage/${global.username}`);
								}
							}
						);
					}
				});
			} else {
				req.checkBody('testError', 'Image field must not be empty').isEmail();

				req.getValidationResult().then(function(result) {
					if (result.isEmpty() === false) {
						console.log(`BAD, ERRORS FOUND ${JSON.stringify(result)}`);

						//   function getValues(){
						//     for (var key in result) {
						//        return result[key]
						//     }
						// }
						let errors = [ 'Image field must not be empty' ];

						//       result.array().forEach(function(element){
						// errors.push(element.msg)
						//       })

						console.log(errors);

						req.flash('error_msg', errors);
						res.redirect('/createPost');
					}
				});
			}
		}
	});
});

app.get('/hashtag', function(req, res) {
	connection.query(`SELECT * FROM allPosts`, function(error, result) {
		if (error) {
			console.log(`hor 34 ${error}`);
		} else {
			console.log(result[0].text);

			res.send('check');
		}
	});
});

app.get('/postPage/:userName/:id', function(req, res) {
	connection.query(`SELECT * FROM user${req.params.userName}posts WHERE id = "${req.params.id}"`, function(
		error,
		resultPostOnly
	) {
		if (error) {
			console.log(`baaadd 75 ${error}`);
		} else {
			connection.query(
				`SELECT * FROM user${req.params.userName}posts WHERE idOfPost = "${req.params.id}"`,
				function(error, resultPostInfo) {
					if (error) {
						console.log(`baad 92 ${error}`);
					} else {
						connection.query(
							`SELECT * FROM instagramusers WHERE username = "${req.params.userName}"`,
							function(error, resultInfoOnPostPoster) {
								if (error) {
									console.log(`bob  bad ${error}`);
								} else {
									//  console.log(resultInfoOnPostPoster)

									console.log(JSON.stringify(resultPostInfo));

									let firstLike = [];

									resultPostInfo.forEach(function(ele) {
										if (ele.type == 'like') {
											firstLike.push(ele);
										}
									});

									res.render('postPage', {
										postOnlyInfo: resultPostOnly[0],
										nameOfProfile: req.params.userName,
										firstLike: firstLike,
										infoOfPost: resultPostInfo,
										infoOnPostPoster: resultInfoOnPostPoster[0],
										isAuth: req.isAuthenticated(),
										username: global.username
									});
								}
							}
						);
					}
				}
			);
		}
	});
});

app.get('/profilePage/:userName', function(req, res) {
	connection.query(`SELECT * FROM instagramusers WHERE username = "${req.params.userName}"`, function(
		error,
		resultBasicInfo
	) {
		if (error) {
			console.log(`error ${error}`);
		} else {
			connection.query(`SELECT * from user${req.params.userName}posts`, function(error, resultAllPosts) {
				if (error) {
					console.log(`34 error ${error}`);
				} else {
					// console.log("Black monkey "+ JSON.stringify(resultAllPosts))

					let whole = [];
					let final = [];

					let howManyPosts = [];
					let howManyNotPosts = [];

					for (let i = 0; i < resultAllPosts.length; i++) {
						// console.log(resultAllPosts[i])

						if (resultAllPosts[i].type == 'post') {
							howManyPosts.push(resultAllPosts[i]);
						} else {
							howManyNotPosts.push(resultAllPosts[i]);
						}
					}

					for (let i = 0; i <= resultAllPosts.length - 1; i++) {
						// console.log(JSON.stringify(resultAllPosts))
						console.log(`THIS IS I ${i}`);
						if (resultAllPosts[i].type == 'post') {
							console.log(resultAllPosts[i].id);
							// console.log(resultAllPosts[3])
							// console.log(resultAllPosts[i].id)
							console.log(
								`This is howmanyposslnegth ${howManyPosts.length}, this is howmanyNOT ${howManyNotPosts.length}`
							);

							console.log(
								`This is i ${i +
									1} and this is resultAllPosts.length ${resultAllPosts.length} and this is ID ${resultAllPosts[
									i
								].id}`
							);

							console.log(resultAllPosts[i].id + 'MY ');

							if (whole.length < 3) {
								if (resultAllPosts[i].id == 4) {
									console.log(``);
								}
								// console.log(whole)
								whole.push(resultAllPosts[i]);
								// console.log("Pushed one!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
							} else if (whole.length == 3) {
								if (resultAllPosts[i].id == 4) {
								}
								final.push(whole);
								whole = [];
								whole.push(resultAllPosts[i]);
							}

							console.log(`This is I ${i}`);
							console.log(`This is allPostslength ${resultAllPosts.length}`);
							console.log(`This is howmanyNOTposts ${howManyNotPosts.length}`);
							console.log(`This is resultALLPOSTS ${resultAllPosts.length}`);

							if (i + 1 == resultAllPosts.length) {
								final.push(whole);
								whole = [];
								break;
							}
						}
					}

					if (
						!global.username == '' ||
						global.username == ' ' ||
						global.username == undefined ||
						global.username == 'undefined'
					) {
						connection.query(`SELECT * FROM user${global.username}FollowAndLikes`, function(
							error,
							resultFollowing
						) {
							if (error) {
								console.log('BAD' + error);
							} else {
								let namesOfFollowing = [];

								resultFollowing.forEach(function(ele) {
									namesOfFollowing.push(ele.toWhat);
								});
								console.log('');
								console.log('');
								console.log('');
								console.log('');

								console.log(namesOfFollowing);
								console.log('');
								console.log('');
								console.log('');
								console.log('');

								console.log(JSON.stringify(final));

								connection.query(
									`SELECT COUNT(*) AS count FROM user${req.params.userName}FollowAndLikes`,
									function(error, resultOfHowMany) {
										console.log(JSON.stringify(resultOfHowMany));
										res.render('profilePage', {
											basicInfo: resultBasicInfo[0],
											username: global.username,
											allPosts: final,
											usernameOfProfile: req.params.userName,
											ifLoggedIn: req.isAuthenticated(),
											namesOfFollowing: namesOfFollowing,
											howManyPosts: howManyPosts,
											resultOfHowMany: resultOfHowMany
										});
									}
								);
							}
						});
					} else {
						connection.query(
							`SELECT COUNT(*) AS count FROM user${req.params.userName}FollowAndLikes`,
							function(error, resultOfHowMany) {
								console.log(JSON.stringify(resultOfHowMany));
								res.render('profilePage', {
									basicInfo: resultBasicInfo[0],
									username: global.username,
									allPosts: final,
									usernameOfProfile: req.params.userName,
									namesOfFollowing: [],
									ifLoggedIn: req.isAuthenticated(),
									howManyPosts: howManyPosts,
									resultOfHowMany: resultOfHowMany
								});
							}
						);
					}
				}
			});
		}
	});
});

app.get('/globalusername', function(req, res) {
	console.log(global.username);

	res.send('f');
});

app.put('/setFollow', function(req, res) {
	console.log(req.body);

	connection.query(`INSERT INTO user${req.body.currentUsername}FollowAndLikes(type,toWhat) VALUES(?,?)`, [
		'follow',
		req.body.usernameOfPersonImFollowing
	]);

	res.status(200);
});

app.put('/setUnFollow', function(req, res) {
	console.log(req.body);

	connection.query(
		`DELETE FROM user${req.body.currentUsername}FollowAndLikes WHERE toWhat = "${req.body
			.usernameOfPersonImFollowing}"`
	);

	res.status(200);
});

app.put('/setLike', function(req, res) {
	console.log(req.body);

	connection.query(
		`INSERT INTO user${req.body
			.usernameOfPostImLiking}posts(type,likeFromUser,likeAmountFromUser, idOfPost) VALUES(?,?,?,?)`,
		[ 'like', req.body.currentUsername, 1, req.body.idOfClicked ]
	);

	connection.query(`UPDATE user${req.body.usernameOfPostImLiking}posts
    SET likesAmount= likesAmount + 1
    WHERE id="${req.body.idOfClicked}"`);

	res.status(200);
});

app.put('/setUnlike', function(req, res) {
	console.log(req.body);

	connection.query(
		`DELETE FROM user${req.body.usernameOfPostImLiking}posts WHERE idOfPost = "${req.body
			.idOfClicked}" AND type = "like" AND likeFromUser = "${req.body.currentUsername}"`
	);

	connection.query(`UPDATE user${req.body.usernameOfPostImLiking}posts
    SET likesAmount= likesAmount - 1
    WHERE id="${req.body.idOfClicked}"`);

	res.status(200);
});

app.post('/deleteComment/:nameOfProfile/:id', function(req, res) {
	connection.query(`DELETE FROM user${req.params.nameOfProfile}posts WHERE id = "${req.params.id}"`);

	console.log(`nameofprofile ${req.params.nameOfProfile}, id ${req.params.id}`);
	connection.query(
		`UPDATE user${req.params.nameOfProfile}posts
    SET commentLength= commentLength - 1
    WHERE id="${req.body.idOfPost}"`,
		function(error, result) {
			if (error) {
				console.log(`whatt ${error}`);
			} else {
				console.log('WORKS');

				res.redirect('back');
			}
		}
	);
});

app.post('/addComment/:id', function(req, res) {
	console.log(req.body);

	console.log(`commentext`);
	console.log(req.body.commentText);
	console.log(`below`);
	console.log(global.username);
	console.log(`PARAMS.iD`);
	console.log(req.params.id);

	console.log(`global username is ${global.username}`);

	connection.query(
		`INSERT INTO user${req.body.nameOfProfile}posts(type,comment,commentFromUser,idOfPost)VALUES(?,?,?,?)`,
		[ 'comment', req.body.commentText, global.username, req.params.id ],
		function(error, result) {
			if (error) {
				console.log(` bad er ${error}`);
			} else {
				console.log(`success`);

				connection.query(`UPDATE user${req.body.nameOfProfile}posts
        SET commentLength= commentLength + 1
        WHERE id="${req.params.id}"`);

				res.redirect('back');
			}
		}
	);
});

app.post('/addCommentHomePage/:id', function(req, res) {
	console.log(req.body);

	connection.query(
		`INSERT INTO user${req.body.nameOfProfile}posts(type,comment,commentFromUser,idOfPost)VALUES(?,?,?,?)`,
		[ 'comment', req.body.commentText, global.username, req.params.id ],
		function(error, result) {
			if (error) {
				console.log(`Error bad ${error}`);
			} else {
				res.redirect(`/postPage/${req.body.nameOfProfile}/${req.params.id}`);
			}
		}
	);

	// res.send("Gottem!")
});

app.get('/editProfile', authenticationMiddleware(), function(req, res) {
	connection.query(`SELECT * FROM instagramusers WHERE username = "${global.username}"`, function(error, result) {
		if (error) {
			console.log('bad error ' + error);
		} else {
			res.render('editProfile', { currentUsername: global.username, infoOnCurrentUser: result[0] });
		}
	});
});

app.get('/directory', function(req, res) {
	connection.query(`SELECT * FROM instagramusers`, function(error, result) {
		res.render('directory', { everyone: result, username: global.username });
	});
});

app.post('/search', function(req, res) {
	res.redirect(`/search/${req.body.searchQuery}`);
});

app.get('/search/:searchQuery', function(req, res) {
	console.log(req.body);

	connection.query(`SELECT * FROM instagramusers WHERE username LIKE "%${req.params.searchQuery}%"`, function(
		error,
		result
	) {
		if (error) {
			console.log(`addd ${error}`);
		} else {
			console.log(result);
			res.render('searchPage', { people: result });
		}
	});
});

app.post('/editProfile', function(req, res) {
	console.log(req.body);

	upload(req, res, (err) => {
		if (err) {
			console.log(`file upload bad ${err}`);
		} else {
			console.log(req.body);

			console.log(req.file);

			if (req.file) {
				connection.query(
					`UPDATE instagramusers SET picture = "images/${req.file
						.filename}" WHERE username = "${global.username}"`
				);
				connection.query(
					`UPDATE instagramusers SET bio = "${req.body.bio}" WHERE username = "${global.username}"`
				);
				connection.query(
					`UPDATE instagramusers SET profileName = "${req.body.name}" WHERE username = "${global.username}"`
				);
			} else {
				connection.query(
					`UPDATE instagramusers SET bio = "${req.body.bio}" WHERE username = "${global.username}"`
				);
				connection.query(
					`UPDATE instagramusers SET profileName = "${req.body.name}" WHERE username = "${global.username}"`
				);
			}

			res.redirect(`/profilePage/${global.username}`);
		}
	});
});

app.post('/signUp', (req, res, next) => {
	let username = req.body.username,
		fullName = req.body.fullName,
		email = req.body.email,
		password = req.body.password;

	const defaultPicture = 'images/defaultphoto.jpg';

	// Below is for validating inputs
	req.checkBody('username', 'Username field cannot be empty').notEmpty();
	req.checkBody('username', 'Username must be between 4-15 characters long.').len(4, 15);
	req.checkBody('fullName', 'Full Name field cannot be empty').notEmpty();
	req.checkBody('fullName', 'Full Name must be between 4-15 characters long.').len(4, 15);
	req.checkBody('email', 'The email you entered is invalid, please try again.').isEmail();
	req.checkBody('email', 'Email address must be between 6-35 characters long, please try again.').len(6, 35);
	req.checkBody('password', 'Password must be between 8-40 characters long.').len(8, 40);
	req
		.checkBody(
			'password',
			'Password must include one lowercase character, one uppercase character, a number, and a special character.'
		)
		.matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, 'i');

	// Below is for errors
	// To display to the user what error they got, just after this send the data over to the ejs file {errors:errors} , the guy apparently used forEach or w/e idk, check with console log, to show the errors only if there are errors you can do if(errors) blab la in the EJS file,  to show it more properly and css, wrap the thing that shows an error in a div like this: <div class=”errors”> <%= errors %> </div>

	req.getValidationResult().then(function(result) {
		if (result.isEmpty() === false) {
			console.log(`BAD, ERRORS FOUND ${result}`);

			function getValues() {
				for (var key in result) {
					return result[key];
				}
			}
			let errors = [];

			result.array().forEach(function(element) {
				errors.push(element.msg);
			});

			console.log(errors);

			req.flash('error_msg', errors);
			res.redirect('/');
		} else {
			console.log(`GOOD NO ERRORS FOUND`);

			bcrypt.hash(password, saltRounds, function(error, hash) {
				// This hashes the password    you write hash instead of pass in sql INSERT
				connection.query(
					`INSERT INTO instagramusers (username,email,password,fullName,picture) VALUES (?,?,?,?,?)`,
					[ username, email, hash, fullName, defaultPicture ],
					function(error, result) {
						if (error) throw error;
						console.log('WORKED? ' + result);
						connection.query(`SELECT LAST_INSERT_ID() AS user_id`, function(error, results, fields) {
							if (error) throw error;
							else {
								let user_id = results[0];
								console.log(`THIS IS RESULTS THING: ${results}`);
								console.log(`THIS IS RESULTS STRINGIFY ${JSON.stringify(results)}`);
								console.log(`THIS IS USER_ID LET VARIABLE ${user_id}`);
								req.login(user_id, function(err) {
									connection.query(
										`SELECT username FROM instagramusers WHERE id=${results[0].user_id}`,
										function(error, result) {
											if (error) {
												console.log(`Error getting username id`);
											} else {
												console.log(`Username is ${JSON.stringify(result[0].username)}`);
												global.username = JSON.stringify(result[0].username);
												console.log(`GLOBAL IS ${global.username}`);

												//   global.username = JSON.stringify(req.user.user_id)

												connection.query(
													`CREATE TABLE user${username}FollowAndLikes(id INT PRIMARY KEY NOT NULL AUTO_INCREMENT, type VARCHAR(50), toWhat VARCHAR(500))`
												);
												connection.query(
													`CREATE TABLE user${username}posts(id INT PRIMARY KEY AUTO_INCREMENT NOT NULL, descriptionOfPost VARCHAR(500), image VARCHAR(500), fromUser VARCHAR(500), idOfPost INT,  type VARCHAR(500), comment VARCHAR(5000), commentFromUser VARCHAR(500), likesAmount INT DEFAULT 0 , commentLength INT DEFAULT 0, likeFromUser VARCHAR(500), likeAmountFromUser INT) `
												);

												res.redirect('/');
												console.log(
													`IN APP.GET, SHOWING REQ.USER NOW: ${JSON.stringify(req.user)}`
												);
												console.log(
													`IN APP.GET, SHOWING IS AUTHENTICATED NOW: ${req.isAuthenticated()}`
												);
											}
										}
									);
								});
							}
						});
					}
				);
			});
		}
	});
});

passport.serializeUser(function(user_id, done) {
	// This is below the thing which registers a new user
	done(null, user_id);
});
passport.deserializeUser(function(user_id, done) {
	// This too
	done(null, user_id);
});

app.get('/redirected', function(req, res) {
	res.send('REDIRECTED BOY');
});

function authenticationMiddleware() {
	// Below all the app.get/post stuff, what this does, is it checks if a user is autnenticated to enter that route, to use write:  app.get(“/profile”, authenticationMiddleware(), function(req,res){res.render(“blabla”) )};
	return (req, res, next) => {
		console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

		if (req.isAuthenticated()) {
			// THIS IS TO GET THE GLOBAL USERNAME WHEN SOMEONE LOGS IN
			connection.query(
				`SELECT username FROM instagramusers WHERE  id=${req.session.passport.user.user_id}`,
				function(error, result) {
					if (error) {
						console.log('error');
					} else {
						console.log(`result is ${result[0].username}`);
						console.log(`Setting global username`);
						global.username = result[0].username;
					}
				}
			);
		}

		if (req.isAuthenticated()) return next();
		res.redirect('/loginNeeded'); //it can be any page,
	};
}

app.get('*', function(req, res) {
	res.render('errorPage');
});

var port = process.env.PORT || 3001;

app.listen(port, function() {
	console.log('server starting');
});
